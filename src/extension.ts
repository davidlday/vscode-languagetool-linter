import * as vscode from 'vscode';
import * as remarkBuilder from 'annotatedtext-remark';
import * as rp from 'request-promise-native';

let diagnosticCollection: vscode.DiagnosticCollection;
let diagnosticMap: Map<string, vscode.Diagnostic[]>;
let ltDocumentLanguage: string[] = ["markdown", "plaintext"];
// let ltUrl: string = "https://languagetool.org/api/v2/check";
let ltUrl: string = "http://localhost:9999/v2/check";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  diagnosticCollection = vscode.languages.createDiagnosticCollection("LanguageTool Linter");
  diagnosticMap = new Map();

  function isWriteGoodLanguage(languageId: string) {
    return (ltDocumentLanguage.indexOf(languageId) > -1);
  }

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
    if (isWriteGoodLanguage(event.document.languageId)) {
      if (event.document.languageId === "markdown") {
        let annotatedMarkdown: string = JSON.stringify(remarkBuilder.build(event.document.getText()));
        lintAnnotatedText(event.document, annotatedMarkdown);
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

  console.log('Congratulations, your extension "vscode-languagetool-linter" is now active!');

  // // The command has been defined in the package.json file
  // // Now provide the implementation of the command with registerCommand
  // // The commandId parameter must match the command field in package.json
  // let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
  // 	// The code you place here will be executed every time your command is executed

  // 	// Display a message box to the user
  // 	vscode.window.showInformationMessage('Hello World!');
  // });

  // context.subscriptions.push(disposable);

}

class LTCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    let actions: vscode.CodeAction[] = [];
    let action = new vscode.CodeAction("test");
    actions.push(action);
    return actions;
  }
}

function resetDiagnostics() {
  // console.log("Resetting Diagnostics...");
  diagnosticCollection.clear();

  diagnosticMap.forEach((diags, file) => {
    diagnosticCollection.set(vscode.Uri.parse(file), diags);
  });
}

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

function suggest(document: vscode.TextDocument, response: LTResponse) {
  let matches = response.matches;
  let diagnostics: vscode.Diagnostic[] = [];
  // let lines = document.getText().split(/\r?\n/g);
  matches.forEach(function (match: LTMatch) {
    // console.log(match);
    let start = document.positionAt(match.offset);
    let end = document.positionAt(match.offset + match.length);
    let diagnosticRange: vscode.Range = new vscode.Range(start, end);
    let daignosticMessage: string = match.rule.id + ": " + match.message;
    let diagnostic: vscode.Diagnostic = new vscode.Diagnostic(diagnosticRange, daignosticMessage, vscode.DiagnosticSeverity.Warning);
    let relatedInformation: vscode.DiagnosticRelatedInformation[] = new Array<vscode.DiagnosticRelatedInformation>();
    diagnostic.source = "LanguageTool";
    // match.replacements.forEach(function (replacement: LTReplacement) {
    //   let location: vscode.Location = new vscode.Location(document.uri, diagnosticRange);
    //   let related: vscode.DiagnosticRelatedInformation = new vscode.DiagnosticRelatedInformation(location, replacement.value);
    //   relatedInformation.push(related);
    // });
    diagnostic.relatedInformation = relatedInformation;
    diagnostics.push(diagnostic);
  });
  diagnosticMap.set(document.uri.toString(), diagnostics);
  resetDiagnostics();
}

function lintPlaintext(document: vscode.TextDocument) {

  let ltConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("languagetool-linter");
  // console.log(ltConfig);
  let diagnostics: vscode.Diagnostic[] = [];

  let editorContent: string = document.getText();
  // console.log(editorContent);

  let post_data_dict = {
    "language": ltConfig.get("language"),
    "text": editorContent,
    // "motherTongue": ltConfig.get("motherTongue"),
    // "preferredVariants": ltConfig.get("preferredVariants"),
    // "disabledCategories": ltConfig.get("disabledCategories"),
    // "disabledRules": ltConfig.get("disabledRules")
  };
  // console.log(post_data_dict);

  let options: object = {
    "method": "POST",
    "form": post_data_dict,
    "json": true
  };
  // console.log(options);


  rp.post(ltUrl, options)
    .then(function (data) {
      suggest(document, data);
    })
    .catch(function (err) {
      console.log(err);
    });
}

function lintAnnotatedText(document: vscode.TextDocument, annotatedText: string) {
  let ltConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("languagetool-linter");

  let post_data_dict = {
    "language": ltConfig.get("language"),
    "data": annotatedText,
    // "motherTongue": ltConfig.get("motherTongue"),
    // "preferredVariants": ltConfig.get("preferredVariants"),
    // "disabledCategories": ltConfig.get("disabledCategories"),
    // "disabledRules": ltConfig.get("disabledRules")
  };
  console.log(post_data_dict);

  let options: object = {
    "method": "POST",
    "form": post_data_dict,
    "json": true
  };

  rp.post(ltUrl, options)
    .then(function (data) {
      suggest(document, data);
    })
    .catch(function (err) {
      console.log(err);
    });

}

// this method is called when your extension is deactivated
export function deactivate() { }
