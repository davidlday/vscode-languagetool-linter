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

import * as glob from "glob";
import * as path from "path";
import {
  ConfigurationChangeEvent,
  ConfigurationTarget,
  DiagnosticSeverity,
  Disposable,
  ExtensionContext,
  OutputChannel,
  TextDocument,
  Uri,
  window,
  workspace,
  WorkspaceConfiguration,
} from "vscode";
import { ManagedLanguageTool } from "../languagetool/managed";
import { EmbeddedLanguageTool } from "../languagetool/embedded";
import * as Constants from "./constants";

export class ConfigurationManager implements Disposable {
  private config: WorkspaceConfiguration;
  private serviceUrl: string | undefined = undefined;
  private serviceParameters: Map<string, string> | undefined = undefined;
  readonly context: ExtensionContext;
  private managedService: ManagedLanguageTool;
  private embeddedService: EmbeddedLanguageTool;
  private logger: OutputChannel = Constants.EXTENSION_OUTPUT_CHANNEL;

  // Constructor
  constructor(context: ExtensionContext) {
    this.context = context;
    this.config = workspace.getConfiguration(Constants.CONFIGURATION_ROOT);
    this.managedService = new ManagedLanguageTool();
    this.embeddedService = new EmbeddedLanguageTool(this.context);
    this.embeddedService.init();
    this.startService();
  }

  // Public instance methods
  public async init(): Promise<string> {
    return await this.startService();
  }

  public async dispose(): Promise<void> {
    await this.stopService();
  }

  public async reloadConfiguration(
    event: ConfigurationChangeEvent,
  ): Promise<void> {
    // Refresh config
    this.config = workspace.getConfiguration(Constants.CONFIGURATION_ROOT);
    // Changed service type
    if (event.affectsConfiguration("languageToolLinter.serviceType")) {
      this.logger.appendLine(
        "** SERVICE_TYPE Changed: " + this.getServiceType(),
      );
      await this.stopService();
      await this.startService();
    }
    // Changed settings for managed service
    if (
      this.getServiceType() === Constants.SERVICE_TYPE_MANAGED &&
      (event.affectsConfiguration("languageToolLinter.managed.classPath") ||
        event.affectsConfiguration("languageToolLinter.managed.jarFile") ||
        event.affectsConfiguration("languageToolLinter.managed.portMinimum") ||
        event.affectsConfiguration("languageToolLinter.managed.portMaximum"))
    ) {
      this.logger.appendLine("** Managed Service settings changed.");
      await this.stopService();
      await this.startService();
    }
    // Only allow preferred variants when language === auto
    if (
      event.affectsConfiguration(
        "languageToolLinter.languageTool.preferredVariants",
      ) ||
      event.affectsConfiguration("languageToolLinter.languageTool.language")
    ) {
      if (
        this.config.get("languageTool.language") !== "auto" &&
        this.config.get("languageTool.preferredVariants", "") !== ""
      ) {
        window.showErrorMessage(
          "Cannot use preferred variants unless language is set to auto. \
          Please review your configuration settings for LanguageTool.",
        );
      }
    }
    return Promise.resolve();
  }

  // Smart Format on Type
  public isSmartFormatOnType(): boolean {
    return this.config.get("smartFormat.onType") as boolean;
  }

  // Smart Format on Save
  public isSmartFormatOnSave(): boolean {
    return this.config.get("smartFormat.onSave") as boolean;
  }

  // Is Language ID Supported?
  public isSupportedDocument(document: TextDocument): boolean {
    if (
      document.uri.scheme === Constants.SCHEME_FILE ||
      document.uri.scheme === Constants.SCHEME_UNTITLED
    ) {
      if (
        this.isPlainTextId(document.languageId) &&
        this.isPlainTextEnabled()
      ) {
        return true;
      } else {
        return Constants.CONFIGURATION_DOCUMENT_LANGUAGE_IDS.includes(
          document.languageId,
        );
      }
    }
    return false;
  }

