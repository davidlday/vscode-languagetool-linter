import { TextDocument, WorkspaceConfiguration, workspace, ConfigurationChangeEvent, Disposable } from 'vscode';
import { LT_DOCUMENT_LANGUAGE_IDS, LT_CONFIGURATION_ROOT, LT_SERVICE_PARAMETERS, LT_SERVICE_EXTERNAL, LT_CHECK_PATH, LT_SERVICE_MANAGED, LT_SERVICE_PUBLIC, LT_PUBLIC_URL, LT_OUTPUT_CHANNEL } from './constants';
import * as portfinder from 'portfinder';
import * as execa from "execa";
import * as path from "path";
import * as glob from "glob";

export class ConfigurationManager implements Disposable {
  private config: WorkspaceConfiguration;
  private serviceUrl: string | undefined;
  private managedPort: number | undefined;
  private process: execa.ExecaChildProcess | undefined;

  constructor() {
    this.config = workspace.getConfiguration(LT_CONFIGURATION_ROOT);
    this.serviceUrl = this.findServiceUrl(this.getServiceType());
    this.startManagedService();
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
    } else if (this.getServiceType() === LT_SERVICE_MANAGED &&
        (event.affectsConfiguration("languageToolLinter.managed.jarFile")
        || event.affectsConfiguration("languageToolLinter.managed.classPath"))
      ) {
      this.restartManagedService();
    }
  }

  isAutoFormatEnabled(): boolean {
    return this.config.get("autoformat.enabled") as boolean;
  }

  // Is Launguage ID Supported?
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

  private startManagedService(): void {
    if (this.getServiceType() === LT_SERVICE_MANAGED) {
      let jarFile: string = this.get("managed.jarFile") as string;
      let classPath: string = this.get("managed.classPath") as string;
      let classPathFiles: string[] = [];
      if (jarFile !== "") {
        classPathFiles.push(jarFile);
      }
      classPath.split(path.delimiter).forEach((globPattern) => {
        console.log("Glob: " + globPattern);
        glob.sync(globPattern).forEach((match) => {
          classPathFiles.push(match);
        });
      });
      let classPathString: string = classPathFiles.join(path.delimiter);
      console.log("class path: " + classPathString);
      this.stopManagedService();
      portfinder.getPort({ host: "127.0.0.1" }, (error, port) => {
        if (error) {
          LT_OUTPUT_CHANNEL.appendLine("Error getting open port: " + error.message);
          LT_OUTPUT_CHANNEL.show(true);
        } else {
          this.setManagedServicePort(port);
          let args: string[] = [
            "-cp",
            classPathString,
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

  restartManagedService(): void {
    this.stopManagedService();
    this.startManagedService();
  }

}
