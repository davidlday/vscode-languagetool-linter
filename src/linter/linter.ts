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
import * as rp from "request-promise-native";
import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, CodeActionProvider, Diagnostic, DiagnosticCollection, DiagnosticSeverity, languages, Position, Range, TextDocument, Uri, workspace, WorkspaceEdit } from "vscode";
import { ConfigurationManager } from "../common/configuration-manager";
import { HTML, MARKDOWN, OUTPUT_CHANNEL, TIMEOUT_MS } from "../common/constants";
import { DashesFormattingProvider } from "../typeFormatters/dashesFormatter";
import { EllipsesFormattingProvider } from "../typeFormatters/ellipsesFormatter";
import { QuotesFormattingProvider } from "../typeFormatters/quotesFormatter";
import { IAnnotatedtext, IAnnotation, ILanguageToolMatch, ILanguageToolReplacement, ILanguageToolResponse } from "./interfaces";

export class Linter implements CodeActionProvider {

  public static DISPLAY_NAME: string = "languagetool-linter";
  public static DIAGNOSTIC_SOURCE: string = "LanguageTool";

  // Is the rule a Spelling rule?
  // See: https://forum.languagetool.org/t/identify-spelling-rules/4775/3
  public static isSpellingRule(ruleId: string): boolean {
    return ruleId.indexOf("MORFOLOGIK_RULE") !== -1 || ruleId.indexOf("SPELLER_RULE") !== -1
      || ruleId.indexOf("HUNSPELL_NO_SUGGEST_RULE") !== -1 || ruleId.indexOf("HUNSPELL_RULE") !== -1
      || ruleId.indexOf("FR_SPELLING_RULE") !== -1;
  }

  public diagnosticCollection: DiagnosticCollection;
  public diagnosticMap: Map<string, Diagnostic[]> = new Map();
  public codeActionMap: Map<string, CodeAction[]> = new Map();
  public remarkBuilderOptions: any = remarkBuilder.defaults;
  public rehypeBuilderOptions: any = rehypeBuilder.defaults;

  private readonly configManager: ConfigurationManager;
  private timeoutMap: Map<string, NodeJS.Timeout>;

  constructor(configManager: ConfigurationManager) {
    this.configManager = configManager;
    this.timeoutMap = new Map<string, NodeJS.Timeout>();
    this.diagnosticCollection = languages.createDiagnosticCollection(Linter.DISPLAY_NAME);

    this.remarkBuilderOptions.interpretmarkup = this.customMarkdownInterpreter;
  }