  // Is Plain Text Checking Enabled?
  public isPlainTextEnabled(): boolean {
    return this.config.get(
      Constants.CONFIGURATION_PLAIN_TEXT_ENABLED,
    ) as boolean;
  }

  // Is the Language ID Considered "Plain Text"?
  public isPlainTextId(languageId: string): boolean {
    const languageIds: string[] =
      this.config.get(Constants.CONFIGURATION_PLAIN_TEXT_IDS) || [];
    return languageIds.includes(languageId);
  }

  public getServiceType(): string {
    return this.get("serviceType") as string;
  }

  public getServiceParameters(): Map<string, string> {
    return this.serviceParameters
      ? this.serviceParameters
      : new Map<string, string>();
  }

  public getRuleUrl(ruleId: string): Uri {
    const lang = this.getLanguage();
    return Uri.parse(
      Constants.SERVICE_RULE_BASE_URI + ruleId + "?lang=" + lang,
    );
  }

  public getLanguage(): string {
    const lang = this.config.get(Constants.CONFIGURATION_LANGUAGE) as string;
    if (
      this.config.inspect(Constants.CONFIGURATION_LANGUAGE)?.defaultValue ===
      lang
    ) {
      return Constants.SERVICE_RULE_URL_LANG_DEFAULT;
    } else {
      return lang;
    }
  }

  public getServiceUrl(): string {
    return this.serviceUrl ? this.serviceUrl : "";
  }

  public isHideDiagnosticsOnChange(): boolean {
    return this.config.get("hideDiagnosticsOnChange") as boolean;
  }

  public isHideRuleIds(): boolean {
    return this.config.get("hideRuleIds") as boolean;
  }

  public isLintOnChange(): boolean {
    return this.config.get("lintOnChange") as boolean;
  }

  public isLintOnOpen(): boolean {
    return this.config.get("lintOnOpen") as boolean;
  }

  public isLintOnSave(): boolean {
    return this.config.get("lintOnSave") as boolean;
  }

  public getDiagnosticSeverity(): DiagnosticSeverity {
    const severity = this.config.get("diagnosticSeverity");
    if (severity === "information") {
      return DiagnosticSeverity.Information;
    } else if (severity === "error") {
      return DiagnosticSeverity.Error;
    } else if (severity === "warning") {
      return DiagnosticSeverity.Warning;
    } else {
      window.showWarningMessage(
        '"LanguageTool Linter > Diagnostic Severity" is unknown. Defaulting to "Warning".',
      );
      return DiagnosticSeverity.Warning;
    }
  }

  private getClassPath(): string {
    const jarFile: string = this.get("managed.jarFile") as string;
    const classPath: string = this.get("managed.classPath") as string;
    const classPathFiles: string[] = [];
    // DEPRECATED
    if (jarFile !== "") {
      window.showWarningMessage(
        '"LanguageTool Linter > Managed: Jar File" is deprecated. \
        Please use "LanguageTool > Managed: Class Path" instead.',
      );
      classPathFiles.push(jarFile);
    }
    if (classPath !== "") {
      classPath.split(path.delimiter).forEach((globPattern: string) => {
        glob.sync(globPattern).forEach((match: string) => {
          classPathFiles.push(match);
        });
      });
    }
    const classPathString: string = classPathFiles.join(path.delimiter);
    return classPathString;
  }

  // Manage Ignored Words Lists
  public isIgnoredWord(word: string): boolean {
    return (
      this.isGloballyIgnoredWord(word) || this.isWorkspaceIgnoredWord(word)
    );
  }

  // Is word ignored at the User Level?
  public isGloballyIgnoredWord(word: string): boolean {
    const globallyIgnoredWords: Set<string> = this.getGloballyIgnoredWords();
    return globallyIgnoredWords.has(word.toLowerCase());
  }

  // Is word ignored at the Workspace Level?
  public isWorkspaceIgnoredWord(word: string): boolean {
    const workspaceIgnoredWords: Set<string> = this.getWorkspaceIgnoredWords();
    return workspaceIgnoredWords.has(word.toLowerCase());
  }

