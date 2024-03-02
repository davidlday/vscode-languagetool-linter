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

import execa from "execa";
import * as glob from "glob";
import * as path from "path";
import * as portfinder from "portfinder";
import { URL } from "url";
import {
  commands,
  ConfigurationChangeEvent,
  ConfigurationTarget,
  DiagnosticSeverity,
  Disposable,
  DocumentSelector,
  TextDocument,
  Uri,
  window,
  workspace,
  WorkspaceConfiguration,
} from "vscode";
import * as Constants from "./Constants";

export class ConfigurationManager implements Disposable {
  // Private Members
  private config: WorkspaceConfiguration;
  private serviceUrl: string | undefined;
  private managedPort: number | undefined;
  private process: execa.ExecaChildProcess | undefined;
  private serviceParameters: Map<string, string> = new Map();

  // Constructor
  constructor() {
    this.config = workspace.getConfiguration(Constants.CONFIGURATION_ROOT);
    this.serviceUrl = this.findServiceUrl(this.getServiceType());
    this.startManagedService();
    this.serviceParameters = this.buildServiceParameters();
  }

  // Public instance methods

  public dispose(): void {
    this.stopManagedService();
  }

  public reloadConfiguration(event: ConfigurationChangeEvent): void {
    this.config = workspace.getConfiguration(Constants.CONFIGURATION_ROOT);
    this.serviceUrl = this.findServiceUrl(this.getServiceType());
    this.serviceParameters = this.buildServiceParameters();
    // Changed service type
    if (event.affectsConfiguration("languageToolLinter.serviceType")) {
      switch (this.getServiceType()) {
        case Constants.SERVICE_TYPE_MANAGED:
          this.startManagedService();
          break;
        default:
          this.stopManagedService();
          break;
      }
    }
    // Changed class path for managed service
    if (
      this.getServiceType() === Constants.SERVICE_TYPE_MANAGED &&
      (event.affectsConfiguration("languageToolLinter.managed.classPath") ||
        event.affectsConfiguration("languageToolLinter.managed.jarFile") ||
        event.affectsConfiguration("languageToolLinter.managed.portMinimum") ||
        event.affectsConfiguration("languageToolLinter.managed.portMaximum"))
    ) {
      this.startManagedService();
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
    // List of plaintext ids changed - need to reload
    if (event.affectsConfiguration("languageToolLinter.plainText")) {
      const action = "Reload";
      window
        .showInformationMessage(
          "The settings for linting plaintext documents have changed. \
          Please reload the window for the configuration to take effect.",
          action,
        )
        .then((selectedAction) => {
          if (selectedAction === action) {
            commands.executeCommand("workbench.action.reloadWindow");
          }
        });
    }
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

  public getDocumentSelectors(): DocumentSelector[] {
    const selectors: DocumentSelector[] = [];
    const languageIds = Constants.SUPPORTED_LANGUAGE_IDS;

    if (this.isPlainTextEnabled()) {
      const plaintextLanguageIds: string[] =
        this.config.get(Constants.CONFIGURATION_PLAIN_TEXT_IDS) || [];
      plaintextLanguageIds.forEach((languageId) => {
        languageIds.push(languageId);
      });
    }

    languageIds.forEach((languageId) => {
      const fileSelector: DocumentSelector = {
        language: languageId,
        scheme: Constants.SCHEME_FILE,
      };
      selectors.push(fileSelector);
      const untitledSelector: DocumentSelector = {
        language: languageId,
        scheme: Constants.SCHEME_UNTITLED,
      };
      selectors.push(untitledSelector);
    });
    return selectors;
  }

  public getServiceType(): string {
    return this.get("serviceType") as string;
  }

  public getServiceParameters(): Map<string, string> {
    return this.serviceParameters;
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
    return this.serviceUrl;
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

  public getDiagnosticSeverityAuto(): boolean {
    const severityAuto = this.config.get("diagnosticSeverityAuto");
    if (severityAuto === true) {
      return true
    }
    return false
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
  public stopManagedService(): void {
    if (this.process) {
      Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
        "Closing managed service server.",
      );
      this.process.cancel();
      this.process = undefined;
    }
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
    switch (serviceType) {
      case Constants.SERVICE_TYPE_EXTERNAL: {
        return this.getExternalUrl() + Constants.SERVICE_CHECK_PATH;
      }
      case Constants.SERVICE_TYPE_MANAGED: {
        const port = this.getManagedServicePort();
        if (port) {
          return (
            "http://localhost:" +
            this.getManagedServicePort() +
            Constants.SERVICE_CHECK_PATH
          );
        } else {
          return undefined;
        }
      }
      case Constants.SERVICE_TYPE_PUBLIC: {
        return Constants.SERVICE_PUBLIC_URL + Constants.SERVICE_CHECK_PATH;
      }
      default: {
        return undefined;
      }
    }
  }

  private buildServiceParameters(): Map<string, string> {
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
    // Only add user name and API key to options if set and we are using the
    // external API
    if (this.getServiceType() === Constants.SERVICE_TYPE_EXTERNAL) {
      const username = this.get("external.username");
      const apiKey = this.get("external.apiKey");
      if (username && apiKey) {
        parameters.set("username", username);
        parameters.set("apiKey", apiKey);
      }
    }
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

  private setManagedServicePort(port: number): void {
    this.managedPort = port;
  }

  private getManagedServicePort(): number | undefined {
    return this.managedPort;
  }

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

  private startManagedService(): void {
    if (this.getServiceType() === Constants.SERVICE_TYPE_MANAGED) {
      const classpath: string = this.getClassPath();
      const minimumPort: number = this.getMinimumPort();
      const maximumPort: number = this.getMaximumPort();
      this.stopManagedService();
      if (minimumPort > maximumPort) {
        window.showWarningMessage(
          "LanguageTool Linter - The minimum port is greater than the maximum port. \
          Cancelling start of managed service. Please adjust your settings and try again.",
        );
      } else {
        portfinder.getPort(
          { host: "127.0.0.1", port: minimumPort, stopPort: maximumPort },
          (error: Error, port: number) => {
            if (error) {
              Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
                "Error getting open port: " + error.message,
              );
              Constants.EXTENSION_OUTPUT_CHANNEL.show(true);
            } else {
              this.setManagedServicePort(port);
              const args: string[] = [
                "-cp",
                classpath,
                "org.languagetool.server.HTTPServer",
                "--port",
                port.toString(),
              ];
              Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
                "Starting managed service.",
              );
              (this.process = execa("java", args)).catch(
                (err: execa.ExecaError) => {
                  if (err.isCanceled) {
                    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
                      "Managed service process stopped.",
                    );
                  } else if (err.failed) {
                    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
                      "Managed service command failed: " + err.command,
                    );
                    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
                      "Error Message: " + err.message,
                    );
                    Constants.EXTENSION_OUTPUT_CHANNEL.show(true);
                  }
                },
              );
              this.process.stderr.addListener("data", (data) => {
                Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
                Constants.EXTENSION_OUTPUT_CHANNEL.show(true);
              });
              this.process.stdout.addListener("data", (data) => {
                Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
              });
              this.serviceUrl = this.findServiceUrl(this.getServiceType());
            }
          },
        );
      }
    }
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
