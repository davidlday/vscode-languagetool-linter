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

import {
  TextDocument, WorkspaceEdit, CodeAction, Location, Diagnostic, Position,
  Range, CodeActionKind, DiagnosticSeverity, DiagnosticCollection, languages, Uri, CodeActionProvider, CodeActionContext, CancellationToken, workspace
} from 'vscode';
import { ConfigurationManager } from '../common/configuration-manager';
import { LT_TIMEOUT_MS, LT_OUTPUT_CHANNEL, LT_DIAGNOSTIC_SOURCE, LT_DISPLAY_NAME } from '../common/constants';
import * as rp from "request-promise-native";
import * as rehypeBuilder from "annotatedtext-rehype";
import * as remarkBuilder from "annotatedtext-remark";
import { ILanguageToolResponse, ILanguageToolMatch, ILanguageToolReplacement } from './interfaces';

export class Linter implements CodeActionProvider {
  private readonly configManager: ConfigurationManager;
  private timeoutMap: Map<string, NodeJS.Timeout>;
  diagnosticCollection: DiagnosticCollection;
  diagnosticMap: Map<string, Diagnostic[]> = new Map();
  codeActionMap: Map<string, CodeAction[]> = new Map();
  remarkBuilderOptions: any = remarkBuilder.defaults;
  rehypeBuilderOptions: any = rehypeBuilder.defaults;

  constructor(configManager: ConfigurationManager) {
    this.configManager = configManager;
    this.timeoutMap = new Map();
    this.diagnosticCollection = languages.createDiagnosticCollection(LT_DISPLAY_NAME);

    this.remarkBuilderOptions.interpretmarkup = this.customMarkdownInterpreter;
  }

