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

const config: ConfigurationManager = new ConfigurationManager();
const linter: LinterCommands = new LinterCommands(config);
const onTypeDispatcher = new OnTypeFormattingDispatcher({
  '"': new QuotesFormattingProvider(config),
  "'": new QuotesFormattingProvider(config),
  '-': new DashesFormattingProvider(config),
  '.': new EllipsesFormattingProvider(config)
});
const onTypeTriggers = onTypeDispatcher.getTriggerCharacters();

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
      let i: number = 0;
      let text: string = editor.document.getText();
      let newText: string = "";
      let lastOffset: number = text.length - 1;
      while (i < lastOffset) {
        let ch: string = text.charAt(i);
        let prevCh: string = i > 0 ? text.charAt(i - 1) : " ";
        let nextCh: string = (i < lastOffset - 1) ? text.charAt(i + 1) : " ";
        switch (ch) {
          case QuotesFormattingProvider.doubleQuote:
            if (prevCh === " ") {
              newText += QuotesFormattingProvider.startDoubleQuote;
            } else if (nextCh === " ") {
              newText += QuotesFormattingProvider.endDoubleQuote;
            }
            break;
          case QuotesFormattingProvider.singleQuote:
            if ([" ", QuotesFormattingProvider.doubleQuote, QuotesFormattingProvider.startDoubleQuote].indexOf(prevCh) !== -1) {
              newText += QuotesFormattingProvider.startSingleQuote;
            } else {
              newText += QuotesFormattingProvider.endSingleQuote;
            }
            break;
          case DashesFormattingProvider.hyphen:
            if (prevCh === DashesFormattingProvider.hyphen) {
              if (nextCh === DashesFormattingProvider.hyphen) {
                // Clobber previous character
                newText = newText.substr(0, newText.length - 1) + DashesFormattingProvider.emDash;
              } else {
                // Clobber previous character
                newText = newText.substr(0, newText.length - 1) + DashesFormattingProvider.enDash;
              }
              // Eat next character
              i++;
              break;
            }
          case EllipsesFormattingProvider.period:
            if (prevCh === EllipsesFormattingProvider.period && nextCh === EllipsesFormattingProvider.period) {
              // Clobber previous character
              newText = newText.substr(0, newText.length - 1) + EllipsesFormattingProvider.ellipses;
              // Eat next character
              i++;
              break;
            }
          default:
            newText += ch;
        }
        i++;
      }
      // Replace the whole thing at once so undo applies to all changes.
      edit.replace(
        new vscode.Range(editor.document.positionAt(0), editor.document.positionAt(lastOffset)),
        newText
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


