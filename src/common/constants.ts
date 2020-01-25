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

export const TIMEOUT_MS = 500;
export const OUTPUT_CHANNEL: OutputChannel = window.createOutputChannel("LanguageTool Linter");

export const MARKDOWN = "markdown";
export const HTML = "html";
export const PLAINTEXT = "plaintext";

export const MARKDOWN_FILE: DocumentSelector = { language: MARKDOWN, scheme: "file" };
export const MARKDOWN_UNTITLED: DocumentSelector = { language: MARKDOWN, scheme: "untitled" };

export const HTML_FILE: DocumentSelector = { language: HTML, scheme: "file" };
export const HTML_UNTITLED: DocumentSelector = { language: HTML, scheme: "untitled" };

export const PLAINTEXT_FILE: DocumentSelector = { language: PLAINTEXT, scheme: "file" };
export const PLAINTEXT_UNTITLED: DocumentSelector = { language: PLAINTEXT, scheme: "untitled" };
