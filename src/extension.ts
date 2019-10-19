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

import * as rehypeBuilder from "annotatedtext-rehype";
import * as remarkBuilder from "annotatedtext-remark";
import * as execa from "execa";
import * as portfinder from 'portfinder';
import * as rp from "request-promise-native";
import * as vscode from "vscode";
import { QuotesFormattingProvider } from './typeFormatters/quotesFormatter';
import { DashesFormattingProvider } from './typeFormatters/dashesFormatter';
import { OnTypeFormattingDispatcher } from './typeFormatters/dispatcher';
import { LT_DOCUMENT_SELECTORS } from './common/constants';

// Constants
// TODO: Move these to ./common/constants.ts
const LT_DOCUMENT_LANGUAGE_IDS: string[] = ["markdown", "html", "plaintext"];
const LT_DOCUMENT_SCHEMES: string[] = ["file", "untitled"];
const LT_PUBLIC_URL: string = "https://languagetool.org/api";
const LT_CHECK_PATH: string = "/v2/check";
const LT_SERVICE_PARAMETERS: string[] = [
  "language",
  "motherTongue",
  "preferredVariants",
  "disabledCategories",
  "disabledRules",
  "disabledCategories"
];
const LT_DIAGNOSTIC_SOURCE: string = "LanguageTool";
const LT_TIMEOUT_MS: number = 500;
const LT_DISPLAY_NAME: string = "languagetool-linter";

// Variables
let diagnosticCollection: vscode.DiagnosticCollection;
let diagnosticMap: Map<string, vscode.Diagnostic[]>;
let codeActionMap: Map<string, vscode.CodeAction[]>;
let timeoutMap: Map<string, NodeJS.Timeout>;
let outputChannel: vscode.OutputChannel;
let ltConfig: vscode.WorkspaceConfiguration;
let ltServerProcess: execa.ExecaChildProcess | undefined;
let ltUrl: string | undefined;

// Interface - LanguageTool Response
interface LTResponse {
  software: {
    name: string;
    version: string;
    buildDate: string;
    apiVersion: number;
    premium: boolean;
    premiumHint: string;
    status: string;
  };
  warnings: {
    incompleteResults: boolean;
  };
  language: {
    name: string;
    code: string;
    detectedLanguage: {
      name: string;
      code: string;
      confidence: number;
    };
  };
  matches: LTMatch[];
}

// Interface - LangaugeTool Match
interface LTMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: LTReplacement[];
  context: {
    text: string;
    offset: number;
    length: number;
  };
  sentence: string;
  type: {
    typeName: string;
  };
  rule: {
    id: string;
    description: string;
    issueType: string;
    category: {
      id: string;
      name: string;
    };
  };
  ignoreForIncompleteSentence: boolean;
  contextForSureMatch: number;
}

// Interface LanguageTool Replacement
interface LTReplacement {
  value: string;
  shortDescription: string;
}

// CodeActionProvider
class LTCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    let documentUri: string = document.uri.toString();
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

// Set up whenever service type changes
function setServiceType(serviceType: string): string {
  let newUrl: string = "";
  switch (serviceType) {
    case "external": {
      let ltConfigUrl: string = ltConfig.get("external.url") as string;
      newUrl = ltConfigUrl + LT_CHECK_PATH;
      stopManagedService();
      outputChannel.appendLine("Now using " + serviceType + " service URL: " + newUrl);
      break;
    }
    case "managed": {
      newUrl = startManagedService();
      break;
    }
    case "public": {
      newUrl = LT_PUBLIC_URL + LT_CHECK_PATH;
      stopManagedService();
      outputChannel.appendLine("Now using " + serviceType + " service URL: " + newUrl);
      break;
    }
  }
  return newUrl;
}

// Start a managed service using a random, available port
// Service will be stopped and restarted every time.
function startManagedService() {
  let jarFile: string = ltConfig.get("managed.jarFile") as string;
  let newUrl: string = "";
  stopManagedService();
  portfinder.getPort({host: "127.0.0.1"}, function (error, port) {
    if (error) {
      outputChannel.appendLine("Error getting open port: " + error.message);
      outputChannel.show(true);
    } else {
      ltUrl = "http://localhost:" + port.toString() + LT_CHECK_PATH;
      let args: string[] = [
        "-cp",
        jarFile,
        "org.languagetool.server.HTTPServer",
        "--port",
        port.toString()
      ];
      outputChannel.appendLine("Starting managed service.");
      (ltServerProcess = execa("java", args)).catch(function (error) {
        if (error.isCanceled) {
          outputChannel.appendLine("Managed service process stopped.");
        } else if (error.failed) {
          outputChannel.appendLine("Managed service command failed: " + error.command);
          outputChannel.appendLine("Error Message: " + error.message);
          outputChannel.show(true);
        }
      });
      ltServerProcess.stderr.addListener("data", function (data) {
        outputChannel.appendLine(data);
        outputChannel.show(true);
      });
      ltServerProcess.stdout.addListener("data", function (data) {
        outputChannel.appendLine(data);
      });
    }
  });
  return newUrl;
}

