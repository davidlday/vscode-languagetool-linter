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

import * as RehypeBuilder from "annotatedtext-rehype";
import * as RemarkBuilder from "annotatedtext-remark";
import * as Fetch from "node-fetch";
import {
  CancellationToken,
  CodeAction,
  CodeActionContext,
  CodeActionKind,
  CodeActionProvider,
  Diagnostic,
  DiagnosticCollection,
  DiagnosticSeverity,
  languages,
  Position,
  Range,
  TextDocument,
  Uri,
  workspace,
  WorkspaceEdit,
} from "vscode";
import * as Constants from "../configuration/constants";
import { ConfigurationManager } from "../configuration/manager";
import { DashesFormattingProvider } from "../typeFormatters/dashesFormatter";
import { EllipsesFormattingProvider } from "../typeFormatters/ellipsesFormatter";
import { QuotesFormattingProvider } from "../typeFormatters/quotesFormatter";
import {
  ILanguageToolMatch,
  ILanguageToolReplacement,
  ILanguageToolResponse,
} from "./interfaces";
import { IAnnotatedtext, IAnnotation } from "annotatedtext";

class LTDiagnostic extends Diagnostic {
  match?: ILanguageToolMatch;
}

export class Linter implements CodeActionProvider {
  // Is the rule a Spelling rule?
  // See: https://forum.languagetool.org/t/identify-spelling-rules/4775/3
  public static isSpellingRule(ruleId: string): boolean {
    return (
      ruleId.indexOf("MORFOLOGIK_RULE") !== -1 ||
      ruleId.indexOf("SPELLER_RULE") !== -1 ||
      ruleId.indexOf("HUNSPELL_NO_SUGGEST_RULE") !== -1 ||
      ruleId.indexOf("HUNSPELL_RULE") !== -1 ||
      ruleId.indexOf("FR_SPELLING_RULE") !== -1
    );
  }

  public diagnosticCollection: DiagnosticCollection;
  public remarkBuilderOptions: RemarkBuilder.IOptions = RemarkBuilder.defaults;
  public rehypeBuilderOptions: RehypeBuilder.IOptions = RehypeBuilder.defaults;

  private readonly configManager: ConfigurationManager;
  private timeoutMap: Map<string, NodeJS.Timeout>;

  constructor(configManager: ConfigurationManager) {
    this.configManager = configManager;
    this.timeoutMap = new Map<string, NodeJS.Timeout>();
    this.diagnosticCollection = languages.createDiagnosticCollection(
      Constants.EXTENSION_DISPLAY_NAME,
    );
    this.remarkBuilderOptions.interpretmarkup = this.customMarkdownInterpreter;
  }

  // Provide CodeActions for thw given Document and Range
  public provideCodeActions(
    document: TextDocument,
    _range: Range,
    context: CodeActionContext,
    _token: CancellationToken,
  ): CodeAction[] {
    const diagnostics = context.diagnostics || [];
    const actions: CodeAction[] = [];
    diagnostics
      .filter(
        (diagnostic) =>
          diagnostic.source === Constants.EXTENSION_DIAGNOSTIC_SOURCE,
      )
      .forEach((diagnostic) => {
        const match:
          | ILanguageToolMatch
          | undefined = (diagnostic as LTDiagnostic).match;
        if (match && Linter.isSpellingRule(match.rule.id)) {
          const spellingActions: CodeAction[] = this.getSpellingRuleActions(
            document,
            diagnostic,
          );
          if (spellingActions.length > 0) {
            spellingActions.forEach((action) => {
              actions.push(action);
            });
          }
        } else {
          this.getRuleActions(document, diagnostic).forEach((action) => {
            actions.push(action);
          });
        }
      });
    return actions;
  }

  // Remove diagnostics for a Document URI
  public clearDiagnostics(uri: Uri): void {
    this.diagnosticCollection.delete(uri);
  }

  // Request a lint for a document
  public requestLint(
    document: TextDocument,
    timeoutDuration: number = Constants.EXTENSION_TIMEOUT_MS,
  ): void {
    if (this.configManager.isSupportedDocument(document)) {
      this.cancelLint(document);
      const uriString = document.uri.toString();
      const timeout = setTimeout(() => {
        this.lintDocument(document);
      }, timeoutDuration);
      this.timeoutMap.set(uriString, timeout);
    }
  }
  // Force request a lint for a document as plain text regardless of language id
  public requestLintAsPlainText(
    document: TextDocument,
    timeoutDuration: number = Constants.EXTENSION_TIMEOUT_MS,
  ): void {
    this.cancelLint(document);
    const uriString = document.uri.toString();
    const timeout = setTimeout(() => {
      this.lintDocumentAsPlainText(document);
    }, timeoutDuration);
    this.timeoutMap.set(uriString, timeout);
  }

  // Cancel lint
  public cancelLint(document: TextDocument): void {
    const uriString: string = document.uri.toString();
    if (this.timeoutMap.has(uriString)) {
      if (this.timeoutMap.has(uriString)) {
        const timeout: NodeJS.Timeout = this.timeoutMap.get(
          uriString,
        ) as NodeJS.Timeout;
        clearTimeout(timeout);
        this.timeoutMap.delete(uriString);
      }
    }
  }

