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

import execa from "execa";
import * as Fetch from "node-fetch";
import * as vscode from "vscode";
import {
  ConfigurationChangeEvent,
  Disposable,
  WorkspaceConfiguration,
} from "vscode";
import * as Constants from "../Constants";
import { ILanguageToolService } from "../Interfaces";
import { AbstractService } from "./AbstractService";

interface ContainerInfo {
  Id: string;
  Created: string;
  Path: string;
  Args: string[];
  State: {
    Status: string;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    OOMKilled: boolean;
    Dead: boolean;
    Pid: number;
    ExitCode: number;
    Error: string;
    StartedAt: string;
    FinishedAt: string;
    Health: {
      Status: string;
      FailingStreak: number;
      Log: {
        Start: string;
        End: string;
        ExitCode: number;
        Output: string;
      }[];
    };
  };
  Image: string;
  ImageName: string;
  Name: string;
  HostConfig: {
    PortBindings: {
      "8010/tcp": {
        HostIp: string;
        HostPort: number;
      }[];
    };
  };
}

interface PodmanMachine {
  Name: string;
  Default: boolean;
  Created: string;
  Running: boolean;
  Starting: boolean;
  LastUp: string;
  Stream: string;
  VMType: string;
  CPUs: number;
  Memory: string;
  DiskSize: string;
  Port: number;
  RemoteUsername: string;
  IdentityPath: string;
}

interface MachineInfo {
  Host: {
    Arch: string;
    CurrentMachine: string;
    DefaultMachine: string;
    EventsDir: string;
    MachineConfigDir: string;
    MachineImageDir: string;
    MachineState: string;
    NumberOfMachines: number;
    OS: string;
    VMType: string;
  };
  Version: {
    APIVersion: string;
    Version: string;
    GoVersion: string;
    GitCommit: string;
    BuiltTime: string;
    Built: number;
    OsArch: string;
    Os: string;
  };
}