  // Provide CodeActions for thw given Document and Range
  public provideCodeActions(
    document: TextDocument,
    range: Range,
    context: CodeActionContext,
    token: CancellationToken,
  ): CodeAction[] {
    const documentUri: string = document.uri.toString();
    if (this.codeActionMap.has(documentUri) && this.codeActionMap.get(documentUri)) {
      const documentCodeActions: CodeAction[] = this.codeActionMap.get(documentUri) || [];
      const actions: CodeAction[] = [];
      documentCodeActions.forEach((action) => {
        if (action.diagnostics && context.diagnostics) {
          const actionDiagnostic: Diagnostic = action.diagnostics[0];
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

  // Remove diagnostics for a Document URI
  public clearDiagnostics(uri: Uri): void {
    const uriString: string = uri.toString();
    this.diagnosticMap.delete(uriString);
    this.codeActionMap.delete(uriString);
    this.diagnosticCollection.delete(uri);
  }

  // Request a lint for a document
  public requestLint(document: TextDocument, timeoutDuration: number = TIMEOUT_MS): void {
    if (this.configManager.isSupportedDocument(document)) {
      this.cancelLint(document);
      const uriString = document.uri.toString();
      const timeout = setTimeout(() => {
        this.lintDocument(document);
        this.cancelLint(document);
      }, timeoutDuration);
      this.timeoutMap.set(uriString, timeout);
    }
  }

  // Cancel lint
  public cancelLint(document: TextDocument): void {
    const uriString: string = document.uri.toString();
    if (this.timeoutMap.has(uriString)) {
      if (this.timeoutMap.has(uriString)) {
        const timeout: NodeJS.Timeout = this.timeoutMap.get(uriString) as NodeJS.Timeout;
        clearTimeout(timeout);
        this.timeoutMap.delete(uriString);
      }
    }
  }

  // Build annotatedtext from Markdown
  public buildAnnotatedMarkdown(text: string): IAnnotatedtext {
    return remarkBuilder.build(text, this.remarkBuilderOptions);
  }

  // Build annotatedtext from HTML
  public buildAnnotatedHTML(text: string): IAnnotatedtext {
    return rehypeBuilder.build(text, this.rehypeBuilderOptions);
  }

  // Build annotatedtext from PLAINTEXT
  public buildAnnotatedPlaintext(plainText: string): IAnnotatedtext {
    const textAnnotation: IAnnotation = { text: plainText };
    return { annotation: [textAnnotation] };
  }

  // Abstract annotated text builder
  public buildAnnotatedtext(document: TextDocument): IAnnotatedtext {
    let annotatedtext: IAnnotatedtext = { annotation: [] };
    switch (document.languageId) {
      case (MARKDOWN):
        annotatedtext = this.buildAnnotatedMarkdown(document.getText());
        break;
      case (HTML):
        annotatedtext = this.buildAnnotatedHTML(document.getText());
        break;
      default:
        annotatedtext = this.buildAnnotatedPlaintext(document.getText());
        break;
    }
    return annotatedtext;
  }

  // Perform Lint on Document
  public lintDocument(document: TextDocument): void {
    if (this.configManager.isSupportedDocument(document)) {
      if (document.languageId === "markdown") {
        const annotatedMarkdown: string = JSON.stringify(this.buildAnnotatedMarkdown(document.getText()));
        this.lintAnnotatedText(document, annotatedMarkdown);
      } else if (document.languageId === "html") {
        const annotatedHTML: string = JSON.stringify(this.buildAnnotatedHTML(document.getText()));
        this.lintAnnotatedText(document, annotatedHTML);
      } else {
        const annotatedPlaintext: string = JSON.stringify(this.buildAnnotatedPlaintext(document.getText()));
        this.lintAnnotatedText(document, annotatedPlaintext);
      }
    }
  }

  // Lint Annotated Text
  public lintAnnotatedText(document: TextDocument, annotatedText: string): void {
    if (this.configManager.isSupportedDocument(document)) {
      const ltPostDataDict: any = this.getPostDataTemplate();
      ltPostDataDict.data = annotatedText;
      this.callLanguageTool(document, ltPostDataDict);
    }
  }

  // Reset the Diagnostic Collection
  public resetDiagnostics(): void {
    this.diagnosticCollection.clear();
    this.diagnosticMap.forEach((diags, file) => {
      this.diagnosticCollection.set(Uri.parse(file), diags);
    });
  }

  // Apply smart formatting to annotated text.
  public smartFormatAnnotatedtext(annotatedtext: IAnnotatedtext): string {
    let newText: string = "";
    // Only run substitutions on text annotations.
    annotatedtext.annotation.forEach((annotation) => {
      if (annotation.text) {
        newText += annotation.text.replace(/"(?=[\w'‘])/g, QuotesFormattingProvider.startDoubleQuote)
          .replace(/'(?=[\w"“])/g, QuotesFormattingProvider.startSingleQuote)
          .replace(/([\w.!?%,'’])"/g, "$1" + QuotesFormattingProvider.endDoubleQuote)
          .replace(/([\w.!?%,"”])'/g, "$1" + QuotesFormattingProvider.endSingleQuote)
          .replace(/([\w])---(?=[\w])/g, "$1" + DashesFormattingProvider.emDash)
          .replace(/([\w])--(?=[\w])/g, "$1" + DashesFormattingProvider.enDash)
          .replace(/\.\.\./g, EllipsesFormattingProvider.ellipses);
      } else if (annotation.markup) {
        newText += annotation.markup;
      }
    });
    return newText;
  }

  // Private instance methods

  // Custom markdown interpretation
  private customMarkdownInterpreter(text: string): string {
    // Default of preserve line breaks
    let interpretation = "\n".repeat((text.match(/\n/g) || []).length);
    if (text.match(/^(?!\s*`{3})\s*`{1,2}/)) {
      // Treat inline code as redacted text
      interpretation = "`" + "#".repeat(text.length - 2) + "`";
    } else if (text.match(/#\s+$/)) {
      // Preserve Headers
      interpretation += "# ";
    } else if (text.match(/\*\s+$/)) {
      // Preserve bullets without leading spaces
      interpretation += "* ";
    } else if (text.match(/\d+\.\s+$/)) {
      // Treat as bullets without leading spaces
      interpretation += "** ";
    }
    return interpretation;
  }

  // Set ltPostDataTemplate from Configuration
  private getPostDataTemplate(): any {
    const ltPostDataTemplate: any = {};
    this.configManager.getServiceParameters().forEach((value, key) => {
      ltPostDataTemplate[key] = value;
    });
    return ltPostDataTemplate;
  }

  // Call to LanguageTool Service
  private callLanguageTool(document: TextDocument, ltPostDataDict: any): void {
    const url = this.configManager.getUrl();
    if (url) {
      const options: object = {
        form: ltPostDataDict,
        json: true,
        method: "POST",
      };
      rp.post(url, options)
        .then((data) => {
          this.suggest(document, data);
        })
        .catch((err) => {
          OUTPUT_CHANNEL.appendLine("Error connecting to " + url);
          OUTPUT_CHANNEL.appendLine(err);
        });
    } else {
      OUTPUT_CHANNEL.appendLine("No LanguageTool URL provided. Please check your settings and try again.");
      OUTPUT_CHANNEL.show(true);
    }
  }

  // Convert LanguageTool Suggestions into QuickFix CodeActions
  private suggest(document: TextDocument, response: ILanguageToolResponse): void {
    const matches = response.matches;
    const diagnostics: Diagnostic[] = [];
    const actions: CodeAction[] = [];
    matches.forEach((match: ILanguageToolMatch) => {
      const start: Position = document.positionAt(match.offset);
      const end: Position = document.positionAt(match.offset + match.length);
      const diagnosticSeverity: DiagnosticSeverity = this.configManager.getDiagnosticSeverity();
      const diagnosticRange: Range = new Range(start, end);
      const diagnosticMessage: string = match.rule.id + ": " + match.message;
      const diagnostic: Diagnostic = new Diagnostic(diagnosticRange, diagnosticMessage, diagnosticSeverity);
      diagnostic.source = Linter.DIAGNOSTIC_SOURCE;
      // Spelling Rules
      if (Linter.isSpellingRule(match.rule.id)) {
        const spellingActions: CodeAction[] = this.getSpellingRuleActions(document, diagnostic, match);
        if (spellingActions.length > 0) {
          diagnostics.push(diagnostic);
          spellingActions.forEach((action) => {
            actions.push(action);
          });
        }
      } else {
        diagnostics.push(diagnostic);
        this.getRuleActions(document, diagnostic, match).forEach((action) => {
          actions.push(action);
        });
      }
    });
    this.codeActionMap.set(document.uri.toString(), actions);
    this.diagnosticMap.set(document.uri.toString(), diagnostics);
    this.resetDiagnostics();
  }

  // Get CodeActions for Spelling Rules
  private getSpellingRuleActions(document: TextDocument, diagnostic: Diagnostic, match: ILanguageToolMatch): CodeAction[] {
    const actions: CodeAction[] = [];
    const word: string = document.getText(diagnostic.range);
    if (this.configManager.isIgnoredWord(word)) {
      if (this.configManager.showIgnoredWordHints()) {
        // Change severity for ignored words.
        diagnostic.severity = DiagnosticSeverity.Hint;
        if (this.configManager.isGloballyIgnoredWord(word)) {
          const actionTitle: string = "Remove '" + word + "' from always ignored words.";
          const action: CodeAction = new CodeAction(actionTitle, CodeActionKind.QuickFix);
          action.command = { title: actionTitle, command: "languagetoolLinter.removeGloballyIgnoredWord", arguments: [word] };
          action.diagnostics = [];
          action.diagnostics.push(diagnostic);
          actions.push(action);
        }
        if (this.configManager.isWorkspaceIgnoredWord(word)) {
          const actionTitle: string = "Remove '" + word + "' from Workspace ignored words.";
          const action: CodeAction = new CodeAction(actionTitle, CodeActionKind.QuickFix);
          action.command = { title: actionTitle, command: "languagetoolLinter.removeWorkspaceIgnoredWord", arguments: [word] };
          action.diagnostics = [];
          action.diagnostics.push(diagnostic);
          actions.push(action);
        }
      }
    } else {
      const usrIgnoreActionTitle: string = "Always ignore '" + word + "'";
      const usrIgnoreAction: CodeAction = new CodeAction(usrIgnoreActionTitle, CodeActionKind.QuickFix);
      usrIgnoreAction.command = { title: usrIgnoreActionTitle, command: "languagetoolLinter.ignoreWordGlobally", arguments: [word] };
      usrIgnoreAction.diagnostics = [];
      usrIgnoreAction.diagnostics.push(diagnostic);
      actions.push(usrIgnoreAction);
      if (workspace !== undefined) {
        const wsIgnoreActionTitle: string = "Ignore '" + word + "' in Workspace";
        const wsIgnoreAction: CodeAction = new CodeAction(wsIgnoreActionTitle, CodeActionKind.QuickFix);
        wsIgnoreAction.command = { title: wsIgnoreActionTitle, command: "languagetoolLinter.ignoreWordInWorkspace", arguments: [word] };
        wsIgnoreAction.diagnostics = [];
        wsIgnoreAction.diagnostics.push(diagnostic);
        actions.push(wsIgnoreAction);
      }
      this.getReplacementActions(document, diagnostic, match.replacements).forEach((action: CodeAction) => {
        actions.push(action);
      });
    }
    return actions;
  }

  // Get all Rule CodeActions
  private getRuleActions(document: TextDocument, diagnostic: Diagnostic, match: ILanguageToolMatch): CodeAction[] {
    const actions: CodeAction[] = [];
    this.getReplacementActions(document, diagnostic, match.replacements).forEach((action: CodeAction) => {
      actions.push(action);
    });
    return actions;
  }

  // Get all edit CodeActions based on Replacements
  private getReplacementActions(document: TextDocument, diagnostic: Diagnostic, replacements: ILanguageToolReplacement[]): CodeAction[] {
    const actions: CodeAction[] = [];
    replacements.forEach((replacement: ILanguageToolReplacement) => {
      const actionTitle: string = "'" + replacement.value + "'";
      const action: CodeAction = new CodeAction(actionTitle, CodeActionKind.QuickFix);
      const edit: WorkspaceEdit = new WorkspaceEdit();
      edit.replace(document.uri, diagnostic.range, replacement.value);
      action.edit = edit;
      action.diagnostics = [];
      action.diagnostics.push(diagnostic);
      actions.push(action);
    });
    return actions;
  }

}
