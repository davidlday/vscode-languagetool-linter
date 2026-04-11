/****
 *    Copyright 2019 David L. Day
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { IAnnotatedtext } from "annotatedtext";
import * as vscode from "vscode";
import { ConfigurationManager } from "./ConfigurationManager";
import * as Constants from "./Constants";
import { FormattingProviderDashes } from "./FormattingProviderDashes";
import { FormattingProviderEllipses } from "./FormattingProviderEllipses";
import { FormattingProviderQuotes } from "./FormattingProviderQuotes";
import { Linter } from "./Linter";
import { OnTypeFormattingDispatcher } from "./OnTypeFormattingDispatcher";

// Extension state for cleanup during deactivation
let configManager: ConfigurationManager | undefined;
let linter: Linter | undefined;
let outputChannel: vscode.OutputChannel | undefined;

// Wonder Twin Powers, Activate!
export function activate(context: vscode.ExtensionContext): void {
  // Create output channel in activation (not as module-load side effect)
  outputChannel = vscode.window.createOutputChannel("LanguageTool Linter");
  context.subscriptions.push(outputChannel);

  configManager = new ConfigurationManager();
  linter = new Linter(configManager, outputChannel);

  const onTypeDispatcher = new OnTypeFormattingDispatcher({
    '"': new FormattingProviderQuotes(configManager),
    "'": new FormattingProviderQuotes(configManager),
    "-": new FormattingProviderDashes(configManager),
    ".": new FormattingProviderEllipses(configManager),
  });
  const onTypeTriggers = onTypeDispatcher.getTriggerCharacters();

  context.subscriptions.push(configManager);
  context.subscriptions.push(linter.diagnosticCollection);

  outputChannel.appendLine("LanguageTool Linter Activated!");

  // Register onDidChangeConfiguration event
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("languageToolLinter")) {
        configManager!.reloadConfiguration(event);
      }
    }),
  );

  // Register onDidOpenTextDocument event - request lint
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      linter!.documentChanged(document, configManager!.isLintOnOpen());
    }),
  );

  // Register onDidChangeTextDocument event - request lint with default timeout
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      linter!.documentChanged(event.document, configManager!.isLintOnChange());
    }),
  );

  // Register onDidChangeActiveTextEditor event - request lint
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor !== undefined) {
        linter!.editorChanged(
          vscode.window.activeTextEditor,
          configManager!.isLintOnChange(),
        );
      }
    }),
  );

  // Register onDidSaveTextDocument event - request immediate lint
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      linter!.documentChanged(document, configManager!.isLintOnSave());
    }),
  );

  // Register onWillSaveTextDocument event - smart format if enabled
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((_event) => {
      if (configManager!.isSmartFormatOnSave()) {
        vscode.commands.executeCommand(Constants.COMMAND_SMART_FORMAT);
      }
    }),
  );

  // Register onDidCloseTextDocument event - cancel any pending lint and cleanup diagnostics
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
      linter!.cancelLint(document);
      linter!.clearDiagnostics(document.uri);
    }),
  );

  // Register Code Actions Provider for supported languages
  configManager
    .getDocumentSelectors()
    .forEach((selector: vscode.DocumentSelector) => {
      context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(selector, linter!),
      );

      if (onTypeTriggers) {
        context.subscriptions.push(
          vscode.languages.registerOnTypeFormattingEditProvider(
            selector,
            onTypeDispatcher,
            onTypeTriggers.first,
            ...onTypeTriggers.more,
          ),
        );
      }
    });

  // Register "Toggle Linting" Command
  const toggleLinting = vscode.commands.registerCommand(
    Constants.COMMAND_TOGGLE_LINTING,
    () => {
      linter!.toggleSuspendLinting();
    },
  );
  context.subscriptions.push(toggleLinting);

  // Register "Disable Rule" TextEditorCommand
  const disableRule = vscode.commands.registerTextEditorCommand(
    Constants.COMMAND_DISABLE_RULE,
    (editor, _edit, ...args) => {
      configManager!.disableRule(args.shift(), args.shift());
      linter!.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(disableRule);

  // Register "Disable Category" TextEditorCommand
  const disableCategory = vscode.commands.registerTextEditorCommand(
    Constants.COMMAND_DISABLE_CATEGORY,
    (editor, _edit, ...args) => {
      configManager!.disableCategory(args.shift(), args.shift());
      linter!.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(disableCategory);

  // Register "Ignore Word Globally" TextEditorCommand
  const ignoreWordGlobally = vscode.commands.registerTextEditorCommand(
    Constants.COMMAND_IGNORE_USR_WORD,
    (editor, _edit, ...args) => {
      configManager!.ignoreWordGlobally(args.shift());
      linter!.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(ignoreWordGlobally);

  // Register "Ignore Word in Workspace" TextEditorCommand
  const ignoreWordInWorkspace = vscode.commands.registerTextEditorCommand(
    Constants.COMMAND_IGNORE_WS_WORD,
    (editor, _edit, ...args) => {
      configManager!.ignoreWordInWorkspace(args.shift());
      linter!.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(ignoreWordInWorkspace);

  // Register "Remove Globally Ignored Word" TextEditorCommand
  const removeGloballyIgnoredWord = vscode.commands.registerTextEditorCommand(
    Constants.COMMAND_REMOVE_USR_IGNORED_WORD,
    (editor, _edit, ...args) => {
      configManager!.removeGloballyIgnoredWord(args.shift());
      linter!.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(removeGloballyIgnoredWord);

  // Register "Remove Workspace Ignored Word" TextEditorCommand
  const removeWorkspaceIgnoredWord = vscode.commands.registerTextEditorCommand(
    Constants.COMMAND_REMOVE_WS_IGNORED_WORD,
    (editor, _edit, ...args) => {
      configManager!.removeWorkspaceIgnoredWord(args.shift());
      linter!.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(removeWorkspaceIgnoredWord);

  // Register "Check Current Document" TextEditorCommand
  const checkDocument = vscode.commands.registerTextEditorCommand(
    Constants.COMMAND_CHECK_DOCUMENT,
    (editor: vscode.TextEditor, _edit: vscode.TextEditorEdit) => {
      linter!.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(checkDocument);

  // Register "Check as Plain Text Document" TextEditorCommand
  const checkDocumentAsPlainText = vscode.commands.registerTextEditorCommand(
    Constants.COMMAND_CHECK_DOCUMENT_AS_PLAINTEXT,
    (editor: vscode.TextEditor, _edit: vscode.TextEditorEdit) => {
      linter!.requestLintAsPlainText(editor.document, 0);
    },
  );
  context.subscriptions.push(checkDocumentAsPlainText);

  // Register "Clear LanguageTool Diagnostics" TextEditorCommand
  const clearDocumentDiagnostics = vscode.commands.registerTextEditorCommand(
    Constants.COMMAND_CLEAR_DIAGNOSTICS,
    (editor: vscode.TextEditor, _edit: vscode.TextEditorEdit) => {
      linter!.clearDiagnostics(editor.document.uri);
    },
  );
  context.subscriptions.push(clearDocumentDiagnostics);

  // Register "Smart Format Document" TextEditorCommand
  const smartFormatCommand = vscode.commands.registerTextEditorCommand(
    Constants.COMMAND_SMART_FORMAT,
    (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
      if (configManager!.isLanguageSupportedAndEnabled(editor.document)) {
        // Revert to regex here for cleaner code.
        const text: string = editor.document.getText();
        const lastOffset: number = text.length;
        const annotatedtext: IAnnotatedtext = linter!.buildAnnotatedtext(
          editor.document,
        );
        const newText = linter!.smartFormatAnnotatedtext(annotatedtext);
        // Replace the whole thing at once so undo applies to all changes.
        edit.replace(
          new vscode.Range(
            editor.document.positionAt(0),
            editor.document.positionAt(lastOffset),
          ),
          newText,
        );
      }
    },
  );
  context.subscriptions.push(smartFormatCommand);

  // Lint Active Text Editor on Activate
  if (vscode.window.activeTextEditor) {
    let firstDelay = Constants.EXTENSION_TIMEOUT_MS;
    if (configManager.getServiceType() === Constants.SERVICE_TYPE_MANAGED) {
      // Add a second to give the service time to start up.
      firstDelay += 1000;
    }
    linter.requestLint(vscode.window.activeTextEditor.document, firstDelay);
  }
}

export function deactivate(): void {
  // Cleanup resources on deactivation
  if (linter) {
    // Clear all pending timeouts
    linter.clearAllPendingTimeouts();
    // Clear all diagnostics
    linter.clearAllDiagnostics();
  }

  if (configManager) {
    // Stop managed service if running
    configManager.stopManagedService();
  }

  // Output channel and other subscriptions are automatically disposed via
  // context.subscriptions in activate()
}
