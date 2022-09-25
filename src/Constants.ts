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

import { OutputChannel, window } from "vscode";

// General Extension
export const EXTENSION_TIMEOUT_MS = 500;
export const EXTENSION_OUTPUT_CHANNEL: OutputChannel =
  window.createOutputChannel("LanguageTool Linter");
export const EXTENSION_DISPLAY_NAME = "languagetool-linter";
export const EXTENSION_DIAGNOSTIC_SOURCE = "LanguageTool";

// Programming Language IDs
export const LANGUAGE_ID_HTML = "html";
export const LANGUAGE_ID_MARKDOWN = "markdown";
export const LANGUAGE_ID_MDX = "mdx";

export const SUPPORTED_LANGUAGE_IDS: string[] = [
  LANGUAGE_ID_HTML,
  LANGUAGE_ID_MARKDOWN,
  LANGUAGE_ID_MDX,
];

// File Scheme
export const SCHEME_FILE = "file";
export const SCHEME_UNTITLED = "untitled";

// Configuration Strings
export const CONFIGURATION_ROOT = "languageToolLinter";
export const CONFIGURATION_GLOBAL_IGNORED_WORDS =
  CONFIGURATION_ROOT + ".ignoredWordsGlobal";
export const CONFIGURATION_WORKSPACE_IGNORED_WORDS =
  CONFIGURATION_ROOT + ".ignoredWordsInWorkspace";
export const CONFIGURATION_IGNORED_WORD_HINT =
  CONFIGURATION_ROOT + ".ignoredWordHint";
export const CONFIGURATION_DOCUMENT_LANGUAGE_IDS: string[] = [
  LANGUAGE_ID_HTML,
  LANGUAGE_ID_MARKDOWN,
  LANGUAGE_ID_MDX,
];
export const CONFIGURATION_LANGUAGE = "language";

// Plain Text Language ID Options
const CONFIGURATION_PLAIN_TEXT = CONFIGURATION_ROOT + ".plainText";
export const CONFIGURATION_PLAIN_TEXT_ENABLED =
  CONFIGURATION_PLAIN_TEXT + ".plainText.enabled";
export const CONFIGURATION_PLAIN_TEXT_IDS =
  CONFIGURATION_PLAIN_TEXT + ".plainText.languageIds";

// PodmanService Configuration Items
const CONFIGURATION_PODMAN = CONFIGURATION_ROOT + ".podman";
export const CONFIGURATION_PODMAN_IMAGE_NAME =
  CONFIGURATION_PODMAN + ".imageName";
export const CONFIGURATION_PODMAN_CONTAINER_NAME =
  CONFIGURATION_PODMAN + ".containerName";
export const CONFIGURATION_PODMAN_IP = CONFIGURATION_PODMAN + ".ip";
export const CONFIGURATION_PODMAN_PORT = CONFIGURATION_PODMAN + ".port";
export const CONFIGURATION_PODMAN_HARDSTOP = CONFIGURATION_PODMAN + ".hardStop";

// PublicService Configuration Items
// Placeholder for username / apiKey
export const SERVICE_PUBLIC_URL = "https://languagetool.org/api";

// ManagedService Configuration Items
const CONFIGURATION_MANAGED = CONFIGURATION_ROOT + ".managed";
export const CONFIGURATION_MANAGED_JAR_FILE =
  CONFIGURATION_MANAGED + ".jarFile";
export const CONFIGURATION_MANAGED_CLASS_PATH =
  CONFIGURATION_MANAGED + ".classPath";
export const CONFIGURATION_MANAGED_PORT_MINIMUM =
  CONFIGURATION_MANAGED + ".portMinimum";
export const CONFIGURATION_MANAGED_PORT_MAXIMUM =
  CONFIGURATION_MANAGED + ".portMaximum";
export const SERVICE_MANAGED_IP = "127.0.0.1";

// ExternalService Configuration Items
const CONFIGURATION_EXTERNAL = CONFIGURATION_ROOT + ".external";
export const CONFIGURATION_EXTERNAL_URL = CONFIGURATION_EXTERNAL + ".url";

// LanguageTool Configuration Items
export const CONFIGURATION_LT = CONFIGURATION_ROOT + ".languageTool";
export const CONFIGURATION_LT_DISABLED_RULES =
  CONFIGURATION_ROOT + ".disabledRules";
export const CONFIGURATION_LT_DISABLED_CATEGORIES =
  CONFIGURATION_ROOT + ".disabledCategories";

// LanguageTool Services
export const SERVICE_TYPE_EXTERNAL = "external";
export const SERVICE_TYPE_MANAGED = "managed";
export const SERVICE_TYPE_PODMAN = "podman";
export const SERVICE_TYPE_PUBLIC = "public";
export const SERVICE_TYPES: string[] = [
  SERVICE_TYPE_EXTERNAL,
  SERVICE_TYPE_MANAGED,
  SERVICE_TYPE_PODMAN,
  SERVICE_TYPE_PUBLIC,
];
export const SERVICE_TYPE_DEFAULT = SERVICE_TYPE_EXTERNAL;

// Service states
export const SERVICE_STATES = {
  IDLE: "idle",
  STARTING: "starting",
  RUNNING: "running",
  STOPPING: "stopping",
  STOPPED: "stopped",
  ERROR: "error",
};

// Service Parameters
export const SERVICE_PARAMETERS: string[] = [
  "language",
  "motherTongue",
  "preferredVariants",
  "disabledCategories",
  "disabledRules",
];
export const SERVICE_CHECK_PATH = "/v2/check";
export const SERVICE_RULE_BASE_URI =
  "https://community.languagetool.org/rule/show/";
export const SERVICE_RULE_URL_LANG_DEFAULT = "en";
export const SERVICE_RULE_URL_GENERIC_LABEL = "details";
