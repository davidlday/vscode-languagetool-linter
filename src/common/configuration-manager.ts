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

 import * as execa from "execa";
import * as glob from "glob";
import * as path from "path";
import * as portfinder from "portfinder";
import {
  ConfigurationChangeEvent, ConfigurationTarget, DiagnosticSeverity, Disposable,
  TextDocument, window, workspace, WorkspaceConfiguration,
} from "vscode";
import * as Constants from "./constants";

export class ConfigurationManager implements Disposable {

  // Configuration Strings
  public static CONFIGURATION_ROOT: string = "languageToolLinter";
  public static CONFIGURATION_GLOBAL_IGNORED_WORDS: string = "languageTool.ignoredWordsGlobal";
  public static CONFIGURATION_WORKSPACE_IGNORED_WORDS: string = "languageTool.ignoredWordsInWorkspace";
  public static CONFIGURATION_IGNORED_WORD_HINT: string = "languageTool.ignoredWordHint";
  public static CONFIGURATION_DOCUMENT_LANGUAGE_IDS: string[] = [
    Constants.MARKDOWN,
    Constants.HTML,
    Constants.PLAINTEXT,
  ];

  // LanguageTool Services
  public static SERVICE_PUBLIC_URL = "https://languagetool.org/api";
  public static SERVICE_CHECK_PATH = "/v2/check";
  public static SERVICE_TYPE_EXTERNAL = "external";
  public static SERVICE_TYPE_MANAGED = "managed";
  public static SERVICE_TYPE_PUBLIC = "public";
  public static SERVICE_TYPES: string[] = [
    ConfigurationManager.SERVICE_TYPE_EXTERNAL,
    ConfigurationManager.SERVICE_TYPE_MANAGED,
    ConfigurationManager.SERVICE_TYPE_PUBLIC,
  ];
  public static SERVICE_PARAMETERS: string[] = [
    "language",
    "motherTongue",
    "preferredVariants",
    "disabledCategories",
    "disabledRules",
  ];

  // Private Members
  private config: WorkspaceConfiguration;
  private serviceUrl: string | undefined;
  private managedPort: number | undefined;
  private process: execa.ExecaChildProcess | undefined;
  private globallyIgnoredWords: Set<string>;
  private workspaceIgnoredWords: Set<string>;

  // Constructor
  constructor() {
    this.config = workspace.getConfiguration(ConfigurationManager.CONFIGURATION_ROOT);
    this.serviceUrl = this.findServiceUrl(this.getServiceType());
    this.startManagedService();
    this.globallyIgnoredWords = this.getGloballyIgnoredWords();
    this.workspaceIgnoredWords = this.getWorkspaceIgnoredWords();
  }

  // Public instance methods

  public dispose(): void {
    this.stopManagedService();
  }