  // Add word to User Level ignored word list.
  public ignoreWordGlobally(word: string): void {
    const lowerCaseWord: string = word.toLowerCase();
    const globallyIgnoredWords: Set<string> = this.getGloballyIgnoredWords();
    if (!globallyIgnoredWords.has(lowerCaseWord)) {
      globallyIgnoredWords.add(lowerCaseWord);
      this.saveGloballyIgnoredWords(globallyIgnoredWords);
    }
  }

  // Add word to Workspace Level ignored word list.
  public ignoreWordInWorkspace(word: string): void {
    const lowerCaseWord: string = word.toLowerCase();
    const workspaceIgnoredWords: Set<string> = this.getWorkspaceIgnoredWords();
    if (!workspaceIgnoredWords.has(lowerCaseWord)) {
      workspaceIgnoredWords.add(lowerCaseWord);
      this.saveWorkspaceIgnoredWords(workspaceIgnoredWords);
    }
  }

  // Remove word from User Level ignored word list.
  public removeGloballyIgnoredWord(word: string): void {
    const lowerCaseWord: string = word.toLowerCase();
    const globallyIgnoredWords: Set<string> = this.getGloballyIgnoredWords();
    if (globallyIgnoredWords.has(lowerCaseWord)) {
      globallyIgnoredWords.delete(lowerCaseWord);
      this.saveGloballyIgnoredWords(globallyIgnoredWords);
    }
  }

  // Remove word from Workspace Level ignored word list.
  public removeWorkspaceIgnoredWord(word: string): void {
    const lowerCaseWord: string = word.toLowerCase();
    const workspaceIgnoredWords: Set<string> = this.getWorkspaceIgnoredWords();
    if (workspaceIgnoredWords.has(lowerCaseWord)) {
      workspaceIgnoredWords.delete(lowerCaseWord);
      this.saveWorkspaceIgnoredWords(workspaceIgnoredWords);
    }
  }

  // Show hints for ignored words?
  public showIgnoredWordHints(): boolean {
    return this.config.get(
      Constants.CONFIGURATION_IGNORED_WORD_HINT,
    ) as boolean;
  }

  // Private instance methods
  private async startService(): Promise<string> {
    this.logger.appendLine("manager.startService() called...");
    await this.buildServiceParameters().then((serviceParameters) => {
      this.serviceParameters = serviceParameters;
    });
    const serviceType = this.getServiceType();
    switch (serviceType) {
      case Constants.SERVICE_TYPE_EXTERNAL:
        {
          this.serviceUrl = (this.getExternalUrl() +
            Constants.SERVICE_CHECK_PATH) as string;
        }
        break;
      case Constants.SERVICE_TYPE_EMBEDDED:
        {
          await this.managedService.stopService();
          await this.embeddedService
            .startService(
              this.getEmbeddedMinimumPort(),
              this.getEmbeddedMaximumPort(),
            )
            .then((serviceUrl) => {
              this.serviceUrl = serviceUrl;
            });
        }
        break;
      case Constants.SERVICE_TYPE_MANAGED:
        {
          window.showWarningMessage(
            'The "Managed" service has been deprecated in favor of the "Embedded" \
            service. Please consider switching.',
          );
          this.embeddedService.stopService();
          await this.managedService
            .startService(
              this.getClassPath(),
              this.getManagedMinimumPort(),
              this.getManagedMaximumPort(),
            )
            .then((serviceUrl) => {
              this.serviceUrl = serviceUrl;
            });
        }
        break;
      case Constants.SERVICE_TYPE_PUBLIC:
        {
          this.serviceUrl =
            Constants.SERVICE_PUBLIC_URL + Constants.SERVICE_CHECK_PATH;
        }
        break;
      default: {
        return Promise.reject(`Uknown service type: ${serviceType}`);
      }
    }
    this.logger.appendLine(
      `switched to ${serviceType} service url: ${this.serviceUrl}`,
    );
    return Promise.resolve(this.serviceUrl as string);
  }

  // Stop the service
  private async stopService(): Promise<void> {
    await this.managedService.stopService();
    await this.embeddedService.stopService();
  }

