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
import * as portfinder from "portfinder";
import * as Constants from "../configuration/constants";
import { OutputChannel } from "vscode";

export class ManagedLanguageTool {
  private classpath: string | undefined = undefined;
  private minimumPort: number | undefined = undefined;
  private maximumPort: number | undefined = undefined;
  private logger: OutputChannel = Constants.EXTENSION_OUTPUT_CHANNEL;
  private port: number | undefined = undefined;
  private process: execa.ExecaChildProcess | undefined = undefined;
  private serviceUrl: string | undefined = undefined;
  private static CHECK_PATH = "v2/check";

  public async startService(
    classpath: string,
    minimumPort: number,
    maximumPort: number,
  ): Promise<string> {
    this.logger.appendLine("managedLanguageTool.startService called.");
    await this.stopService();
    this.classpath = classpath;
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
            this.classpath as string,
            "org.languagetool.server.HTTPServer",
            "--port",
            port.toString(),
          ];
          this.logger.appendLine("Starting managed service.");
          (this.process = execa("java", args)).catch(
            (err: execa.ExecaError) => {
              if (err.isCanceled) {
                this.logger.appendLine("Managed service process stopped.");
              } else if (err.failed) {
                this.logger.appendLine(
                  "Managed service command failed: " + err.command,
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
    this.serviceUrl = `http://localhost:${this.port}/${ManagedLanguageTool.CHECK_PATH}`;
    return Promise.resolve(this.serviceUrl);
  }

  public async stopService(): Promise<void> {
    if (this.process) {
      this.logger.appendLine("Closing managed service server.");
      this.process.cancel();
      this.port = undefined;
      this.classpath = undefined;
      this.minimumPort = undefined;
      this.maximumPort = undefined;
      this.process = undefined;
    }
    return Promise.resolve();
  }

  public async dispose(): Promise<void> {
    return await this.stopService();
  }
}
