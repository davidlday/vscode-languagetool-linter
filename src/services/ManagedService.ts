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

import execa, { ExecaChildProcess } from "execa";
import * as glob from "glob";
import * as path from "path";
import * as portfinder from "portfinder";
import { window, WorkspaceConfiguration } from "vscode";
import * as Constants from "../Constants";
import { AbstractService } from "./AbstractService";

export class ManagedService extends AbstractService {
  private process: ExecaChildProcess | undefined;

  constructor(workspaceConfig: WorkspaceConfiguration) {
    super(workspaceConfig);
    this._serviceConfigurationRoot = Constants.CONFIGURATION_MANAGED;
  }

  public start(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this._state = Constants.SERVICE_STATES.STARTING;
      const classpath: string = this.getClassPath();
      const minimumPort: number = this._workspaceConfig.get(
        Constants.CONFIGURATION_MANAGED_PORT_MINIMUM,
      ) as number;
      const maximumPort: number = this._workspaceConfig.get(
        Constants.CONFIGURATION_MANAGED_PORT_MAXIMUM,
      ) as number;
      const ip: string = Constants.SERVICE_MANAGED_IP;
      if (minimumPort > maximumPort) {
        reject(new Error("Minimum port must be less than maximum port"));
      }
      if (this.process) {
        reject(new Error("ManagedService is already running"));
      }
      portfinder
        .getPortPromise({ host: ip, port: minimumPort, stopPort: maximumPort })
        .then((port: number) => {
          this._ltUrl = `http://${ip}:${port}${Constants.SERVICE_CHECK_PATH}`;
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
          // this.process = execa(`java ${args.join(" ")}`, {});
          // this.process.on("spawn", () => {
          //   this._state = Constants.SERVICE_STATES.READY;
          // });
          // this.process.on("error", () => {
          //   this._state = Constants.SERVICE_STATES.ERROR;
          // });
          // this.process.stdout.on("data", (data: string) => {
          //   if (data.includes("Server started")) {
          //     this._state = Constants.SERVICE_STATES.READY;
          //   }
          //   Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
          // });
          // this.process.stderr.on("data", (data: string) => {
          //   Constants.EXTENSION_OUTPUT_CHANNEL.show(true);
          //   Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
          //   this._state = Constants.SERVICE_STATES.ERROR;
          // });
          // while (!this.forcedPing()) {
          //   // wait for server to start
          // }
          this._state = Constants.SERVICE_STATES.READY;
          resolve(true);
        })
        .catch((error) => {
          Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
            "Error getting open port: " + error.message,
          );
          Constants.EXTENSION_OUTPUT_CHANNEL.show(true);
          reject(error.message);
        });
    });
  }

  public stop(): Promise<boolean> {
    return new Promise((resolve) => {
      this._state = Constants.SERVICE_STATES.STOPPING;
      if (this.process) {
        this.process.cancel();
        this.process = undefined;
      }
      this._state = Constants.SERVICE_STATES.STOPPED;
      resolve(true);
    });
  }

  private getClassPath(): string {
    const jarFile = this._workspaceConfig.get(
      Constants.CONFIGURATION_MANAGED_JAR_FILE,
    ) as string;
    const classPath = this._workspaceConfig.get(
      Constants.CONFIGURATION_MANAGED_CLASS_PATH,
    ) as string;
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
}