// Stop the managed service
function stopManagedService() {
  if (ltServerProcess) {
    outputChannel.appendLine("Closing managed service server.");
    ltServerProcess.cancel();
    ltServerProcess = undefined;
  }
}

// Is Launguage ID Supported?
function isSupportedDocument(document: vscode.TextDocument): boolean {
  if (document.uri.scheme === "file") {
    return (LT_DOCUMENT_LANGUAGE_IDS.indexOf(document.languageId) > -1);
  }
  return false;
}

// Set ltPostDataTemplate from Configuration
function getPostDataTemplate(): any {
  let ltPostDataTemplate: any = {};
  LT_SERVICE_PARAMETERS.forEach(function (ltKey) {
    let configKey = "languageTool." + ltKey;
    let value = ltConfig.get(configKey);
    if (value) {
      ltPostDataTemplate[ltKey] = value;
    }
  });
  return ltPostDataTemplate;
}

// Load Configuration
function loadConfiguration(event?: vscode.ConfigurationChangeEvent): void {
  ltConfig = vscode.workspace.getConfiguration("languageToolLinter");
  let serviceType: string = ltConfig.get("serviceType") as string;
  if (event && event.affectsConfiguration("languageToolLinter.serviceType")) {
    outputChannel.appendLine("Service configuration changed.");
    // Did the jarFile also change? Then the server process also needs restarted
    if (serviceType === "managed" && event.affectsConfiguration("languageToolLinter.managed.jarFile")) {
      startManagedService();
    } else {
      // Reloading due to configuration change.
      ltUrl = setServiceType(serviceType);
    }
  } else {
    // Load the whole thing.
    outputChannel.appendLine("Loading initial configuration.");
    ltUrl = setServiceType(serviceType);
  }
}

// Cancel lint
function cancelLint(document: vscode.TextDocument): void {
  let uriString = document.uri.toString();
  if (timeoutMap.has(uriString)) {
    let timeout = timeoutMap.get(uriString);
    if (timeout) {
      clearTimeout(timeout);
      timeoutMap.delete(uriString);
    }
  }
}

// Request lint
function requestLint(document: vscode.TextDocument, timeoutDuration: number = LT_TIMEOUT_MS): void {
  if (isSupportedDocument(document)) {
    cancelLint(document);
    let uriString = document.uri.toString();
    let timeout = setTimeout(() => {
      lintDocument(document);
      cancelLint(document);
    }, timeoutDuration);
    timeoutMap.set(uriString, timeout);
  }
}

// Perform Lint on Document
function lintDocument(document: vscode.TextDocument): void {
  if (isSupportedDocument(document)) {
    if (document.languageId === "markdown") {
      let annotatedMarkdown: string = JSON.stringify(remarkBuilder.build(document.getText()));
      lintAnnotatedText(document, annotatedMarkdown);
    } else if (document.languageId === "html") {
      let annotatedHTML: string = JSON.stringify(rehypeBuilder.build(document.getText()));
      lintAnnotatedText(document, annotatedHTML);
    } else {
      lintPlaintext(document);
    }
  }
}

// Reset the Diagnostic Collection
function resetDiagnostics(): void {
  diagnosticCollection.clear();
  diagnosticMap.forEach((diags, file) => {
    diagnosticCollection.set(vscode.Uri.parse(file), diags);
  });
}

// Convert LanguageTool Suggestions into QuickFix CodeActions
function suggest(document: vscode.TextDocument, response: LTResponse): void {
  let matches = response.matches;
  let diagnostics: vscode.Diagnostic[] = [];
  let actions: vscode.CodeAction[] = [];
  matches.forEach(function (match: LTMatch) {
    let start: vscode.Position = document.positionAt(match.offset);
    let end: vscode.Position = document.positionAt(match.offset + match.length);
    let diagnosticRange: vscode.Range = new vscode.Range(start, end);
    let diagnosticMessage: string = match.rule.id + ": " + match.message;
    let diagnostic: vscode.Diagnostic = new vscode.Diagnostic(diagnosticRange, diagnosticMessage, vscode.DiagnosticSeverity.Warning);
    match.replacements.forEach(function (replacement: LTReplacement) {
      let actionTitle: string = "'" + replacement.value + "'";
      let action: vscode.CodeAction = new vscode.CodeAction(actionTitle, vscode.CodeActionKind.QuickFix);
      let location: vscode.Location = new vscode.Location(document.uri, diagnosticRange);
      let edit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
      edit.replace(document.uri, location.range, replacement.value);
      action.edit = edit;
      action.diagnostics = [];
      action.diagnostics.push(diagnostic);
      actions.push(action);
    });
    diagnostic.source = LT_DIAGNOSTIC_SOURCE;
    diagnostics.push(diagnostic);
  });
  codeActionMap.set(document.uri.toString(), actions);
  diagnosticMap.set(document.uri.toString(), diagnostics);
  resetDiagnostics();
}

