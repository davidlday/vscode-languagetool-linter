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
import { LT_DOCUMENT_SELECTORS, LT_OUTPUT_CHANNEL, LT_DOCUMENT_LANGUAGE_IDS, LT_CHECK_PATH, LT_PUBLIC_URL, LT_SERVICE_PARAMETERS, LT_TIMEOUT_MS, LT_DISPLAY_NAME, LT_DIAGNOSTIC_SOURCE, LT_SERVICE_MANAGED } from './common/constants';
import { ConfigurationManager } from "./common/configuration";
import { ILanguageToolResponse, ILanguageToolMatch, ILanguageToolReplacement } from './linter/interfaces';
import { LinterCommands } from "./linter/commands";

const config: ConfigurationManager = new ConfigurationManager();
const linter: LinterCommands = new LinterCommands(config);

// CodeActionProvider
class LTCodeActionProvider implements vscode.CodeActionProvider {
  private readonly linter: LinterCommands;

  constructor(linter: LinterCommands) {
    this.linter = linter;
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    let documentUri: string = document.uri.toString();
    // let diagnosticMap: Map<string, vscode.Diagnostic[]> = this.linter.getDiagnosticMap();
    let codeActionMap: Map<string, vscode.CodeAction[]> = this.linter.getCodeActionMap();
    if (codeActionMap.has(documentUri) && codeActionMap.get(documentUri)) {
      let documentCodeActions: vscode.CodeAction[] = codeActionMap.get(documentUri) || [];
      let actions: vscode.CodeAction[] = [];
      // Code Actions get created in suggest()
      documentCodeActions.forEach(function (action) {
        if (action.diagnostics && context.diagnostics) {
          let actionDiagnostic: vscode.Diagnostic = action.diagnostics[0];
          if (range.contains(actionDiagnostic.range)) {
            actions.push(action);
          }
        }
      });
      return actions;
    } else {
      return [];
    }
  }
}

// Wonder Twin Powers, Activate!
export function activate(context: vscode.ExtensionContext) {

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
      vscode.languages.registerCodeActionsProvider(selector, new LTCodeActionProvider(linter))
    );

    const onTypeDispatcher = new OnTypeFormattingDispatcher({
      '"': new QuotesFormattingProvider(config),
      "'": new QuotesFormattingProvider(config),
      '-': new DashesFormattingProvider(config),
      '.': new EllipsesFormattingProvider(config)
    });
    const onTypeTriggers = onTypeDispatcher.getTriggerCharacters();
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


