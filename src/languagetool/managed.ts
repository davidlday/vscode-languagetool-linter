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
import { OutputChannel } from "vscode";

export class ManagedLanguageTool {
  private classpath = "";
  private minimumPort = 0;
  private maximumPort = 0;
  private outputChannel: OutputChannel | undefined;
  private port: number | undefined;
  private process: execa.ExecaChildProcess | undefined;
  private CHECK_PATH = "/v2/check";

  public async startService(
    classpath: string,
    minimumPort: number,
    maximumPort: number,
    outputChannel: OutputChannel,
  ): Promise<string> {
    outputChannel.appendLine("managedLanguageTool.startService called.");
    this.classpath = classpath;
    this.minimumPort = minimumPort;
    this.maximumPort = maximumPort;
    this.outputChannel = outputChannel;
    portfinder.getPort(
      { host: "127.0.0.1", port: this.minimumPort, stopPort: this.maximumPort },
      (error: Error, port: number) => {
        if (error) {
          outputChannel.appendLine("Error getting open port: " + error.message);
          outputChannel.show(true);
        } else {
          this.port = port;
          const args: string[] = [
            "-cp",
            this.classpath,
            "org.languagetool.server.HTTPServer",
            "--port",
            this.port.toString(),
          ];
          outputChannel.appendLine("Starting managed service.");
          (this.process = execa("java", args)).catch(
            (err: execa.ExecaError) => {
              if (err.isCanceled) {
                outputChannel.appendLine("Managed service process stopped.");
              } else if (err.failed) {
                outputChannel.appendLine(
                  "Managed service command failed: " + err.command,
                );
                outputChannel.appendLine("Error Message: " + err.message);
                outputChannel.show(true);
              }
            },
          );
          this.process.stderr.addListener("data", (data) => {
            outputChannel.appendLine(data);
            outputChannel.show(true);
          });
          this.process.stdout.addListener("data", (data) => {
            outputChannel.appendLine(data);
          });
        }
      },
    );
    // Need to find a way to know if the service started
    const timer: Promise<void> = new Promise((resolve) => {
      setTimeout(() => resolve(), 5000);
    });
    await timer;

    return "http://localhost:" + this.port + this.CHECK_PATH;
  }

  public stopService(): void {
    if (this.process) {
      if (this.outputChannel) {
        this.outputChannel.appendLine("Closing managed service server.");
      }
      this.process.cancel();
      this.process = undefined;
    }
  }

  public getServiceUrl(): string {
    return "http://localhost:" + this.getPort() + this.CHECK_PATH;
  }

  public getPort(): number | undefined {
    return this.port;
  }

  public getClassPath(): string {
    return this.classpath;
  }

  public getMinimumPort(): number {
    return this.minimumPort;
  }

  public getMaximumPort(): number {
    return this.maximumPort;
  }

  dispose(): void {
    this.stopService();
  }
}