  // Custom markdown interpretation
  private customMarkdownInterpreter(text: string): string {
    let interpretation = "";
    // Treat inline code as redacted text
    if (text.match(/^(?!\s*`{3})\s*`{1,2}/)) {
      interpretation = "`" + "#".repeat(text.length - 2) + "`";
    } else {
      let count = (text.match(/\n/g) || []).length;
      interpretation = "\n".repeat(count);
    }
    return interpretation;
  }

  provideCodeActions(
    document: TextDocument,
    range: Range,
    context: CodeActionContext,
    token: CancellationToken
  ): CodeAction[] {
    let documentUri: string = document.uri.toString();
    let codeActionMap: Map<string, CodeAction[]> = this.getCodeActionMap();
    if (codeActionMap.has(documentUri) && codeActionMap.get(documentUri)) {
      let documentCodeActions: CodeAction[] = codeActionMap.get(documentUri) || [];
      let actions: CodeAction[] = [];
      documentCodeActions.forEach(function (action) {
        if (action.diagnostics && context.diagnostics) {
          let actionDiagnostic: Diagnostic = action.diagnostics[0];
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

  deleteFromDiagnosticCollection(uri: Uri): void {
    this.diagnosticCollection.delete(uri);
  }

  getDiagnosticCollection(): DiagnosticCollection {
    return this.diagnosticCollection;
  }

  getDiagnosticMap(): Map<string, Diagnostic[]> {
    return this.diagnosticMap;
  }

  getCodeActionMap(): Map<string, CodeAction[]> {
    return this.codeActionMap;
  }

  requestLint(document: TextDocument, timeoutDuration: number = LT_TIMEOUT_MS): void {
    if (this.configManager.isSupportedDocument(document)) {
      this.cancelLint(document);
      let uriString = document.uri.toString();
      let timeout = setTimeout(() => {
        this.lintDocument(document);
        this.cancelLint(document);
      }, timeoutDuration);
      this.timeoutMap.set(uriString, timeout);
    }
  }

  // Cancel lint
  cancelLint(document: TextDocument): void {
    let uriString = document.uri.toString();
    if (this.timeoutMap.has(uriString)) {
      let timeout = this.timeoutMap.get(uriString);
      if (timeout) {
        clearTimeout(timeout);
        this.timeoutMap.delete(uriString);
      }
    }
  }

  // Build annotatedtext from Markdown
  buildAnnotatedMarkdown(text: string): string {
    return JSON.stringify(remarkBuilder.build(text, this.remarkBuilderOptions));
  }

  // Build annotatedtext from HTML
  buildAnnotatedHTML(text: string): string {
    return JSON.stringify(rehypeBuilder.build(text, this.rehypeBuilderOptions));
  }

  // Build annotatedtext from PLAINTEXT
  buildAnnotatedPlaintext(text: string): string {
    return JSON.stringify({ "text": text });
  }

  // Perform Lint on Document
  lintDocument(document: TextDocument): void {
    if (this.configManager.isSupportedDocument(document)) {
      if (document.languageId === "markdown") {
        let annotatedMarkdown: string = this.buildAnnotatedMarkdown(document.getText());
        this.lintAnnotatedText(document, annotatedMarkdown);
      } else if (document.languageId === "html") {
        let annotatedHTML: string = this.buildAnnotatedHTML(document.getText());
        this.lintAnnotatedText(document, annotatedHTML);
      } else {
        let annotatedPlaintext: string = this.buildAnnotatedPlaintext(document.getText());
        this.lintAnnotatedText(document, annotatedPlaintext);
      }
    }
  }

  // Set ltPostDataTemplate from Configuration
  private getPostDataTemplate(): any {
    let ltPostDataTemplate: any = {};
    this.configManager.getServiceParameters().forEach(function (value, key) {
      ltPostDataTemplate[key] = value;
    });
    return ltPostDataTemplate;
  }

  // Call to LanguageTool Service
  private callLanguageTool(document: TextDocument, ltPostDataDict: any): void {
    let url = this.configManager.getUrl();
    if (url) {
      let options: object = {
        "method": "POST",
        "form": ltPostDataDict,
        "json": true
      };
      rp.post(url, options)
        .then((data) => {
          this.suggest(document, data);
        })
        .catch((err) => {
          LT_OUTPUT_CHANNEL.appendLine("Error connecting to " + url);
          LT_OUTPUT_CHANNEL.appendLine(err);
          LT_OUTPUT_CHANNEL.show(true);
        });
    } else {
      LT_OUTPUT_CHANNEL.appendLine("No LanguageTool URL provided. Please check your settings and try again.");
      LT_OUTPUT_CHANNEL.show(true);
    }
  }

  // Lint Annotated Text
  lintAnnotatedText(document: TextDocument, annotatedText: string): void {
    if (this.configManager.isSupportedDocument(document)) {
      let ltPostDataDict: any = this.getPostDataTemplate();
      ltPostDataDict["data"] = annotatedText;
      this.callLanguageTool(document, ltPostDataDict);
    }
  }

  // Convert LanguageTool Suggestions into QuickFix CodeActions
  private suggest(document: TextDocument, response: ILanguageToolResponse): void {
    let matches = response.matches;
    let diagnostics: Diagnostic[] = [];
    let actions: CodeAction[] = [];
    matches.forEach((match: ILanguageToolMatch) => {
      let start: Position = document.positionAt(match.offset);
      let end: Position = document.positionAt(match.offset + match.length);
      let diagnosticRange: Range = new Range(start, end);
      let diagnosticMessage: string = match.rule.id + ": " + match.message;
      let diagnostic: Diagnostic = new Diagnostic(diagnosticRange, diagnosticMessage, DiagnosticSeverity.Warning);
      diagnostic.source = LT_DIAGNOSTIC_SOURCE;
      diagnostics.push(diagnostic);
      // Spelling Rules
      if (Linter.isSpellingRule(match.rule.id)) {
        this.getSpellingRuleActions(document, diagnostic, match).forEach( (action) => {
          actions.push(action);
        });
      } else {
        this.getRuleActions(document, diagnostic, match).forEach( (action) => {
          actions.push(action);
        });
      }
    });
    this.codeActionMap.set(document.uri.toString(), actions);
    this.diagnosticMap.set(document.uri.toString(), diagnostics);
    this.resetDiagnostics();
  }

  private getSpellingRuleActions(document: TextDocument, diagnostic: Diagnostic, match: ILanguageToolMatch): CodeAction[] {
    if (!Linter.isSpellingRule(match.rule.id)) {
      return [];
    }
    let actions: CodeAction[] = [];
    let word: string = document.getText(diagnostic.range);
    if (this.configManager.isIgnoredWord(word)) {
      // Change severity for ignored words.
      diagnostic.severity = DiagnosticSeverity.Hint;
      if (this.configManager.isGloballyIgnoredWord(word)) {
        let actionTitle: string = "Remove '" + word + "' from always ignored words.";
        let action: CodeAction = new CodeAction(actionTitle, CodeActionKind.QuickFix);
        action.command = { title: actionTitle, command: "languagetoolLinter.removeGloballyIgnoredWord", arguments: [word] };
        action.diagnostics = [];
        action.diagnostics.push(diagnostic);
        actions.push(action);
      }
      if (this.configManager.isWorkspaceIgnoredWord(word)) {
        let actionTitle: string = "Remove '" + word + "' from Workspace ignored words.";
        let action: CodeAction = new CodeAction(actionTitle, CodeActionKind.QuickFix);
        action.command = { title: actionTitle, command: "languagetoolLinter.removeWorkspaceIgnoredWord", arguments: [word] };
        action.diagnostics = [];
        action.diagnostics.push(diagnostic);
        actions.push(action);
      }
    } else {
      let actionTitle: string = "Always ignore '" + word + "'";
      let action: CodeAction = new CodeAction(actionTitle, CodeActionKind.QuickFix);
      action.command = { title: actionTitle, command: "languagetoolLinter.ignoreWordGlobally", arguments: [word] };
      action.diagnostics = [];
      action.diagnostics.push(diagnostic);
      actions.push(action);
      if (workspace !== undefined) {
        let actionTitle: string = "Ignore '" + word + "' in Workspace";
        let action: CodeAction = new CodeAction(actionTitle, CodeActionKind.QuickFix);
        action.command = { title: actionTitle, command: "languagetoolLinter.ignoreWordInWorkspace", arguments: [word] };
        action.diagnostics = [];
        action.diagnostics.push(diagnostic);
        actions.push(action);
      }
      this.getReplacementActions(document, diagnostic, match.replacements).forEach( (action: CodeAction) => {
        actions.push(action);
      });
    }
    return actions;
  }

  private getRuleActions(document: TextDocument, diagnostic: Diagnostic, match: ILanguageToolMatch): CodeAction[] {
    let actions: CodeAction[] = [];
    this.getReplacementActions(document, diagnostic, match.replacements).forEach( (action: CodeAction) => {
      actions.push(action);
    });
    return actions;
  }

  private getReplacementActions(document: TextDocument, diagnostic: Diagnostic, replacements: ILanguageToolReplacement[]): CodeAction[] {
    let actions: CodeAction[] = [];
    replacements.forEach( (replacement: ILanguageToolReplacement) => {
      let actionTitle: string = "'" + replacement.value + "'";
      let action: CodeAction = new CodeAction(actionTitle, CodeActionKind.QuickFix);
      let edit: WorkspaceEdit = new WorkspaceEdit();
      edit.replace(document.uri, diagnostic.range, replacement.value);
      action.edit = edit;
      action.diagnostics = [];
      action.diagnostics.push(diagnostic);
      actions.push(action);
    });
    return actions;
  }

  // Reset the Diagnostic Collection
  resetDiagnostics(): void {
    this.diagnosticCollection.clear();
    this.diagnosticMap.forEach((diags, file) => {
      this.diagnosticCollection.set(Uri.parse(file), diags);
    });
  }

  // Is the rule a Spelling rule?
  // See: https://forum.languagetool.org/t/identify-spelling-rules/4775/3
  static isSpellingRule(ruleId: string): boolean {
    return ruleId.indexOf("MORFOLOGIK_RULE") !== -1 || ruleId.indexOf("SPELLER_RULE") !== -1
      || ruleId.indexOf("HUNSPELL_NO_SUGGEST_RULE") !== -1 || ruleId.indexOf("HUNSPELL_RULE") !== -1
      || ruleId.indexOf("FR_SPELLING_RULE") !== -1;
  }

}