// Call to LanguageTool Service
function callLanguageTool(document: vscode.TextDocument, ltPostDataDict: any): void {
  if (ltUrl) {
    let options: object = {
      "method": "POST",
      "form": ltPostDataDict,
      "json": true
    };
    rp.post(ltUrl, options)
      .then(function (data) {
        suggest(document, data);
      })
      .catch(function (err) {
        outputChannel.appendLine("Error connecting to " + ltUrl);
        outputChannel.appendLine(err);
        outputChannel.show(true);
      });
  } else {
    outputChannel.appendLine("No LanguageTool URL provided. Please check your settings and try again.");
    outputChannel.show(true);
  }
}

// Lint Plain Text Document
function lintPlaintext(document: vscode.TextDocument): void {
  if (isSupportedDocument(document)) {
    let ltPostDataDict: any = getPostDataTemplate();
    ltPostDataDict["text"] = document.getText();
    callLanguageTool(document, ltPostDataDict);
  }
}

// Lint Annotated Text
function lintAnnotatedText(document: vscode.TextDocument, annotatedText: string): void {
  if (isSupportedDocument(document)) {
    let ltPostDataDict: any = getPostDataTemplate();
    ltPostDataDict["data"] = annotatedText;
    callLanguageTool(document, ltPostDataDict);
  }
}

// Wonder Twin Powers, Activate!
export function activate(context: vscode.ExtensionContext) {

  diagnosticCollection = vscode.languages.createDiagnosticCollection(LT_DISPLAY_NAME);
  context.subscriptions.push(diagnosticCollection);

  outputChannel = vscode.window.createOutputChannel("LanguageTool Linter");
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine("LanguageTool Linter Activated!");

  diagnosticMap = new Map();
  codeActionMap = new Map();
  timeoutMap = new Map();

  loadConfiguration();

  // Register onDidChangeconfiguration event
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
    if (event.affectsConfiguration("languageToolLinter")) {
      loadConfiguration(event);
    }
  }));

  // Register onDidOpenTextDocument event - request lint
  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(document => {
    requestLint(document);
  }));

  // Register onDidChangeActiveTextEditor event - request lint
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor) {
      requestLint(editor.document);
    }
  }));

  // Register onDidSaveTextDocument event - request immediate lint
  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(document => {
    requestLint(document);
  }));

  // Register onDidChangeTextDocument event - request lint with default timeout
  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
    if (ltConfig.get("lintOnChange")) {
      requestLint(event.document);
    }
  }));

  // Register onDidCloseTextDocument event - cancel any pending lint
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(document => {
    cancelLint(document);
    diagnosticCollection.delete(document.uri);
  }));

  // Register Code Actions Provider for supported languages
  LT_DOCUMENT_SELECTORS.forEach(function (selector: vscode.DocumentSelector) {
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(selector, new LTCodeActionProvider())
    );

    const onTypeDispatcher = new OnTypeFormattingDispatcher({
      '"': new QuotesFormattingProvider(),
      "'": new QuotesFormattingProvider(),
      '-': new DashesFormattingProvider()
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
  // LT_DOCUMENT_LANGUAGE_IDS.forEach(function (id) {
  //   LT_DOCUMENT_SCHEMES.forEach(function (documentScheme) {
  //     context.subscriptions.push(
  //       vscode.languages.registerCodeActionsProvider({ scheme: documentScheme, language: id }, new LTCodeActionProvider())
  //     );
  //     context.subscriptions.push(
  //       vscode.languages.registerOnTypeFormattingEditProvider({ scheme: documentScheme, language: id }, new SmartQuotesFormattingProvider(), '"', "'")
  //     );
  //     context.subscriptions.push(
  //       vscode.languages.registerOnTypeFormattingEditProvider({ scheme: documentScheme, language: id }, new SmartDashesFormattingProvider(), '-')
  //     );
  //   });
  // });

  // Register onDidCloseTextDocument event
  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(event => {
    if (diagnosticMap.has(event.uri.toString())) {
      diagnosticMap.delete(event.uri.toString());
    }
    resetDiagnostics();
  }));

  // Register "Lint Current Document" TextEditorCommand
  let lintCommand = vscode.commands.registerTextEditorCommand("languagetoolLinter.lintCurrentDocument", (editor, edit) => {
    requestLint(editor.document, 0);
  });
  context.subscriptions.push(lintCommand);

  // Lint Active Text Editor on Activate
  if (vscode.window.activeTextEditor) {
    let firstDelay = LT_TIMEOUT_MS;
    if (ltConfig.get("serviceType") === "managed") {
      // Add a second to give the service time to start up.
      firstDelay += 1000;
    }
    requestLint(vscode.window.activeTextEditor.document, firstDelay);
  }
}

export function deactivate() {
  stopManagedService();
}