  public reloadConfiguration(event: ConfigurationChangeEvent) {
    this.serviceUrl = this.findServiceUrl(this.getServiceType());
    // Changed service type
    if (event.affectsConfiguration("languageToolLinter.serviceType")) {
      switch (this.getServiceType()) {
        case ConfigurationManager.SERVICE_TYPE_MANAGED:
          this.startManagedService();
          break;
        default:
          this.stopManagedService();
          break;
      }
    }
    // Changed class path for managed service
    if (this.getServiceType() === ConfigurationManager.SERVICE_TYPE_MANAGED
      && (event.affectsConfiguration("languageToolLinter.managed.classPath")
        || event.affectsConfiguration("languageToolLinter.managed.jarFile")
        || event.affectsConfiguration("languageToolLinter.managed.portMinimum")
        || event.affectsConfiguration("languageToolLinter.managed.portMaximum"))) {
      this.startManagedService();
    }
    // Only allow preferred variants when language === auto
    if (event.affectsConfiguration("languageToolLinter.languageTool.preferredVariants")
      || event.affectsConfiguration("languageToolLinter.languageTool.language")) {
      if (this.config.get("languageTool.language") !== "auto"
        && this.config.get("languageTool.preferredVariants", "") !== "") {
        window.showErrorMessage("Cannot use preferred variants unless language is set to auto. Please review your configuration settings for LanguageTool.");
      }
    }
    this.globallyIgnoredWords = this.getGloballyIgnoredWords();
    // Globally Ignored Words updated in settings
    if (event.affectsConfiguration("languageToolLinter.languageTool.ignoredWordsGlobal")
      && this.globallyIgnoredWords !== this.getGloballyIgnoredWords()) {
      this.saveGloballyIgnoredWords();
    }
    this.workspaceIgnoredWords = this.getWorkspaceIgnoredWords();
    // Workspace Ignored Words updated in settings
    if (event.affectsConfiguration("languageToolLinter.languageTool.ignoredWordsInWorkspace")
      && this.workspaceIgnoredWords !== this.getWorkspaceIgnoredWords()) {
      this.saveWorkspaceIgnoredWords();
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
    if (document.uri.scheme === "file") {
      return (ConfigurationManager.CONFIGURATION_DOCUMENT_LANGUAGE_IDS.indexOf(document.languageId) > -1);
    }
    return false;
  }

  public getServiceType(): string {
    return this.get("serviceType") as string;
  }

  public getServiceParameters(): Map<string, string> {
    const config: WorkspaceConfiguration = this.config;
    const parameters: Map<string, string> = new Map();
    ConfigurationManager.SERVICE_PARAMETERS.forEach((ltKey) => {
      const configKey: string = "languageTool." + ltKey;
      const value: string | undefined = config.get(configKey);
      if (value) {
        parameters.set(ltKey, value);
      }
    });
    return parameters;
  }

  public getUrl(): string | undefined {
    return this.serviceUrl;
  }

  public isHideDiagnosticsOnChange(): boolean {
    return this.config.get("hideDiagnosticsOnChange") as boolean;
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
      window.showWarningMessage('"LanguageTool Linter > Diagnostic Severity" is unknown. Defaulting to "Warning".');
      return DiagnosticSeverity.Warning;
    }
  }

  public getClassPath(): string {
    const jarFile: string = this.get("managed.jarFile") as string;
    const classPath: string = this.get("managed.classPath") as string;
    const classPathFiles: string[] = [];
    // DEPRECATED
    if (jarFile !== "") {
      window.showWarningMessage('"LanguageTool Linter > Managed: Jar File" is deprecated. Please use "LanguageTool > Managed: Class Path" instead.');
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
      Constants.OUTPUT_CHANNEL.appendLine("Closing managed service server.");
      this.process.cancel();
      this.process = undefined;
    }
  }

  // Manage Ignored Words Lists
  public isIgnoredWord(word: string): boolean {
    return this.isGloballyIgnoredWord(word) || this.isWorkspaceIgnoredWord(word);
  }

  // Is word ignored at the User Level?
  public isGloballyIgnoredWord(word: string): boolean {
    return this.globallyIgnoredWords.has(word.toLowerCase());
  }

  // Is word ignored at the Workspace Level?
  public isWorkspaceIgnoredWord(word: string): boolean {
    return this.workspaceIgnoredWords.has(word.toLowerCase());
  }

  // Add word to User Level ignored word list.
  public ignoreWordGlobally(word: string): void {
    const lowerCaseWord: string = word.toLowerCase();
    if (!this.isGloballyIgnoredWord(lowerCaseWord)) {
      this.globallyIgnoredWords.add(lowerCaseWord);
      this.saveGloballyIgnoredWords();
    }
  }

  // Add word to Workspace Level ignored word list.
  public ignoreWordInWorkspace(word: string): void {
    const lowerCaseWord: string = word.toLowerCase();
    if (!this.isWorkspaceIgnoredWord(lowerCaseWord)) {
      this.workspaceIgnoredWords.add(lowerCaseWord);
      this.saveWorkspaceIgnoredWords();
    }
  }

  // Remove word from User Level ignored word list.
  public removeGloballyIgnoredWord(word: string): void {
    const lowerCaseWord: string = word.toLowerCase();
    if (this.isGloballyIgnoredWord(lowerCaseWord)) {
      this.globallyIgnoredWords.delete(lowerCaseWord);
      this.saveGloballyIgnoredWords();
    }
  }

  // Remove word from Workspace Level ignored word list.
  public removeWorkspaceIgnoredWord(word: string): void {
    const lowerCaseWord: string = word.toLowerCase();
    if (this.isWorkspaceIgnoredWord(lowerCaseWord)) {
      this.workspaceIgnoredWords.delete(lowerCaseWord);
      this.saveWorkspaceIgnoredWords();
    }
  }

  // Show hints for ignored words?
  public showIgnoredWordHints(): boolean {
    return this.config.get(ConfigurationManager.CONFIGURATION_IGNORED_WORD_HINT) as boolean;
  }

