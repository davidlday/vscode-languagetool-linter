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

import * as fs from 'fs';
import * as execa from 'execa';
import * as portfinder from 'portfinder';
import * as vscode from 'vscode';

export class LTService {

  jarFile: fs.PathLike | undefined;
  ltProcess: execa.ExecaChildProcess | undefined;
  channel: vscode.OutputChannel;

  static LT_CHECK_PATH: string = "/v2/check";

  constructor(channel: vscode.OutputChannel, jarFile?: string) {
    this.channel = channel;
    if (jarFile) {
      this.jarFile = jarFile;
    }
  }

  setJarFile(jarFile: string) {
    this.jarFile = jarFile;
  }

  getJarFile(): string {
    return this.jarFile ? this.jarFile.toString() : "";
  }

  setOutputChannel(channel: vscode.OutputChannel) {
    this.channel = channel;
  }

  // Stop the managed service
  stopManagedService(): void {
    if (this.ltProcess) {
      this.channel.appendLine("Closing managed service server.");
      this.ltProcess.cancel();
      this.ltProcess = undefined;
    }
  }

  // Start a managed service using a random, available port
  // Service will be stopped and restarted every time.
  startManagedService(): string {
    this.stopManagedService();
    let url: string = "";
    let ltProcess: execa.ExecaChildProcess;
    let me = this;
    portfinder.getPort({host: "127.0.0.1"}, function (error, port) {
      if (error) {
        me.channel.appendLine("Error getting open port: " + error.message);
        me.channel.show(true);
      } else {
        let jarFile: string = me.getJarFile();
        let args: string[] = [
          "-cp",
          jarFile,
          "org.languagetool.server.HTTPServer",
          "--port",
          port.toString()
        ];
        me.channel.appendLine("Starting managed service.");
        (me.ltProcess = execa("java", args)).catch(function (error) {
          if (error.isCanceled) {
            me.channel.appendLine("Managed service process stopped.");
          } else if (error.failed) {
            me.channel.appendLine("Managed service command failed: " + error.command);
            me.channel.appendLine("Error Message: " + error.message);
            me.channel.show(true);
          }
        });
        ltProcess.stderr.addListener("data", function (data) {
          me.channel.appendLine(data);
          me.channel.show(true);
        });
        ltProcess.stdout.addListener("data", function (data) {
          me.channel.appendLine(data);
        });
        url = "http://localhost:" + port.toString() + LTService.LT_CHECK_PATH;
      }
    });
    return url;
  }

}
