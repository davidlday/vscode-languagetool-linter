/****
 *    Copyright 2021 David L. Day
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
import * as fs from "fs";
import * as path from "path";
import * as portfinder from "portfinder";
import { OutputChannel } from "vscode";
import * as Constants from "../configuration/constants";

export class EmbeddedLangaugeTool {
  private homeDirectory: string;
  private minimumPort: number | undefined = undefined;
  private maximumPort: number | undefined = undefined;
  private logger: OutputChannel = Constants.EXTENSION_OUTPUT_CHANNEL;
  private port: number | undefined = undefined;
  private process: execa.ExecaChildProcess | undefined = undefined;
  private serviceUrl: string | undefined = undefined;
  private javaPath: string;
  private static CHECK_PATH = "v2/check";
  private static JRE_VERSION = "11.0.10_9";
  private static ADOPTOPENJDK_API =
    "https://api.adoptopenjdk.net/v3/assets/version/";

  constructor(homeDirectory: string, javaPath = "") {
    this.homeDirectory = homeDirectory;
    try {
      fs.accessSync(javaPath, fs.constants.X_OK);
      this.javaPath = javaPath;
    } catch (err) {
      this.javaPath = this.getEmbeddedJavaPath();
    }
  }

  public async startService(
    minimumPort: number,
    maximumPort: number,
  ): Promise<string> {
    this.logger.appendLine("embeddedLanguageTool.startService called.");
    await this.stopService();
    const classpath: string = this.homeDirectory + "/stable/";
    this.minimumPort = minimumPort;
    this.maximumPort = maximumPort;
    portfinder.getPort(
      { host: "127.0.0.1", port: this.minimumPort, stopPort: this.maximumPort },
      (error: Error, port: number) => {
        if (error) {
          this.logger.appendLine("Error getting open port: " + error.message);
          this.logger.show(true);
        } else {
          const args: string[] = [
            "-cp",
            classpath,
            "org.languagetool.server.HTTPServer",
            "--port",
            port.toString(),
          ];
          this.logger.appendLine("Starting embedded service.");
          (this.process = execa(this.javaPath, args)).catch(
            (err: execa.ExecaError) => {
              if (err.isCanceled) {
                this.logger.appendLine("Embedded service process stopped.");
              } else if (err.failed) {
                this.logger.appendLine(
                  "Embedded service command failed: " + err.command,
                );
                this.logger.appendLine("Error Message: " + err.message);
                this.logger.show(true);
              }
            },
          );
          this.port = port;
          this.process.stderr.addListener("data", (data) => {
            this.logger.appendLine(data);
            this.logger.show(true);
          });
          this.process.stdout.addListener("data", (data) => {
            this.logger.appendLine(data);
          });
        }
      },
    );
    // Need to find a better way to know if the service is still starting or if something failed.
    let count = 0;
    while (!this.port && count < 10) {
      const timer = new Promise((resolve) => {
        setTimeout(() => resolve("done!"), 1000);
      });
      await timer;
      count++;
    }
    this.serviceUrl = `http://localhost:${this.port}/${EmbeddedLangaugeTool.CHECK_PATH}`;
    return Promise.resolve(this.serviceUrl);
  }

  public async stopService(): Promise<void> {
    if (this.process) {
      this.logger.appendLine("Stopping embedded service.");
      this.process.cancel();
      this.port = undefined;
      this.minimumPort = undefined;
      this.maximumPort = undefined;
      this.process = undefined;
    }
    return Promise.resolve();
  }

  public async dispose(): Promise<void> {
    return await this.stopService();
  }

  private getEmbeddedJavaPath(): string {
    let javaExe = "java";
    if (process.platform == "win32") {
      javaExe = "java.exe";
    }
    const embeddedJavaPath = path.resolve(
      this.homeDirectory,
      "embedded",
      "jre",
      EmbeddedLangaugeTool.JRE_VERSION,
      javaExe,
    );
    try {
      fs.accessSync(embeddedJavaPath, fs.constants.X_OK);
      return embeddedJavaPath;
    } catch (err) {
      return this.installEmbeddedJava();
    }
  }

  private installEmbeddedJava(): string {
    return "";
  }
}