  // Private instance methods

  private findServiceUrl(serviceType: string): string | undefined {
    switch (serviceType) {
      case ConfigurationManager.SERVICE_TYPE_EXTERNAL:
        return this.getExternalUrl() + ConfigurationManager.SERVICE_CHECK_PATH;
      case ConfigurationManager.SERVICE_TYPE_MANAGED:
        const port = this.getManagedServicePort();
        if (port) {
          return "http://localhost:" + this.getManagedServicePort() + ConfigurationManager.SERVICE_CHECK_PATH;
        } else {
          return undefined;
        }
      case ConfigurationManager.SERVICE_TYPE_PUBLIC:
        return ConfigurationManager.SERVICE_PUBLIC_URL + ConfigurationManager.SERVICE_CHECK_PATH;
      default:
        return undefined;
    }
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
    if (this.getServiceType() === ConfigurationManager.SERVICE_TYPE_MANAGED) {
      const classpath: string = this.getClassPath();
      const minimumPort: number = this.getMinimumPort();
      const maximumPort: number = this.getMaximumPort();
      this.stopManagedService();
      if (minimumPort > maximumPort) {
        window.showWarningMessage("LanguageTool Linter - The minimum port is greater than the maximum port. Cancelling start of managed service. Please adjust your settings and try again.");
      } else {
        portfinder.getPort({ host: "127.0.0.1", port: minimumPort, stopPort: maximumPort }, (error: any, port: number) => {
          if (error) {
            Constants.OUTPUT_CHANNEL.appendLine("Error getting open port: " + error.message);
            Constants.OUTPUT_CHANNEL.show(true);
          } else {
            this.setManagedServicePort(port);
            const args: string[] = [
              "-cp",
              classpath,
              "org.languagetool.server.HTTPServer",
              "--port",
              port.toString(),
            ];
            Constants.OUTPUT_CHANNEL.appendLine("Starting managed service.");
            (this.process = execa("java", args)).catch((err: any) => {
              if (err.isCanceled) {
                Constants.OUTPUT_CHANNEL.appendLine("Managed service process stopped.");
              } else if (err.failed) {
                Constants.OUTPUT_CHANNEL.appendLine("Managed service command failed: " + err.command);
                Constants.OUTPUT_CHANNEL.appendLine("Error Message: " + err.message);
                Constants.OUTPUT_CHANNEL.show(true);
              }
            });
            this.process.stderr.addListener("data", (data: any) => {
              Constants.OUTPUT_CHANNEL.appendLine(data);
              Constants.OUTPUT_CHANNEL.show(true);
            });
            this.process.stdout.addListener("data", (data: any) => {
              Constants.OUTPUT_CHANNEL.appendLine(data);
            });
            this.serviceUrl = this.findServiceUrl(this.getServiceType());
          }
        });
      }
    }
  }

  // Save words to settings
  private saveIgnoredWords(words: Set<string>, section: string, configurationTarget: ConfigurationTarget): void {
    const wordArray: string[] = Array.from(words).map((word) => word.toLowerCase()).sort();
    Constants.OUTPUT_CHANNEL.append(wordArray.join(":"));
    this.config.update(section, wordArray, configurationTarget);
  }

  // Get Globally ingored words from settings.
  private getGloballyIgnoredWords(): Set<string> {
    return new Set<string>(this.config.get<string[]>(ConfigurationManager.CONFIGURATION_GLOBAL_IGNORED_WORDS));
  }

  // Save word to User Level ignored word list.
  private saveGloballyIgnoredWords(): void {
    this.saveIgnoredWords(this.globallyIgnoredWords, ConfigurationManager.CONFIGURATION_GLOBAL_IGNORED_WORDS, ConfigurationTarget.Global);
  }

  // Get Workspace ignored words from settings.
  private getWorkspaceIgnoredWords(): Set<string> {
    return new Set<string>(this.config.get<string[]>(ConfigurationManager.CONFIGURATION_WORKSPACE_IGNORED_WORDS));
  }

  // Save word to Workspace Level ignored word list.
  private saveWorkspaceIgnoredWords(): void {
    this.saveIgnoredWords(this.workspaceIgnoredWords, ConfigurationManager.CONFIGURATION_WORKSPACE_IGNORED_WORDS, ConfigurationTarget.Workspace);
  }

}