  // Build annotatedtext from Markdown
  public buildAnnotatedMarkdown(text: string): IAnnotatedtext {
    return RemarkBuilder.build(text, this.remarkBuilderOptions);
  }

  // Build annotatedtext from HTML
  public buildAnnotatedHTML(text: string): IAnnotatedtext {
    return RehypeBuilder.build(text, this.rehypeBuilderOptions);
  }

  // Build annotatedtext from PLAINTEXT
  public buildAnnotatedPlaintext(plainText: string): IAnnotatedtext {
    const textAnnotation: IAnnotation = {
      text: plainText,
      offset: {
        start: 0,
        end: plainText.length,
      },
    };
    return { annotation: [textAnnotation] };
  }

  // Abstract annotated text builder
  public buildAnnotatedtext(document: TextDocument): IAnnotatedtext {
    let annotatedtext: IAnnotatedtext = { annotation: [] };
    switch (document.languageId) {
      case Constants.LANGUAGE_ID_MARKDOWN:
        annotatedtext = this.buildAnnotatedMarkdown(document.getText());
        break;
      case Constants.LANGUAGE_ID_MDX:
        annotatedtext = this.buildAnnotatedMarkdown(document.getText());
        break;
      case Constants.LANGUAGE_ID_HTML:
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
      if (document.languageId === Constants.LANGUAGE_ID_MARKDOWN) {
        const annotatedMarkdown: string = JSON.stringify(
          this.buildAnnotatedMarkdown(document.getText()),
        );
        this.lintAnnotatedText(document, annotatedMarkdown);
      } else if (document.languageId === Constants.LANGUAGE_ID_HTML) {
        const annotatedHTML: string = JSON.stringify(
          this.buildAnnotatedHTML(document.getText()),
        );
        this.lintAnnotatedText(document, annotatedHTML);
      } else {
        this.lintDocumentAsPlainText(document);
      }
    }
  }

  // Perform Lint on Document As Plain Text
  public lintDocumentAsPlainText(document: TextDocument): void {
    const annotatedPlaintext: string = JSON.stringify(
      this.buildAnnotatedPlaintext(document.getText()),
    );
    this.lintAnnotatedText(document, annotatedPlaintext);
  }

  // Lint Annotated Text
  public lintAnnotatedText(
    document: TextDocument,
    annotatedText: string,
  ): void {
    const ltPostDataDict: Record<string, string> = this.getPostDataTemplate();
    ltPostDataDict.data = annotatedText;
    this.callLanguageTool(document, ltPostDataDict);
  }

