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

// import * as execa from "execa";
import * as glob from "glob";
import * as path from "path";
// import * as portfinder from "portfinder";
import {
  ConfigurationChangeEvent,
  ConfigurationTarget,
  DiagnosticSeverity,
  Disposable,
  ExtensionContext,
  TextDocument,
  Uri,
  window,
  workspace,
  WorkspaceConfiguration,
} from "vscode";
import * as Constants from "./constants";
import { ManagedLanguageTool } from "../languagetool/managed";

export class ConfigurationManager implements Disposable {
  private config: WorkspaceConfiguration;
  private serviceUrl: string | null = null;
  private serviceParameters: Map<string, string> | null = null;
  readonly context: ExtensionContext;
  // private process: execa.ExecaChildProcess | undefined;
  private managedService: ManagedLanguageTool | undefined;

  // Constructor
  constructor(context: ExtensionContext) {
    this.config = workspace.getConfiguration(Constants.CONFIGURATION_ROOT);
    this.context = context;
  }

  // Public instance methods

  public async init(): Promise<void> {
    await this.startManagedService()
      .then((managedServiceUrl) => {
        this.serviceUrl = managedServiceUrl;
      })
      .then(() => {
        this.buildServiceParameters().then(
          (parameters) => (this.serviceParameters = parameters),
        );
      });
    return Promise.resolve();
  }

  public async dispose(): Promise<void> {
    await this.stopManagedService();
  }

  public async reloadConfiguration(
    event: ConfigurationChangeEvent,
  ): Promise<void> {
    // Refresh config
    this.config = workspace.getConfiguration(Constants.CONFIGURATION_ROOT);
    // Changed service type
    if (event.affectsConfiguration("languageToolLinter.serviceType")) {
      Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
        "** SERVICE_TYPE Changed: " + this.getServiceType(),
      );
      switch (this.getServiceType()) {
        case Constants.SERVICE_TYPE_MANAGED:
          await this.startManagedService()
            .then((managedServiceUrl) => {
              this.serviceUrl = managedServiceUrl;
            })
            .then(() => {
              this.buildServiceParameters().then(
                (parameters) => (this.serviceParameters = parameters),
              );
            });
          break;
        default:
          this.stopManagedService();
          break;
      }
    }
    // Changed settings for managed service
    if (
      this.getServiceType() === Constants.SERVICE_TYPE_MANAGED &&
      (event.affectsConfiguration("languageToolLinter.managed.classPath") ||
        event.affectsConfiguration("languageToolLinter.managed.jarFile") ||
        event.affectsConfiguration("languageToolLinter.managed.portMinimum") ||
        event.affectsConfiguration("languageToolLinter.managed.portMaximum"))
    ) {
      Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
        "** Managed Service settings changed.",
      );
      await this.startManagedService()
        .then((managedServiceUrl) => {
          this.serviceUrl = managedServiceUrl;
        })
        .then(() => {
          this.buildServiceParameters().then(
            (parameters) => (this.serviceParameters = parameters),
          );
        });
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
    // Refresh service parameters
    await this.buildServiceParameters().then(
      (parameters) => (this.serviceParameters = parameters),
    );
    // Refresh service url
    this.serviceUrl = this.findServiceUrl(this.getServiceType()) as string;
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

  public getUrl(): string | undefined {
    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
      "Service URL: " + this.serviceUrl,
    );
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

  public getClassPath(): string {
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

  // Stop the managed service
  public async stopManagedService(): Promise<void> {
    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
      "manager.stopManagedService() called...",
    );
    if (this.managedService) {
      await this.managedService.dispose();
    }
    // if (this.process) {
    //   Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
    //     "Closing managed service server.",
    //   );
    //   this.process.cancel();
    //   this.process = undefined;
    // }
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
  private findServiceUrl(serviceType: string): string | undefined {
    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
      "manager.findServiceUrl called...",
    );
    switch (serviceType) {
      case Constants.SERVICE_TYPE_EXTERNAL: {
        const url = this.getExternalUrl() + Constants.SERVICE_CHECK_PATH;
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
          "    found exteral: " + url,
        );
        return url;
      }
      case Constants.SERVICE_TYPE_MANAGED: {
        if (this.managedService && this.managedService.getPort()) {
          const url = this.managedService.getServiceUrl();
          Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
            "    found managed: " + url,
          );
          return url;
        } else {
          return undefined;
        }
      }
      case Constants.SERVICE_TYPE_PUBLIC: {
        const url = Constants.SERVICE_PUBLIC_URL + Constants.SERVICE_CHECK_PATH;
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
          "    found public: " + url,
        );
        return url;
      }
      default: {
        return undefined;
      }
    }
  }

  private async buildServiceParameters(): Promise<Map<string, string>> {
    const config: WorkspaceConfiguration = this.config;
    const parameters: Map<string, string> = new Map();
    Constants.SERVICE_PARAMETERS.forEach((ltKey) => {
      const configKey: string = "languageTool." + ltKey;
      const value: string | undefined = config.get(configKey);
      if (value) {
        parameters.set(ltKey, value);
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(ltKey + ": " + value);
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

  // private setManagedServicePort(port: number): void {
  //   this.context.workspaceState.update("managedPort", port);
  // }

  // private getManagedServicePort(): number | undefined {
  //   return this.context.workspaceState.get("managedPort");
  // }

  private getExternalUrl(): string | undefined {
    return this.get("external.url");
  }

  private get(key: string): string | undefined {
    return this.config.get(key);
  }

  private getMinimumPort(): number {
    return this.config.get("managed.portMinimum") as number;
  }

  private getMaximumPort(): number {
    return this.config.get("managed.portMaximum") as number;
  }

  private async startManagedService(): Promise<string> {
    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
      "manager.startManagedService() called...",
    );
    if (this.getServiceType() === Constants.SERVICE_TYPE_MANAGED) {
      Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
        "found service type: " + this.getServiceType(),
      );
      if (this.managedService) {
        await this.managedService.stopService();
      } else {
        this.managedService = new ManagedLanguageTool();
      }
      await this.managedService
        .startService(
          this.getClassPath(),
          this.getMinimumPort(),
          this.getMaximumPort(),
          Constants.EXTENSION_OUTPUT_CHANNEL,
        )
        .then((managedServiceUrl) => {
          Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
            "    managed service url: " + managedServiceUrl,
          );
          this.serviceUrl = managedServiceUrl;
        });
    }
    return Promise.resolve(this.serviceUrl as string);
  }

  // Save words to settings
  private saveIgnoredWords(
    words: Set<string>,
    section: string,
    configurationTarget: ConfigurationTarget,
  ): void {
    const wordArray: string[] = Array.from(words)
      .map((word) => word.toLowerCase())
      .sort();
    this.config.update(section, wordArray, configurationTarget);
  }

  // Save word to User Level ignored word list.
  private saveGloballyIgnoredWords(globallyIgnoredWords: Set<string>): void {
    this.saveIgnoredWords(
      globallyIgnoredWords,
      Constants.CONFIGURATION_GLOBAL_IGNORED_WORDS,
      ConfigurationTarget.Global,
    );
  }
  // Save word to Workspace Level ignored word list.
  private saveWorkspaceIgnoredWords(workspaceIgnoredWords: Set<string>): void {
    this.saveIgnoredWords(
      workspaceIgnoredWords,
      Constants.CONFIGURATION_WORKSPACE_IGNORED_WORDS,
      ConfigurationTarget.Workspace,
    );
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
