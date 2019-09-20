// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { isNullOrUndefined } from 'util';
import * as rp from 'request-promise-native';
import { resolve } from 'url';

let diagnosticCollection: vscode.DiagnosticCollection;
let diagnosticMap: Map<string, vscode.Diagnostic[]>;


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  let ltDocumentLanguage = [ "markdown", "plaintext" ];
  diagnosticCollection = vscode.languages.createDiagnosticCollection("LanguageTool Linter");
  diagnosticMap = new Map();

  function isWriteGoodLanguage(languageId) {
    // let wgLanguages = vscode.workspace.getConfiguration('write-good').get('languages');
    // return (ltDocumentLanguage.indexOf(languageId) > -1 || ltDocumentLanguage === '*');
    return (ltDocumentLanguage.indexOf(languageId) > -1);
  }

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
    if (isWriteGoodLanguage(event.document.languageId)) {
        doLint(event.document);
    }
  }));

  context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(event => {
    if (isWriteGoodLanguage(event.languageId)) {
        doLint(event);
    }
  }));

  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(event => {
    if (diagnosticMap.has(event.uri.toString())) {
        diagnosticMap.delete(event.uri.toString());
    }
    resetDiagnostics();
  }));

	console.log('LanguageTool Linter activated!');

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

interface Suggestion {
  index: number;
  offset: number;
  reason: string;
}

function resetDiagnostics() {
  diagnosticCollection.clear();

  diagnosticMap.forEach((diags, file) => {
      diagnosticCollection.set(vscode.Uri.parse(file), diags);
  });
}

function doLint(document: vscode.TextDocument) {

  let ltConfig = vscode.workspace.getConfiguration('languagetool-linter');
  // if (isNullOrUndefined(ltConfig)) {
  //   ltConfig = {};
  // }
  let diagnostics: vscode.Diagnostic[] = [];

  let editorContent = document.getText();

  let post_data_dict = {
    "language": "auto",
    "text": editorContent,
    "preferredVariants": ltConfig.get('languageTool.preferredVariants'),
    "disabledCategories": ltConfig.get('languageTool.disabledCategories'),
    "disabledRules": ltConfig.get('languageTool.disabledRules'),
    "motherTongue": ltConfig.get("languageTool.motherTongue")
  };

  let options = {
    method: 'POST',
    uri: "https://languagetool.org/api/v2/check",
    form: post_data_dict,
    json: true
  };

  rp(options)
    .then( function (data) {
      resolve(data,data);
    })
    .catch( function (err) {
      console.log(err);
      resolve(err, err);
    });


  let lines = document.getText().split(/\r?\n/g);
  lines.forEach((line, lineCount) => {
      let suggestions : Suggestion[] = WriteGood(line, ltConfig);
      suggestions.forEach((suggestion, si) => {
          let start = new vscode.Position(lineCount, suggestion.index);
          let end = new vscode.Position(lineCount, suggestion.index + suggestion.offset);
          diagnostics.push(new vscode.Diagnostic(new vscode.Range(start, end), suggestion.reason, vscode.DiagnosticSeverity.Warning));
      });
  });

  diagnosticMap.set(document.uri.toString(), diagnostics);
  resetDiagnostics();
}

// this method is called when your extension is deactivated
export function deactivate() {
  console.log("LanguageTool Linter deactivated...");
}
