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

import { DocumentSelector, OutputChannel, window } from "vscode";

// General Extension
export const EXTENSION_TIMEOUT_MS = 500;
export const EXTENSION_OUTPUT_CHANNEL: OutputChannel = window.createOutputChannel(
  "LanguageTool Linter",
);
export const EXTENSION_DISPLAY_NAME = "languagetool-linter";
export const EXTENSION_DIAGNOSTIC_SOURCE = "LanguageTool";

// Programming Language IDs
export const LANGUAGE_ID_MDX = "mdx";
export const LANGUAGE_ID_MARKDOWN = "markdown";
export const LANGUAGE_ID_HTML = "html";

// File Scheme
export const SCHEME_FILE = "file";
export const SCHEME_UNTITLED = "untitled";

// Document Selectors
export const SELECTOR_MARKDOWN_FILE: DocumentSelector = {
  language: LANGUAGE_ID_MARKDOWN,
  scheme: SCHEME_FILE,
};
export const SELECTOR_MARKDOWN_UNTITLED: DocumentSelector = {
  language: LANGUAGE_ID_MARKDOWN,
  scheme: SCHEME_UNTITLED,
};
export const SELECTOR_HTML_FILE: DocumentSelector = {
  language: LANGUAGE_ID_HTML,
  scheme: SCHEME_FILE,
};
export const SELECTOR_HTML_UNTITLED: DocumentSelector = {
  language: LANGUAGE_ID_HTML,
  scheme: SCHEME_UNTITLED,
};

export const DOCUMENT_SELECTORS: DocumentSelector[] = [
  SELECTOR_MARKDOWN_FILE,
  SELECTOR_MARKDOWN_UNTITLED,
  SELECTOR_HTML_FILE,
  SELECTOR_HTML_UNTITLED,
];

// Configuration Strings
export const CONFIGURATION_ROOT = "languageToolLinter";
export const CONFIGURATION_GLOBAL_IGNORED_WORDS =
  "languageTool.ignoredWordsGlobal";
export const CONFIGURATION_WORKSPACE_IGNORED_WORDS =
  "languageTool.ignoredWordsInWorkspace";
export const CONFIGURATION_IGNORED_WORD_HINT = "languageTool.ignoredWordHint";
export const CONFIGURATION_DOCUMENT_LANGUAGE_IDS: string[] = [
  LANGUAGE_ID_MARKDOWN,
  LANGUAGE_ID_HTML,
];
export const CONFIGURATION_PLAIN_TEXT_ENABLED = "plainText.enabled";
export const CONFIGURATION_PLAIN_TEXT_IDS = "plainText.languageIds";
export const CONFIGURATION_LANGUAGE = "language";

// LanguageTool Services
export const SERVICE_PUBLIC_URL = "https://languagetool.org/api";
export const SERVICE_CHECK_PATH = "/v2/check";
export const SERVICE_TYPE_EXTERNAL = "external";
export const SERVICE_TYPE_MANAGED = "managed";
export const SERVICE_TYPE_PUBLIC = "public";
export const SERVICE_TYPES: string[] = [
  SERVICE_TYPE_EXTERNAL,
  SERVICE_TYPE_MANAGED,
  SERVICE_TYPE_PUBLIC,
];
export const SERVICE_PARAMETERS: string[] = [
  "language",
  "motherTongue",
  "preferredVariants",
  "disabledCategories",
  "disabledRules",
];
export const SERVICE_RULE_BASE_URI =
  "https://community.languagetool.org/rule/show/";
export const SERVICE_RULE_URL_LANG_DEFAULT = "en";
export const SERVICE_RULE_URL_GENERIC_LABEL = "details";
