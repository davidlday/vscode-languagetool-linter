import { TextDocument, WorkspaceConfiguration, workspace, ConfigurationChangeEvent, Disposable, window, ExtensionContext, ConfigurationTarget } from 'vscode';
import { LT_DOCUMENT_LANGUAGE_IDS, LT_CONFIGURATION_ROOT, LT_SERVICE_PARAMETERS, LT_SERVICE_EXTERNAL, LT_CHECK_PATH, LT_SERVICE_MANAGED, LT_SERVICE_PUBLIC, LT_PUBLIC_URL, LT_OUTPUT_CHANNEL } from './constants';
import * as portfinder from "portfinder";
import * as execa from "execa";
import * as path from "path";
import * as glob from "glob";

export class ConfigurationManager implements Disposable {
  private config: WorkspaceConfiguration;
  private serviceUrl: string | undefined;
  private managedPort: number | undefined;
  private process: execa.ExecaChildProcess | undefined;
  private globallyIgnoredWords: Array<string>;
  private workspaceIgnoredWords: Array<string>;
  private static SETTING_IGNORE_GLOBAL: string = "languageTool.ignoredWordsGlobal";
  private static SETTING_IGNORE_WORKSPACE: string = "languageTool.ignoredWordsInWorkspace";

  constructor() {
    this.config = workspace.getConfiguration(LT_CONFIGURATION_ROOT);
    this.serviceUrl = this.findServiceUrl(this.getServiceType());
    this.startManagedService();
    this.globallyIgnoredWords = this.config.get<Array<string>>(ConfigurationManager.SETTING_IGNORE_GLOBAL) as Array<string>;
    this.workspaceIgnoredWords = this.config.get<Array<string>>(ConfigurationManager.SETTING_IGNORE_WORKSPACE) as Array<string>;
  }

  dispose(): void {
    this.stopManagedService();
  }

  reloadConfiguration(event: ConfigurationChangeEvent) {
    this.config = workspace.getConfiguration(LT_CONFIGURATION_ROOT);
    this.serviceUrl = this.findServiceUrl(this.getServiceType());
    if (event.affectsConfiguration("languageToolLinter.serviceType")) {
      switch (this.getServiceType()) {
        case LT_SERVICE_MANAGED:
          this.startManagedService();
          break;
        default:
          this.stopManagedService();
          break;
      }
    }
    if (this.getServiceType() === LT_SERVICE_MANAGED
      && (event.affectsConfiguration("languageToolLinter.managed.classPath")
        || event.affectsConfiguration("languageToolLinter.managed.jarFile"))) {
      this.startManagedService();
    }
    // Error about conflicting settings
    if (event.affectsConfiguration("languageToolLinter.languageTool.preferredVariants")
      || event.affectsConfiguration("languageToolLinter.languageTool.language")) {
      if (this.config.get("languageToolLinter.languageTool.language") !== "auto"
        && this.config.get("languageToolLinter.languageTool.preferredVariants") !== undefined) {
        window.showErrorMessage('', ...["Set Language to 'auto'", "Clear Preferred Variants"]).then((selection) => {
          console.log(selection);
        });
      }
    }
  }

  isAutoFormatEnabled(): boolean {
    return this.config.get("autoformat.enabled") as boolean;
  }

  // Is Language ID Supported?
  isSupportedDocument(document: TextDocument): boolean {
    if (document.uri.scheme === "file") {
      return (LT_DOCUMENT_LANGUAGE_IDS.indexOf(document.languageId) > -1);
    }
    return false;
  }

  getServiceType(): string {
    return this.get("serviceType") as string;
  }

  getServiceParameters(): Map<string, string> {
    let config: WorkspaceConfiguration = this.config;
    let parameters: Map<string, string> = new Map();
    LT_SERVICE_PARAMETERS.forEach(function (ltKey) {
      let configKey: string = "languageTool." + ltKey;
      let value: string | undefined = config.get(configKey);
      if (value) {
        parameters.set(ltKey, value);
      }
    });
    return parameters;
  }

