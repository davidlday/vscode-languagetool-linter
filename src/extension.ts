import * as vscode from 'vscode';
import * as remarkBuilder from 'annotatedtext-remark';
import * as rehypeBuilder from 'annotatedtext-rehype';
import * as rp from 'request-promise-native';

let diagnosticCollection: vscode.DiagnosticCollection;
let diagnosticMap: Map<string, vscode.Diagnostic[]>;
let codeActions: vscode.CodeAction[];

const LT_DOCUMENT_LANGUAGES: string[] = ["markdown", "html", "plaintext"];
const LT_PUBLIC_URL: string = "https://languagetool.org/api/";
const LT_OPTIONAL_CONFIGS: string[] = [
  "motherTongue",
  "preferredVariants",
  "disabledCategories",
  "disabledRules",
  "disabledRules",
  "disabledCategories"
];
const LT_DIAGNOSTIC_SOURCE = "LanguageTool";

// Interfaces
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

interface LTReplacement {
  value: string;
  shortDescription: string;
}

// Classes
class LTCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    // Code Actions get created in suggest()
    return codeActions;
  }
}


// Exported Functions
export function activate(context: vscode.ExtensionContext) {

  diagnosticCollection = vscode.languages.createDiagnosticCollection("languagetool-linter");
  diagnosticMap = new Map();
  codeActions = [];

  function isWriteGoodLanguage(languageId: string) {
    return (LT_DOCUMENT_LANGUAGES.indexOf(languageId) > -1);
  }

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
    if (isWriteGoodLanguage(event.document.languageId)) {
      if (event.document.languageId === "markdown") {
        let annotatedMarkdown: string = JSON.stringify(remarkBuilder.build(event.document.getText()));
        lintAnnotatedText(event.document, annotatedMarkdown);
      } else if (event.document.languageId === "html") {
        let annotatedHTML: string = JSON.stringify(rehypeBuilder.build(event.document.getText()));
        lintAnnotatedText(event.document, annotatedHTML);
      } else {
        lintPlaintext(event.document);
      }
    }
  }));

  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(event => {
    if (diagnosticMap.has(event.uri.toString())) {
      diagnosticMap.delete(event.uri.toString());
    }
    resetDiagnostics();
  }));

  context.subscriptions.push(diagnosticCollection);
  LT_DOCUMENT_LANGUAGES.forEach(function (id) {
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider({ scheme: '*', language: id }, new LTCodeActionProvider()));
  });

}

export function deactivate() { }

// Private Functions
function getCheckUrl(): string {
  let ltConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("languageToolLinter");
  let checkPath = "/v2/check";
  let ltUrl = ltConfig.get("url");
  if (ltUrl && typeof ltUrl === "string") {
    return ltUrl + checkPath;
  } else if (ltConfig.get("publicFallback") === true) {
    return LT_PUBLIC_URL + checkPath;
  } else {
    // Need a much nicer way of handling this.
    console.log("No URL configured and using the public URL as a fallback is disabled!");
    return "";
  }
}

function getPostDataDict(): any {
  let ltConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("languageToolLinter.languageTool");

  let ltPostDataDict: any = {
    "language": ltConfig.get("language")
  };
  LT_OPTIONAL_CONFIGS.forEach(function (ltConfigString) {
    let configItem = ltConfigString;
    if (ltConfig.get(configItem)) {
      ltPostDataDict[configItem] = ltConfig.get(configItem);
    }
  });
  return ltPostDataDict;
}

function resetDiagnostics() {
  // console.log("Resetting Diagnostics...");
  diagnosticCollection.clear();

  diagnosticMap.forEach((diags, file) => {
    diagnosticCollection.set(vscode.Uri.parse(file), diags);
  });
}

function suggest(document: vscode.TextDocument, response: LTResponse) {
  let matches = response.matches;
  let diagnostics: vscode.Diagnostic[] = [];
  let actions: vscode.CodeAction[] = [];

  matches.forEach(function (match: LTMatch) {
    let start: vscode.Position = document.positionAt(match.context.offset);
    let end: vscode.Position = document.positionAt(match.context.offset + match.context.length);
    let diagnosticRange: vscode.Range = new vscode.Range(start, end);
    let diagnosticMessage: string = match.rule.id + ": " + match.message;
    let diagnostic: vscode.Diagnostic = new vscode.Diagnostic(diagnosticRange, diagnosticMessage, vscode.DiagnosticSeverity.Warning);
    match.replacements.forEach(function (replacement: LTReplacement) {
      let action: vscode.CodeAction = new vscode.CodeAction(replacement.value, vscode.CodeActionKind.QuickFix);
      let location: vscode.Location = new vscode.Location(document.uri, diagnosticRange);
      action.edit = new vscode.WorkspaceEdit();
      action.edit.replace(document.uri, location.range, replacement.value);
      actions.push(action);
    });
    diagnostic.source = LT_DIAGNOSTIC_SOURCE;
    diagnostics.push(diagnostic);
  });
  // Update Global Code Actions.
  codeActions = actions;
  diagnosticMap.set(document.uri.toString(), diagnostics);
  resetDiagnostics();
}

function lintPlaintext(document: vscode.TextDocument) {

  let editorContent: string = document.getText();

  let ltPostDataDict: any = getPostDataDict();
  ltPostDataDict["text"] = editorContent;

  let options: object = {
    "method": "POST",
    "form": ltPostDataDict,
    "json": true
  };

  rp.post(getCheckUrl(), options)
    .then(function (data) {
      suggest(document, data);
    })
    .catch(function (err) {
      console.log(err);
    });
}

function lintAnnotatedText(document: vscode.TextDocument, annotatedText: string) {

  let ltPostDataDict: any = getPostDataDict();
  ltPostDataDict["data"] = annotatedText;

  let options: object = {
    "method": "POST",
    "form": ltPostDataDict,
    "json": true
  };

  rp.post(getCheckUrl(), options)
    .then(function (data) {
      suggest(document, data);
    })
    .catch(function (err) {
      console.log(err);
    });

}
