import { DocumentSelector, OutputChannel, window } from 'vscode';

const LT_DOCUMENT_LANGUAGE_IDS: string[] = ["markdown", "html", "plaintext"];
// const LT_DOCUMENT_SCHEMES: string[] = ["file", "untitled"];
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
export const LT_OUTPUT_CHANNEL: OutputChannel = window.createOutputChannel("LanguageTool Linter");
export const LT_DOCUMENT_SELECTORS: DocumentSelector[] = [
  {language: "markdown", scheme: "file"},
  {language: "markdown", scheme: "untitled"},
  {language: "html", scheme: "file"},
  {language: "html", scheme: "untitled"},
  {language: "plaintext", scheme: "file"},
  {language: "plaintext", scheme: "untitled"}
];