  private findServiceUrl(serviceType: string): string | undefined {
    switch (serviceType) {
      case LT_SERVICE_EXTERNAL:
        return this.getExternalUrl() + LT_CHECK_PATH;
      case LT_SERVICE_MANAGED:
        let port = this.getManagedServicePort();
        if (port) {
          return "http://localhost:" + this.getManagedServicePort() + LT_CHECK_PATH;
        } else {
          return undefined;
        }
      case LT_SERVICE_PUBLIC:
        return LT_PUBLIC_URL + LT_CHECK_PATH;
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

  getUrl(): string | undefined {
    return this.serviceUrl;
  }

  getLintOnChange(): boolean {
    return this.config.get("lintOnChange") as boolean;
  }

  private getExternalUrl(): string | undefined {
    return this.get("external.url");
  }

  private get(key: string): string | undefined {
    return this.config.get(key);
  }

  getClassPath(): string {
    let jarFile: string = this.get("managed.jarFile") as string;
    let classPath: string = this.get("managed.classPath") as string;
    let classPathFiles: string[] = [];
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
    let classPathString: string = classPathFiles.join(path.delimiter);
    return classPathString;
  }

  private startManagedService(): void {
    if (this.getServiceType() === LT_SERVICE_MANAGED) {
      let classpath: string = this.getClassPath();
      this.stopManagedService();
      portfinder.getPort({ host: "127.0.0.1" }, (error, port) => {
        if (error) {
          LT_OUTPUT_CHANNEL.appendLine("Error getting open port: " + error.message);
          LT_OUTPUT_CHANNEL.show(true);
        } else {
          this.setManagedServicePort(port);
          let args: string[] = [
            "-cp",
            classpath,
            "org.languagetool.server.HTTPServer",
            "--port",
            port.toString()
          ];
          LT_OUTPUT_CHANNEL.appendLine("Starting managed service.");
          (this.process = execa("java", args)).catch((error) => {
            if (error.isCanceled) {
              LT_OUTPUT_CHANNEL.appendLine("Managed service process stopped.");
            } else if (error.failed) {
              LT_OUTPUT_CHANNEL.appendLine("Managed service command failed: " + error.command);
              LT_OUTPUT_CHANNEL.appendLine("Error Message: " + error.message);
              LT_OUTPUT_CHANNEL.show(true);
            }
          });
          this.process.stderr.addListener("data", (data) => {
            LT_OUTPUT_CHANNEL.appendLine(data);
            LT_OUTPUT_CHANNEL.show(true);
          });
          this.process.stdout.addListener("data", function (data) {
            LT_OUTPUT_CHANNEL.appendLine(data);
          });
          this.serviceUrl = this.findServiceUrl(this.getServiceType());
        }
      });
    }
  }

  // Stop the managed service
  stopManagedService(): void {
    if (this.process) {
      LT_OUTPUT_CHANNEL.appendLine("Closing managed service server.");
      this.process.cancel();
      this.process = undefined;
    }
  }

  // Manage Ignored Words Lists
  isIgnoredWord(word: string): boolean {
    return this.isGloballyIgnoredWord(word) || this.isWorkspaceIgnoredWord(word);
  }

  isGloballyIgnoredWord(word: string): boolean {
    return this.globallyIgnoredWords.includes(word);
  }

  isWorkspaceIgnoredWord(word: string): boolean {
    return this.workspaceIgnoredWords.includes(word);
  }

  ignoreWordGlobally(word: string): void {
    if (!this.isGloballyIgnoredWord(word)) {
      this.globallyIgnoredWords.push(word);
      this.config.update(ConfigurationManager.SETTING_IGNORE_GLOBAL, this.globallyIgnoredWords, ConfigurationTarget.Global);
    }
  }

  ignoreWordInWorkspace(word: string): void {
    if (!this.isWorkspaceIgnoredWord(word)) {
      this.workspaceIgnoredWords.push(word);
      this.config.update(ConfigurationManager.SETTING_IGNORE_WORKSPACE, this.workspaceIgnoredWords, ConfigurationTarget.Workspace);
    }
  }

}
