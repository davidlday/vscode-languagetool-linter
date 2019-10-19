import { DocumentSelector, OutputChannel, window } from 'vscode';

export const MARKDOWN: string = "markdown";
export const HTML: string = "html";
export const PLAINTEXT: string = "plaintext";

export const MARKDOWN_FILE: DocumentSelector = {language: MARKDOWN, scheme: "file"};
export const MARKDOWN_UNTITLED: DocumentSelector = {language: MARKDOWN, scheme: "untitled"};

export const HTML_FILE: DocumentSelector = {language: HTML, scheme: "file"};
export const HTML_UNTITLED: DocumentSelector = {language: HTML, scheme: "untitled"};

export const PLAINTEXT_FILE: DocumentSelector = {language: PLAINTEXT, scheme: "file"};
export const PLAINTEXT_UNTITLED: DocumentSelector = {language: PLAINTEXT, scheme: "untitled"};

export const LT_DOCUMENT_LANGUAGE_IDS: string[] = [MARKDOWN, HTML, PLAINTEXT];
export const LT_DOCUMENT_SELECTORS: DocumentSelector[] = [
  MARKDOWN_FILE,
  MARKDOWN_UNTITLED,
  HTML_FILE,
  HTML_UNTITLED,
  PLAINTEXT_FILE,
  PLAINTEXT_UNTITLED
];

export const LT_PUBLIC_URL: string = "https://languagetool.org/api";
export const LT_CHECK_PATH: string = "/v2/check";
export const LT_SERVICE_PARAMETERS: string[] = [
  "language",
  "motherTongue",
  "preferredVariants",
  "disabledCategories",
  "disabledRules",
  "disabledCategories"
];

export const LT_TIMEOUT_MS: number = 500;
export const LT_DIAGNOSTIC_SOURCE: string = "LanguageTool";
export const LT_DISPLAY_NAME: string = "languagetool-linter";
export const LT_OUTPUT_CHANNEL: OutputChannel = window.createOutputChannel("LanguageTool Linter");

export const LT_CONFIGURATION_ROOT: string = "languageToolLinter";

export const LT_SERVICE_EXTERNAL: string = "external";
export const LT_SERVICE_MANAGED: string = "managed";
export const LT_SERVICE_PUBLIC: string = "public";
export const LT_SERVICE_TYPES: string[] = [LT_SERVICE_EXTERNAL, LT_SERVICE_MANAGED, LT_SERVICE_PUBLIC];

