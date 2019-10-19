import { TextDocument, WorkspaceConfiguration, workspace } from 'vscode';
import { LT_DOCUMENT_LANGUAGE_IDS, LT_CONFIGURATION_ROOT, LT_SERVICE_PARAMETERS, LT_SERVICE_EXTERNAL, LT_CHECK_PATH, LT_SERVICE_MANAGED, LT_SERVICE_PUBLIC, LT_PUBLIC_URL } from './constants';

export class ConfigurationManager {
  private config: WorkspaceConfiguration;
  private serviceUrl: string | undefined;
  private managedPort: number | undefined;

  constructor() {
    this.config = workspace.getConfiguration(LT_CONFIGURATION_ROOT);
    this.serviceUrl = this.findServiceUrl(this.getServiceType());
  }

  reloadConfiguration() {
    this.config = workspace.getConfiguration(LT_CONFIGURATION_ROOT);
    this.serviceUrl = this.findServiceUrl(this.getServiceType());
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

  setManagedServicePort(port: number): void {
    this.managedPort = port;
  }

  getManagedServicePort(): number | undefined {
    return this.managedPort;
  }

  setUrl(url: string): void {
    this.serviceUrl = url;
  }

  getUrl(): string | undefined {
    return this.serviceUrl;
  }

  getExternalUrl(): string | undefined {
    return this.get("external.url");
  }

  private get(key: string): string | undefined {
    return this.config.get(key);
  }

}