  private async buildServiceParameters(): Promise<Map<string, string>> {
    const config: WorkspaceConfiguration = this.config;
    const parameters: Map<string, string> = new Map();
    Constants.SERVICE_PARAMETERS.forEach((ltKey) => {
      const configKey: string = "languageTool." + ltKey;
      const value: string | undefined = config.get(configKey);
      if (value) {
        parameters.set(ltKey, value);
        this.logger.appendLine(ltKey + ": " + value);
      }
    });
    // Make sure disabled rules and disabled categories do not contain spaces
    const CONFIG_DISABLED_RULES = "languageTool.disabledRules";
    const CONFIG_DISABLED_CATEGORIES = "languageTool.disabledCategories";
    if (this.config.has(CONFIG_DISABLED_RULES)) {
      const disabledRules: string = this.config.get(
        CONFIG_DISABLED_RULES,
      ) as string;
      if (disabledRules.split(" ").length > 1) {
        window.showWarningMessage(
          '"LanguageTool Linter > Language Tool: Disabled Rules" contains spaces. \
          Please review the setting and remove any spaces.',
        );
      }
    }
    if (this.config.has(CONFIG_DISABLED_CATEGORIES)) {
      const disabledCategories: string = this.config.get(
        CONFIG_DISABLED_CATEGORIES,
      ) as string;
      if (disabledCategories.split(" ").length > 1) {
        window.showWarningMessage(
          '"LanguageTool Linter > Language Tool: Disabled Categories" contains spaces. \
          Please review the setting and remove any spaces.',
        );
      }
    }
    return parameters;
  }

  private getExternalUrl(): string {
    return this.get("external.url") as string;
  }

  private get(key: string): string {
    return this.config.get(key) as string;
  }

  private getManagedMinimumPort(): number {
    return this.config.get("managed.portMinimum") as number;
  }

  private getManagedMaximumPort(): number {
    return this.config.get("managed.portMaximum") as number;
  }

  private getEmbeddedMinimumPort(): number {
    return this.config.get("embedded.portMinimum") as number;
  }

  private getEmbeddedMaximumPort(): number {
    return this.config.get("embedded.portMaximum") as number;
  }

  // Save words to settings
  private async saveIgnoredWords(
    words: Set<string>,
    section: string,
    configurationTarget: ConfigurationTarget,
  ): Promise<void> {
    const wordArray: string[] = Array.from(words)
      .map((word) => word.toLowerCase())
      .sort();
    this.config.update(section, wordArray, configurationTarget);
    return Promise.resolve();
  }

  // Save word to User Level ignored word list.
  private async saveGloballyIgnoredWords(
    globallyIgnoredWords: Set<string>,
  ): Promise<void> {
    this.saveIgnoredWords(
      globallyIgnoredWords,
      Constants.CONFIGURATION_GLOBAL_IGNORED_WORDS,
      ConfigurationTarget.Global,
    );
    return Promise.resolve();
  }

  // Save word to Workspace Level ignored word list.
  private async saveWorkspaceIgnoredWords(
    workspaceIgnoredWords: Set<string>,
  ): Promise<void> {
    this.saveIgnoredWords(
      workspaceIgnoredWords,
      Constants.CONFIGURATION_WORKSPACE_IGNORED_WORDS,
      ConfigurationTarget.Workspace,
    );
    return Promise.resolve();
  }

  // Get ignored words from settings.
  private getIgnoredWords(section: string): Set<string> {
    const wordArray: string[] = this.config.get<string[]>(section) as string[];
    return new Set<string>(wordArray.map((word) => word.toLowerCase()).sort());
  }

  // Get Globally ingored words from settings.
  private getGloballyIgnoredWords(): Set<string> {
    return this.getIgnoredWords(Constants.CONFIGURATION_GLOBAL_IGNORED_WORDS);
  }

  // Get Workspace ignored words from settings.
  private getWorkspaceIgnoredWords(): Set<string> {
    return this.getIgnoredWords(
      Constants.CONFIGURATION_WORKSPACE_IGNORED_WORDS,
    );
  }
}
