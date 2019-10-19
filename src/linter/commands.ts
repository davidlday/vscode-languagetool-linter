import { TextDocument } from 'vscode';
import { ConfigurationManager } from '../common/configuration';
import { LT_TIMEOUT_MS, LT_SERVICE_PARAMETERS, LT_OUTPUT_CHANNEL } from '../common/constants';
import * as rp from "request-promise-native";
import * as rehypeBuilder from "annotatedtext-rehype";
import * as remarkBuilder from "annotatedtext-remark";

export class LinterCommands {
  private config: ConfigurationManager;
  private url: string | undefined;
  private timeoutMap: Map<string, NodeJS.Timeout>;

  constructor(config: ConfigurationManager, ltUrl: string) {
    this.config = config;
    this.url = config.getUrl();
    this.timeoutMap = new Map();
  }

  requestLint(document: TextDocument, timeoutDuration: number = LT_TIMEOUT_MS): void {
    if (this.config.isSupportedDocument(document)) {
      this.cancelLint(document);
      let uriString = document.uri.toString();
      let timeout = setTimeout(() => {
        this.lintDocument(document);
        this.cancelLint(document);
      }, timeoutDuration);
      this.timeoutMap.set(uriString, timeout);
    }
  }

  // Cancel lint
  private cancelLint(document: TextDocument): void {
    let uriString = document.uri.toString();
    if (this.timeoutMap.has(uriString)) {
      let timeout = this.timeoutMap.get(uriString);
      if (timeout) {
        clearTimeout(timeout);
        this.timeoutMap.delete(uriString);
      }
    }
  }

  // Perform Lint on Document
  lintDocument(document: TextDocument): void {
    if (this.config.isSupportedDocument(document)) {
      if (document.languageId === "markdown") {
        let annotatedMarkdown: string = JSON.stringify(remarkBuilder.build(document.getText()));
        this.lintAnnotatedText(document, annotatedMarkdown);
      } else if (document.languageId === "html") {
        let annotatedHTML: string = JSON.stringify(rehypeBuilder.build(document.getText()));
        this.lintAnnotatedText(document, annotatedHTML);
      } else {
        this.lintPlaintext(document);
      }
    }
  }

  // Set ltPostDataTemplate from Configuration
  private getPostDataTemplate(): any {
    let ltPostDataTemplate: any = {};
    let configManager: ConfigurationManager = this.config;
    configManager.getServiceParameters().forEach( function(key, value) {
      ltPostDataTemplate[key] = value;
    });
    return ltPostDataTemplate;
  }

  // Call to LanguageTool Service
  private callLanguageTool(document: TextDocument, ltPostDataDict: any): void {
    let ltUrl = this.config.getUrl();
    if (ltUrl) {
      let options: object = {
        "method": "POST",
        "form": ltPostDataDict,
        "json": true
      };
      rp.post(ltUrl, options)
        .then(function (data) {
          return data;
        })
        .catch(function (err) {
          LT_OUTPUT_CHANNEL.appendLine("Error connecting to " + ltUrl);
          LT_OUTPUT_CHANNEL.appendLine(err);
          LT_OUTPUT_CHANNEL.show(true);
        });
    } else {
      LT_OUTPUT_CHANNEL.appendLine("No LanguageTool URL provided. Please check your settings and try again.");
      LT_OUTPUT_CHANNEL.show(true);
    }
  }

// Lint Plain Text Document
lintPlaintext(document: TextDocument): void {
  if (this.config.isSupportedDocument(document)) {
    let ltPostDataDict: any = this.getPostDataTemplate();
    ltPostDataDict["text"] = document.getText();
    this.callLanguageTool(document, ltPostDataDict);
  }
}

// Lint Annotated Text
lintAnnotatedText(document: TextDocument, annotatedText: string): void {
  if (this.config.isSupportedDocument(document)) {
    let ltPostDataDict: any = this.getPostDataTemplate();
    ltPostDataDict["data"] = annotatedText;
    this.callLanguageTool(document, ltPostDataDict);
  }
}


}