export class PodmanService
  extends AbstractService
  implements Disposable, ILanguageToolService
{
  private containerName: string;
  private imageName: string;
  private podman = "/usr/local/bin/podman";

  // ILanguageToolService methods
  constructor(workspaceConfig: WorkspaceConfiguration) {
    super(workspaceConfig);
    this.containerName = this._workspaceConfig.get(
      Constants.CONFIGURATION_PODMAN_CONTAINER_NAME,
    ) as string;
    this.imageName = this._workspaceConfig.get(
      Constants.CONFIGURATION_PODMAN_IMAGE_NAME,
    ) as string;
  }

  public start(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (!this.isPodmanMachineInitialized()) {
        // Prompt for initialization
        vscode.window
          .showInformationMessage(
            `No podman machines exist. Would you like to initialize a default podman machine now?`,
            "Yes",
            "No",
          )
          .then((selection) => {
            if (selection === "Yes") {
              try {
                execa(`${this.podman} machine init --now`)
                  .addListener("stdout", (data: string) => {
                    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
                  })
                  .addListener("stderr", (data: string) => {
                    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
                  });
                while (!this.isPodmanMachineInitialized()) {
                  // Wait for machine to initialize
                }
              } catch (error: unknown) {
                if (error instanceof Error) {
                  vscode.window.showErrorMessage(
                    `Error initializing default podman machine: ${error.message}`,
                  );
                }
              }
            } else {
              Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
                `Default podman machine must be initialized to use this extension.`,
              );
            }
            reject(false);
          });
      } else {
        if (!this.isPodmanMachineRunning()) {
          // Prompt for starting machine
          vscode.window
            .showInformationMessage(
              `Podman machine is not running. Would you like to start it now?`,
              "Yes",
              "No",
            )
            .then((selection) => {
              if (selection === "Yes") {
                try {
                  execa(`${this.podman} machine start`)
                    .addListener("stdout", (data: string) => {
                      Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
                    })
                    .addListener("stderr", (data: string) => {
                      Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
                    });
                  while (!this.isPodmanMachineRunning()) {
                    // Wait for machine to start
                  }
                } catch (error: unknown) {
                  if (error instanceof Error) {
                    vscode.window.showErrorMessage(
                      `Error starting podman machine: ${error.message}`,
                    );
                  }
                }
              } else {
                vscode.window.showInformationMessage(
                  `Podman machine must be running to use this extension.`,
                );
                reject(false);
              }
            });
        }
      }
      if (!this.isImageAvailable()) {
        // Prompt for building image
        vscode.window
          .showInformationMessage(
            `Image '${this.imageName}' is not available. Would you like to pull it now?`,
            "Yes",
            "No",
          )
          .then((selection) => {
            if (selection === "Yes") {
              try {
                execa(`${this.podman} pull ${this.imageName}`)
                  .addListener("stdout", (data: string) => {
                    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
                  })
                  .addListener("stderr", (data: string) => {
                    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
                  });
                while (!this.isImageAvailable()) {
                  // Wait for image to pull
                }
              } catch (error: unknown) {
                if (error instanceof Error) {
                  vscode.window.showErrorMessage(
                    `Error pulling image: ${error.message}`,
                  );
                }
              }
            } else {
              vscode.window.showInformationMessage(
                `Image '${this.imageName}' must be available to use this extension.`,
              );
              reject(false);
            }
          });
      }
      if (!this.containerExists()) {
        // Prompt for creating container
        vscode.window
          .showInformationMessage(
            `Container '${this.containerName}' is not available. Would you like to create it now?`,
            "Yes",
            "No",
          )
          .then((selection) => {
            if (selection === "Yes") {
              try {
                const port = this._workspaceConfig.get(
                  Constants.CONFIGURATION_PODMAN_PORT,
                );
                const ip = this._workspaceConfig.get(
                  Constants.CONFIGURATION_PODMAN_IP,
                );
                execa(
                  `${this.podman} run -d --name ${this.containerName} -p ${ip}:${port}:8010 ${this.imageName}`,
                )
                  .addListener("stdout", (data: string) => {
                    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
                  })
                  .addListener("stderr", (data: string) => {
                    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
                  })
                  .then((result) => {
                    if (result.exitCode !== 0) {
                      vscode.window.showErrorMessage(
                        `Error creating container: ${result.stderr}`,
                      );
                      reject(false);
                    } else {
                      this._ltUrl =
                        `http://${ip}:${port}` + Constants.SERVICE_CHECK_PATH;
                    }
                  });
                while (!this.isContainerRunning()) {
                  // Wait for container to create
                }
              } catch (error: unknown) {
                if (error instanceof Error) {
                  vscode.window.showErrorMessage(
                    `Error starting new container: ${error.message}`,
                  );
                }
              }
            } else {
              vscode.window.showInformationMessage(
                `Container '${this.containerName}' must be running to use this extension.`,
              );
              reject(false);
            }
          });
      }
      if (!this.isContainerRunning()) {
        // Prompt for starting container
        vscode.window
          .showInformationMessage(
            `Container '${this.containerName}' is not running. Would you like to start it now?`,
            "Yes",
            "No",
          )
          .then((selection) => {
            if (selection === "Yes") {
              try {
                execa(`${this.podman} start ${this.containerName}`)
                  .addListener("stdout", (data: string) => {
                    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
                  })
                  .addListener("stderr", (data: string) => {
                    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
                  })
                  .then((result) => {
                    if (result.exitCode !== 0) {
                      vscode.window.showErrorMessage(
                        `Error starting container: ${result.stderr}`,
                      );
                      reject(false);
                    } else {
                      const containerInfo = this.inspectContainer();
                      const port =
                        containerInfo[0].HostConfig.PortBindings["8010/tcp"][0]
                          .HostPort;
                      const ip =
                        containerInfo[0].HostConfig.PortBindings["8010/tcp"][0]
                          .HostIp;
                      this._ltUrl =
                        `http://${ip}:${port}` + Constants.SERVICE_CHECK_PATH;
                    }
                  });
                while (!this.isContainerRunning()) {
                  // Wait for container to start
                }
              } catch (error: unknown) {
                if (error instanceof Error) {
                  vscode.window.showErrorMessage(
                    `Error starting container: ${error.message}`,
                  );
                }
              }
            } else {
              vscode.window.showInformationMessage(
                `Container '${this.containerName}' must be running to use this extension.`,
              );
              reject(false);
            }
          });
      }
      resolve(true);
    });
  }

  public stop(): Promise<void> {
    return new Promise(() => {
      if (this.isContainerRunning()) {
        try {
          execa(`${this.podman} stop ${this.containerName}`)
            .addListener("stdout", (data: string) => {
              Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
            })
            .addListener("stderr", (data: string) => {
              Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
            });
          while (this.isContainerRunning()) {
            // Wait for container to stop
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            vscode.window.showErrorMessage(
              `Error stopping container: ${error.message}`,
            );
          }
        }
      }
    });
  }

  public ping(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const url = this.getURL();
      const options = {
        method: "HEAD",
        uri: url,
        resolveWithFullResponse: true,
      };
      if (url) {
        Fetch.default(url, options).then((response) => {
          if (response.status === 200) {
            resolve(true);
          } else {
            reject(new Error(response.statusText));
          }
        });
      } else {
        reject(new Error("Podman URL is not defined."));
      }
    });
  }

  // Private instance methods

  // Machine methods
  private isPodmanMachineInitialized(): boolean {
    const machines = this.getPodmanMachines();
    return machines.length === 0 ? false : true;
  }

  private getPodmanMachines(): PodmanMachine[] {
    let result;
    try {
      result = execa.sync("podman", ["machine", "ls", "--format", "json"]);
    } catch (error: unknown) {
      if (error instanceof Error) {
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
          `Error getting podman machines: ${error.message}`,
        );
        throw error;
      }
    }
    return result ? JSON.parse(result.stdout) : [];
  }

  private isPodmanMachineRunning(): boolean {
    const machineInfo: MachineInfo = this.podmanMachineInfo();
    return machineInfo ? machineInfo.Host.MachineState === "Running" : false;
  }

  private podmanMachineInfo(): MachineInfo {
    let result;
    try {
      result = execa.sync("podman", ["machine", "info", "--format", "json"]);
      Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(result.stdout);
    } catch (error: unknown) {
      if (error instanceof Error) {
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
          `Error getting podman machine info: ${error.message}`,
        );
        throw error;
      }
    }
    return result ? JSON.parse(result.stdout) : undefined;
  }

  private isImageAvailable(): boolean {
    let result;
    try {
      result = execa.sync("podman", [
        "images",
        "--format",
        "json",
        "--filter",
        `reference=${this.imageName}`,
      ]);
    } catch (error: unknown) {
      if (error instanceof Error) {
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
          `Error getting podman images: ${error.message}`,
        );
        throw error;
      }
    }
    return result ? result.stderr !== "[]" : false;
  }

  // Container methods
  private inspectContainer(): ContainerInfo[] {
    let result;
    try {
      result = execa.sync("podman", [
        "inspect",
        this.containerName,
        "--format",
        "json",
      ]);
    } catch (error: unknown) {
      if (error instanceof Error) {
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
          `Error inspecting container ${this.containerName}: ${error.message}`,
        );
        throw error;
      }
    }
    return result ? JSON.parse(result.stdout) : [];
  }

  private containerExists(): boolean {
    const result = execa.sync("podman", [
      "ps",
      "-a",
      "--format",
      "json",
      "--filter",
      `name=${this.containerName}`,
    ]);
    if (result.stdout === "[]") {
      return false;
    } else {
      return true;
    }
  }

  public reloadConfiguration(
    event: ConfigurationChangeEvent,
    workspaceConfig: WorkspaceConfiguration,
  ): void {
    this._workspaceConfig = workspaceConfig;
    if (
      event.affectsConfiguration(Constants.CONFIGURATION_PODMAN_CONTAINER_NAME)
    ) {
      this.containerName = this._workspaceConfig.get(
        Constants.CONFIGURATION_PODMAN_CONTAINER_NAME,
      ) as string;
      if (this.containerName) {
        this.renameContainer(this.containerName);
      }
    }
  }

  private isContainerRunning(): boolean {
    if (this.isPodmanMachineRunning() && this.containerExists()) {
      const containerInfo: ContainerInfo[] = this.inspectContainer();
      if (containerInfo[0]) {
        return containerInfo[0].State.Running;
      }
    }
    return false;
  }

  private renameContainer(newName: string): void {
    execa.sync("podman", ["rename", this.containerName, newName]);
    this.containerName = newName;
  }
}
