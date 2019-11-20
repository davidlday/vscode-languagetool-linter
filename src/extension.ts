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
import { ConfigurationManager } from "./common/configuration";
import { LinterCommands } from "./linter/commands";

// Wonder Twin Powers, Activate!
export function activate(context: vscode.ExtensionContext) {

  const config: ConfigurationManager = new ConfigurationManager();
  const linter: LinterCommands = new LinterCommands(config);
  const onTypeDispatcher = new OnTypeFormattingDispatcher({
    '"': new QuotesFormattingProvider(config),
    "'": new QuotesFormattingProvider(config),
    '-': new DashesFormattingProvider(config),
    '.': new EllipsesFormattingProvider(config)
  });
  const onTypeTriggers = onTypeDispatcher.getTriggerCharacters();

  context.subscriptions.push(config);

  context.subscriptions.push(LT_OUTPUT_CHANNEL);
  LT_OUTPUT_CHANNEL.appendLine("LanguageTool Linter Activated!");

  // Register onDidChangeconfiguration event
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration("languageToolLinter")) {
      config.reloadConfiguration(event);
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
    if (config.getLintOnChange()) {
      linter.requestLint(event.document);
      // requestLint(event.document);
    }
  }));

  // Register onDidCloseTextDocument event - cancel any pending lint
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => {
    linter.cancelLint(document);
    linter.deleteFromDiagnosticCollection(document.uri);
  }));

  // Register Code Actions Provider for supported languages
  LT_DOCUMENT_SELECTORS.forEach(function (selector: vscode.DocumentSelector) {
    context.subscriptions.push(
      // vscode.languages.registerCodeActionsProvider(selector, new LTCodeActionProvider(linter))
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
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(event => {
    if (linter.diagnosticMap.has(event.uri.toString())) {
      linter.diagnosticMap.delete(event.uri.toString());
    }
    linter.resetDiagnostics();
  }));

  // Register "Lint Current Document" TextEditorCommand
  let lintCommand = vscode.commands.registerTextEditorCommand("languagetoolLinter.lintCurrentDocument", (editor, edit) => {
    linter.requestLint(editor.document, 0);
  });
  context.subscriptions.push(lintCommand);

  // Register "Auto Format Document" TextEditorCommand
  let autoFormatCommand = vscode.commands.registerTextEditorCommand("languagetoolLinter.autoFormatDocument", (editor, edit) => {
    if (config.isSupportedDocument(editor.document)) {
      // Revert to regex here for cleaner code.
      let text: string = editor.document.getText();
      let lastOffset: number = text.length - 1;
      text = text.replace(/"(?=[\w'‘])/g, QuotesFormattingProvider.startDoubleQuote)
        .replace(/'(?=[\w"“])/g, QuotesFormattingProvider.startSingleQuote)
        .replace(/([\w.!?%,'’])"/g, "$1" + QuotesFormattingProvider.endDoubleQuote)
        .replace(/([\w.!?%,"”])'/g, "$1" + QuotesFormattingProvider.endSingleQuote)
        .replace(/([\w])---(?=[\w])/g, "$1" + DashesFormattingProvider.emDash)
        .replace(/([\w])--(?=[\w])/g, "$1" + DashesFormattingProvider.enDash)
        .replace(/\.\.\./g, EllipsesFormattingProvider.ellipses);
      // Replace the whole thing at once so undo applies to all changes.
      edit.replace(
        new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(lastOffset)),
        text
      );
    }
  });
  context.subscriptions.push(autoFormatCommand);

  // Lint Active Text Editor on Activate
  if (vscode.window.activeTextEditor) {
    let firstDelay = LT_TIMEOUT_MS;
    if (config.getServiceType() === LT_SERVICE_MANAGED) {
      // Add a second to give the service time to start up.
      firstDelay += 1000;
    }
    linter.requestLint(vscode.window.activeTextEditor.document, firstDelay);
  }
}

export function deactivate() { }


