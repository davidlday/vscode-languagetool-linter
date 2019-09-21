import * as vscode from 'vscode';
import { isNullOrUndefined } from 'util';
import * as rp from 'request-promise-native';

let diagnosticCollection: vscode.DiagnosticCollection;
let diagnosticMap: Map<string, vscode.Diagnostic[]>;
let ltDocumentLanguage: string[] = [ "markdown", "plaintext" ];
let ltUrl: string = "https://languagetool.org/api/v2/check";

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
        doLint(event.document);
    }
  }));

  context.subscriptions.push(vscode.workspace.onDidCloseTextDocument(event => {
    if (diagnosticMap.has(event.uri.toString())) {
        diagnosticMap.delete(event.uri.toString());
    }
    resetDiagnostics();
  }));

  // Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-languagetool-linter" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World!');
	});

	context.subscriptions.push(disposable);
}

function resetDiagnostics() {
  console.log("Resetting Diagnostics...");
  diagnosticCollection.clear();

  diagnosticMap.forEach((diags, file) => {
      diagnosticCollection.set(vscode.Uri.parse(file), diags);
  });
}

interface Suggestion {
  index: number;
  offset: number;
  reason: string;
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
  replacements: Map<string, string>;
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

function suggest(data: LTResponse) {
  let matches = data.matches;
  let diagnostics: vscode.Diagnostic[] = [];
  // let lines = document.getText().split(/\r?\n/g);
  matches.forEach( function (match: LTMatch) {
    let offset: number = match.offset;
    let length: number = match.length;
    // Need to calculate lineCount. Blech.
    let start = new vscode.Position(0, match.offset);
    let end = new vscode.Position(0, match.offset + match.length);
    diagnostics.push(new vscode.Diagnostic(new vscode.Range(start, end), match.message, vscode.DiagnosticSeverity.Warning));
  });
}

function doLint(document: vscode.TextDocument) {

  let ltConfig: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration("languagetool-linter");
  console.log(ltConfig);
  let diagnostics: vscode.Diagnostic[] = [];

  let editorContent: string = document.getText();
  console.log(editorContent);

  let post_data_dict = {
    "language": ltConfig.get("language"),
    "text": editorContent,
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
  console.log(options);

  rp.post(ltUrl, options)
    .then( function (data) {
      console.log(data);
    })
    .catch( function (err) {
      console.log(err);
    });

  diagnosticMap.set(document.uri.toString(), diagnostics);
  resetDiagnostics();
  console.log(document.getText());
  console.log(document.languageId);
}

// this method is called when your extension is deactivated
export function deactivate() {}
