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
import { DashesFormattingProvider } from './typeFormatters/dashesFormatter';
import { EllipsesFormattingProvider } from "./typeFormatters/ellipsesFormatter";
import { OnTypeFormattingDispatcher } from './typeFormatters/dispatcher';
import { QuotesFormattingProvider } from './typeFormatters/quotesFormatter';
import { LT_DOCUMENT_SELECTORS, LT_OUTPUT_CHANNEL, LT_TIMEOUT_MS, LT_SERVICE_MANAGED } from './common/constants';
import { ConfigurationManager } from "./common/configuration-manager";
import { Linter } from "./linter/linter";
import { IAnnotatedtext } from "./linter/interfaces";

// Wonder Twin Powers, Activate!
export function activate(context: vscode.ExtensionContext) {

  const configMan: ConfigurationManager = new ConfigurationManager();
  const linter: Linter = new Linter(configMan);
  const onTypeDispatcher = new OnTypeFormattingDispatcher({
    '"': new QuotesFormattingProvider(configMan),
    "'": new QuotesFormattingProvider(configMan),
    '-': new DashesFormattingProvider(configMan),
    '.': new EllipsesFormattingProvider(configMan)
  });
  const onTypeTriggers = onTypeDispatcher.getTriggerCharacters();

  context.subscriptions.push(configMan);

  context.subscriptions.push(LT_OUTPUT_CHANNEL);
  LT_OUTPUT_CHANNEL.appendLine("LanguageTool Linter Activated!");

  // Register onDidChangeconfiguration event
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration("languageToolLinter")) {
      configMan.reloadConfiguration(event);
    }
  }));

  // Register onDidOpenTextDocument event - request lint
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
    linter.requestLint(document);
  }));

  // Register onDidChangeActiveTextEditor event - request lint
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      linter.requestLint(editor.document);
    }
  }));

  // Register onDidSaveTextDocument event - request immediate lint
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
    linter.requestLint(document);
  }));

  // Register onDidChangeTextDocument event - request lint with default timeout
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
    // if (ltConfig.get("lintOnChange")) {
    if (configMan.getLintOnChange()) {
      linter.requestLint(event.document);
      // requestLint(event.document);
    }
  }));

  // Register onDidCloseTextDocument event - cancel any pending lint
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument( (document: vscode.TextDocument) => {
    linter.cancelLint(document);
    linter.deleteFromDiagnosticCollection(document.uri);
  }));

  // Register Code Actions Provider for supported languages
  LT_DOCUMENT_SELECTORS.forEach( (selector: vscode.DocumentSelector) => {
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(selector, linter)
    );

    if (onTypeTriggers) {
      context.subscriptions.push(
        vscode.languages.registerOnTypeFormattingEditProvider(selector,
          onTypeDispatcher,
          onTypeTriggers.first,
          ...onTypeTriggers.more)
      );
    }
  });

  // Register onDidCloseTextDocument event
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument( (document: vscode.TextDocument) => {
    if (linter.diagnosticMap.has(document.uri.toString())) {
      linter.diagnosticMap.delete(document.uri.toString());
    }
    linter.resetDiagnostics();
  }));

  // Register "Ignore Word Globally" TextEditorCommand
  let ignoreWordGlobally = vscode.commands.registerTextEditorCommand("languagetoolLinter.ignoreWordGlobally", (editor, edit, ...args) => {
    configMan.ignoreWordGlobally(args[0]);
    linter.requestLint(editor.document, 0);
  });
  context.subscriptions.push(ignoreWordGlobally);

  // Register "Ignore Word in Workspace" TextEditorCommand
  let ignoreWordInWorkspace = vscode.commands.registerTextEditorCommand("languagetoolLinter.ignoreWordInWorkspace", (editor, edit, ...args) => {
    configMan.ignoreWordInWorkspace(args[0]);
    linter.requestLint(editor.document, 0);
  });
  context.subscriptions.push(ignoreWordInWorkspace);

  // Register "Remove Globally Ignored Word" TextEditorCommand
  let removeGloballyIgnoredWord = vscode.commands.registerTextEditorCommand("languagetoolLinter.removeGloballyIgnoredWord", (editor, edit, ...args) => {
    configMan.removeGloballyIgnoredWord(args[0]);
    linter.requestLint(editor.document, 0);
  });
  context.subscriptions.push(removeGloballyIgnoredWord);

  // Register "Remove Workspace Ignored Word" TextEditorCommand
  let removeWorkspaceIgnoredWord = vscode.commands.registerTextEditorCommand("languagetoolLinter.removeWorkspaceIgnoredWord", (editor, edit, ...args) => {
    configMan.removeWorkspaceIgnoredWord(args[0]);
    linter.requestLint(editor.document, 0);
  });
  context.subscriptions.push(removeWorkspaceIgnoredWord);

  // Register "Lint Current Document" TextEditorCommand
  let lintCommand = vscode.commands.registerTextEditorCommand("languagetoolLinter.lintCurrentDocument", (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
    linter.requestLint(editor.document, 0);
  });
  context.subscriptions.push(lintCommand);

  // Register "Auto Format Document" TextEditorCommand
  let smartFormatCommand = vscode.commands.registerTextEditorCommand("languagetoolLinter.smartFormatDocument", (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) => {
    if (configMan.isSupportedDocument(editor.document)) {
      // Revert to regex here for cleaner code.
      let text: string = editor.document.getText();
      let lastOffset: number = text.length - 1;
      let annotatedtext: IAnnotatedtext = linter.buildAnnotatedtext(editor.document);
      let newText = linter.smartFormatAnnotatedtext(annotatedtext);
      // Replace the whole thing at once so undo applies to all changes.
      edit.replace(
        new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(lastOffset)),
        newText
      );
    }
  });
  context.subscriptions.push(smartFormatCommand);

  // Lint Active Text Editor on Activate
  if (vscode.window.activeTextEditor) {
    let firstDelay = LT_TIMEOUT_MS;
    if (configMan.getServiceType() === LT_SERVICE_MANAGED) {
      // Add a second to give the service time to start up.
      firstDelay += 1000;
    }
    linter.requestLint(vscode.window.activeTextEditor.document, firstDelay);
  }
}

export function deactivate() { }


