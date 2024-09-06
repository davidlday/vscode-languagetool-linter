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

import * as vscode from "vscode";
import * as Constants from "./Constants";
import { ConfigurationManager } from "./ConfigurationManager";
import { IAnnotatedtext } from "annotatedtext";
import { Linter } from "./Linter";
import { FormattingProviderDashes } from "./FormattingProviderDashes";
import { OnTypeFormattingDispatcher } from "./OnTypeFormattingDispatcher";
import { FormattingProviderEllipses } from "./FormattingProviderEllipses";
import { FormattingProviderQuotes } from "./FormattingProviderQuotes";

// Wonder Twin Powers, Activate!
export function activate(context: vscode.ExtensionContext): void {
  const configMan: ConfigurationManager = new ConfigurationManager();
  const linter: Linter = new Linter(configMan);
  const onTypeDispatcher = new OnTypeFormattingDispatcher({
    '"': new FormattingProviderQuotes(configMan),
    "'": new FormattingProviderQuotes(configMan),
    "-": new FormattingProviderDashes(configMan),
    ".": new FormattingProviderEllipses(configMan),
  });
  const onTypeTriggers = onTypeDispatcher.getTriggerCharacters();

  context.subscriptions.push(configMan);

  context.subscriptions.push(Constants.EXTENSION_OUTPUT_CHANNEL);
  Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
    "LanguageTool Linter Activated!",
  );

  // Register onDidChangeconfiguration event
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("languageToolLinter")) {
        configMan.reloadConfiguration(event);
      }
    }),
  );

  // Register onDidOpenTextDocument event - request lint
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      if (configMan.isLintOnOpen() && configMan.isLinterEnabled()) {
        linter.requestLint(document);
      }
    }),
  );

  // Register onDidChangeTextDocument event - request lint with default timeout
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (configMan.isLintOnChange()) {
        if (configMan.isHideDiagnosticsOnChange()) {
          linter.clearDiagnostics(event.document.uri);
        }
        linter.requestLint(event.document);
      }
    }),
  );

  // Register onDidChangeActiveTextEditor event - request lint
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor !== undefined && configMan.isLintOnChange()) {
        linter.requestLint(editor.document);
      }
    }),
  );

  // Register onWillSaveTextDocument event - smart format if enabled
  context.subscriptions.push(
    vscode.workspace.onWillSaveTextDocument((_event) => {
      if (configMan.isSmartFormatOnSave()) {
        vscode.commands.executeCommand(
          "languagetoolLinter.smartFormatDocument",
        );
      }
    }),
  );

  // Register onDidSaveTextDocument event - request immediate lint
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (configMan.isLintOnSave()) {
        linter.requestLint(document);
      }
    }),
  );

  // Register onDidCloseTextDocument event - cancel any pending lint
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
      linter.cancelLint(document);
      linter.clearDiagnostics(document.uri);
    }),
  );

  // Register Code Actions Provider for supported languages
  // Constants.DOCUMENT_SELECTORS.forEach((selector: vscode.DocumentSelector) => {
  configMan
    .getDocumentSelectors()
    .forEach((selector: vscode.DocumentSelector) => {
      context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(selector, linter),
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

  // Register onDidCloseTextDocument event
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) => {
      linter.clearDiagnostics(document.uri);
    }),
  );

  // Register "Ignore Word Globally" TextEditorCommand
  const ignoreWordGlobally = vscode.commands.registerTextEditorCommand(
    "languagetoolLinter.ignoreWordGlobally",
    (editor, _edit, ...args) => {
      configMan.ignoreWordGlobally(args.shift());
      linter.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(ignoreWordGlobally);

  // Register "Ignore Word in Workspace" TextEditorCommand
  const ignoreWordInWorkspace = vscode.commands.registerTextEditorCommand(
    "languagetoolLinter.ignoreWordInWorkspace",
    (editor, _edit, ...args) => {
      configMan.ignoreWordInWorkspace(args.shift());
      linter.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(ignoreWordInWorkspace);

  // Register "Remove Globally Ignored Word" TextEditorCommand
  const removeGloballyIgnoredWord = vscode.commands.registerTextEditorCommand(
    "languagetoolLinter.removeGloballyIgnoredWord",
    (editor, _edit, ...args) => {
      configMan.removeGloballyIgnoredWord(args.shift());
      linter.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(removeGloballyIgnoredWord);

  // Register "Remove Workspace Ignored Word" TextEditorCommand
  const removeWorkspaceIgnoredWord = vscode.commands.registerTextEditorCommand(
    "languagetoolLinter.removeWorkspaceIgnoredWord",
    (editor, _edit, ...args) => {
      configMan.removeWorkspaceIgnoredWord(args.shift());
      linter.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(removeWorkspaceIgnoredWord);

  // Register "Check Current Document" TextEditorCommand
  const checkDocument = vscode.commands.registerTextEditorCommand(
    "languagetoolLinter.checkDocument",
    (editor: vscode.TextEditor, _edit: vscode.TextEditorEdit) => {
      linter.requestLint(editor.document, 0);
    },
  );
  context.subscriptions.push(checkDocument);

  // Register "Check as Plain Text Document" TextEditorCommand
  const checkDocumentAsPlainText = vscode.commands.registerTextEditorCommand(
    "languagetoolLinter.checkDocumentAsPlainText",
    (editor: vscode.TextEditor, _edit: vscode.TextEditorEdit) => {
      linter.requestLintAsPlainText(editor.document, 0);
    },
  );
  context.subscriptions.push(checkDocumentAsPlainText);

  // Register "Clear LanguageTool Diagnostics" TextEditorCommand
  const clearDocumentDiagnostics = vscode.commands.registerTextEditorCommand(
    "languagetoolLinter.clearDocumentDiagnostics",
    (editor: vscode.TextEditor, _edit: vscode.TextEditorEdit) => {
      linter.clearDiagnostics(editor.document.uri);
    },
  );
  context.subscriptions.push(clearDocumentDiagnostics);

  // Register "Smart Format Document" TextEditorCommand
  const smartFormatCommand = vscode.commands.registerTextEditorCommand(
    "languagetoolLinter.smartFormatDocument",
    (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
      if (configMan.isSupportedDocument(editor.document)) {
        // Revert to regex here for cleaner code.
        const text: string = editor.document.getText();
        const lastOffset: number = text.length;
        const annotatedtext: IAnnotatedtext = linter.buildAnnotatedtext(
          editor.document,
        );
        const newText = linter.smartFormatAnnotatedtext(annotatedtext);
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
    if (configMan.getServiceType() === Constants.SERVICE_TYPE_MANAGED) {
      // Add a second to give the service time to start up.
      firstDelay += 1000;
    }
    linter.requestLint(vscode.window.activeTextEditor.document, firstDelay);
  }
}

export function deactivate(): void {}