  // Apply smart formatting to annotated text.
  public smartFormatAnnotatedtext(annotatedtext: IAnnotatedtext): string {
    let newText = "";
    // Only run substitutions on text annotations.
    annotatedtext.annotation.forEach((annotation) => {
      if (annotation.text) {
        newText += annotation.text
          .replace(/"(?=[\w'‘])/g, QuotesFormattingProvider.startDoubleQuote)
          .replace(/'(?=[\w"“])/g, QuotesFormattingProvider.startSingleQuote)
          .replace(
            /([\w.!?%,'’])"/g,
            "$1" + QuotesFormattingProvider.endDoubleQuote,
          )
          .replace(
            /([\w.!?%,"”])'/g,
            "$1" + QuotesFormattingProvider.endSingleQuote,
          )
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
  private getPostDataTemplate(): Record<string, string> {
    const ltPostDataTemplate: Record<string, string> = {};
    this.configManager.getServiceParameters().forEach((value, key) => {
      ltPostDataTemplate[key] = value;
    });
    return ltPostDataTemplate;
  }

  // Call to LanguageTool Service
  private callLanguageTool(
    document: TextDocument,
    ltPostDataDict: Record<string, string>,
  ): void {
    const url = this.configManager.getUrl();
    if (url) {
      const formBody = Object.keys(ltPostDataDict)
        .map(
          (key: string) =>
            encodeURIComponent(key) +
            "=" +
            encodeURIComponent(ltPostDataDict[key]),
        )
        .join("&");

      const options: Fetch.RequestInit = {
        body: formBody,
        headers: {
          "Accepts": "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        method: "POST",
      };
      Fetch.default(url, options)
        .then((res) => res.json())
        .then((json) => this.suggest(document, json))
        .catch((err) => {
          Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
            "Error connecting to " + url,
          );
          Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(err);
        });
    } else {
      Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
        "No LanguageTool URL provided. Please check your settings and try again.",
      );
      Constants.EXTENSION_OUTPUT_CHANNEL.show(true);
    }
  }

  // Convert LanguageTool Suggestions into QuickFix CodeActions
  private suggest(
    document: TextDocument,
    response: ILanguageToolResponse,
  ): void {
    const matches = response.matches;
    const diagnostics: LTDiagnostic[] = [];
    matches.forEach((match: ILanguageToolMatch) => {
      const start: Position = document.positionAt(match.offset);
      const end: Position = document.positionAt(match.offset + match.length);
      const diagnosticSeverity: DiagnosticSeverity = this.configManager.getDiagnosticSeverity();
      const diagnosticRange: Range = new Range(start, end);
      const diagnosticMessage: string = match.message;
      const diagnostic: LTDiagnostic = new LTDiagnostic(
        diagnosticRange,
        diagnosticMessage,
        diagnosticSeverity,
      );
      diagnostic.source = Constants.EXTENSION_DIAGNOSTIC_SOURCE;
      diagnostic.match = match;
      if (Linter.isSpellingRule(match.rule.id)) {
        if (!this.configManager.isHideRuleIds()) {
          diagnostic.code = match.rule.id;
        }
      } else {
        diagnostic.code = {
          target: this.configManager.getRuleUrl(match.rule.id),
          value: this.configManager.isHideRuleIds()
            ? Constants.SERVICE_RULE_URL_GENERIC_LABEL
            : match.rule.id,
        };
      }
      diagnostics.push(diagnostic);
      if (
        Linter.isSpellingRule(match.rule.id) &&
        this.configManager.isIgnoredWord(document.getText(diagnostic.range)) &&
        this.configManager.showIgnoredWordHints()
      ) {
        diagnostic.severity = DiagnosticSeverity.Hint;
      }
    });
    this.diagnosticCollection.set(document.uri, diagnostics);
  }

  // Get CodeActions for Spelling Rules
  private getSpellingRuleActions(
    document: TextDocument,
    diagnostic: LTDiagnostic,
  ): CodeAction[] {
    const actions: CodeAction[] = [];
    const match: ILanguageToolMatch | undefined = diagnostic.match;
    const word: string = document.getText(diagnostic.range);
    if (this.configManager.isIgnoredWord(word)) {
      if (this.configManager.showIgnoredWordHints()) {
        if (this.configManager.isGloballyIgnoredWord(word)) {
          const actionTitle: string =
            "Remove '" + word + "' from always ignored words.";
          const action: CodeAction = new CodeAction(
            actionTitle,
            CodeActionKind.QuickFix,
          );
          action.command = {
            arguments: [word],
            command: "languagetoolLinter.removeGloballyIgnoredWord",
            title: actionTitle,
          };
          action.diagnostics = [];
          action.diagnostics.push(diagnostic);
          actions.push(action);
        }
        if (this.configManager.isWorkspaceIgnoredWord(word)) {
          const actionTitle: string =
            "Remove '" + word + "' from Workspace ignored words.";
          const action: CodeAction = new CodeAction(
            actionTitle,
            CodeActionKind.QuickFix,
          );
          action.command = {
            arguments: [word],
            command: "languagetoolLinter.removeWorkspaceIgnoredWord",
            title: actionTitle,
          };
          action.diagnostics = [];
          action.diagnostics.push(diagnostic);
          actions.push(action);
        }
      }
    } else {
      const usrIgnoreActionTitle: string = "Always ignore '" + word + "'";
      const usrIgnoreAction: CodeAction = new CodeAction(
        usrIgnoreActionTitle,
        CodeActionKind.QuickFix,
      );
      usrIgnoreAction.command = {
        arguments: [word],
        command: "languagetoolLinter.ignoreWordGlobally",
        title: usrIgnoreActionTitle,
      };
      usrIgnoreAction.diagnostics = [];
      usrIgnoreAction.diagnostics.push(diagnostic);
      actions.push(usrIgnoreAction);
      if (workspace !== undefined) {
        const wsIgnoreActionTitle: string =
          "Ignore '" + word + "' in Workspace";
        const wsIgnoreAction: CodeAction = new CodeAction(
          wsIgnoreActionTitle,
          CodeActionKind.QuickFix,
        );
        wsIgnoreAction.command = {
          arguments: [word],
          command: "languagetoolLinter.ignoreWordInWorkspace",
          title: wsIgnoreActionTitle,
        };
        wsIgnoreAction.diagnostics = [];
        wsIgnoreAction.diagnostics.push(diagnostic);
        actions.push(wsIgnoreAction);
      }
      if (match) {
        this.getReplacementActions(
          document,
          diagnostic,
          match.replacements,
        ).forEach((action: CodeAction) => {
          actions.push(action);
        });
      }
    }
    return actions;
  }

  // Get all Rule CodeActions
  private getRuleActions(
    document: TextDocument,
    diagnostic: LTDiagnostic,
  ): CodeAction[] {
    const match: ILanguageToolMatch | undefined = diagnostic.match;
    const actions: CodeAction[] = [];
    if (match) {
      this.getReplacementActions(
        document,
        diagnostic,
        match.replacements,
      ).forEach((action: CodeAction) => {
        actions.push(action);
      });
    }
    return actions;
  }

  // Get all edit CodeActions based on Replacements
  private getReplacementActions(
    document: TextDocument,
    diagnostic: Diagnostic,
    replacements: ILanguageToolReplacement[],
  ): CodeAction[] {
    const actions: CodeAction[] = [];
    replacements.forEach((replacement: ILanguageToolReplacement) => {
      const actionTitle: string = "'" + replacement.value + "'";
      const action: CodeAction = new CodeAction(
        actionTitle,
        CodeActionKind.QuickFix,
      );
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
