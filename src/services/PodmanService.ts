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
import fetch from "node-fetch";
import { Disposable, workspace, WorkspaceConfiguration } from "vscode";
import * as Constants from "../Constants";
import { ILanguageToolService } from "../Interfaces";

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

export class PodmanService implements Disposable, ILanguageToolService {
  private workspaceConfig: WorkspaceConfiguration;
  private podmanMachineName: string | undefined;
  private containerName: string | undefined;
  private imageName: string | undefined;

  // Constructor
  constructor(workspaceConfig: WorkspaceConfiguration) {
    this.workspaceConfig = workspaceConfig;
    this.podmanMachineName = this.workspaceConfig.get(
      Constants.CONFIGURATION_PODMAN_MACHINE_NAME,
    );
    this.containerName = this.workspaceConfig.get(
      Constants.CONFIGURATION_PODMAN_CONTAINER_NAME,
    );
    this.imageName = this.workspaceConfig.get(
      Constants.CONFIGURATION_PODMAN_IMAGE_NAME,
    );
    vscode.ExtensionContext.subscriptions.push(this);
    workspace.onDidChangeConfiguration((event) => {
    workspaceConfig.onDidChange(
      Constants.CONFIGURATION_PODMAN_MACHINE_NAME,
      (newValue: string) => {
        this.podmanMachineName = newValue;
      },
    );
    workspaceConfig.onDidChange(
      Constants.CONFIGURATION_PODMAN_CONTAINER_NAME,
      (newValue: string) => {
        this.renameContainer(newValue);
      },
    );
  }

  // Private instance methods

  // Machine methods
  private podmanMachineInitialized(): boolean {
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

  private isDefaultMachineRunning(): boolean {
    const machines = this.getPodmanMachines();
    for (const machine of machines) {
      if (machine.Default && machine.Running) {
        return true;
      }
    }
    return false;
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

  private startPodmanMachine(): ExecaChildProcess<string> | undefined {
    let result;
    try {
      result = execa(`podman machine start ${this.podmanMachineName}`);
      result.addListener("stdout", (data: string) => {
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
      });
      result.addListener("stderr", (data: string) => {
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
      });
    } catch (error) {
      if (error instanceof Error) {
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
          `Error starting podman machine: ${error.message}`,
        );
        throw error;
      }
    }
    return result;
  }

  // Image methods
  private pullImage(): ExecaChildProcess<string> | undefined {
    let result;
    try {
      result = execa(`podman pull ${this.imageName}`);
      result.addListener("stdout", (data: string) => {
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
      });
      result.addListener("stderr", (data: string) => {
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(data);
      });
    } catch (error) {
      if (error instanceof Error) {
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
          `Error pulling podman image: ${error.message}`,
        );
        throw error;
      }
    }
    return result;
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
      result = execa.sync(`podman inspect ${this.containerName} --format json`);
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
    const result = execa.sync(
      `podman ps -a --format json --filter name=${this.containerName}`,
    );
    if (result.stdout === "[]") {
      return false;
    } else {
      return true;
    }
  }

  public isContainerRunning(): boolean {
    if (this.isPodmanMachineRunning() && this.containerExists()) {
      const containerInfo: ContainerInfo[] = this.inspectContainer();
      if (containerInfo[0]) {
        return containerInfo[0].State.Running;
      }
    }
    return false;
  }

  private renameContainer(newName: string): void {
    execa.sync(`podman rename ${this.containerName} ${newName}`);
    this.containerName = newName;
  }

  private startContainer(): ExecaChildProcess<string> {
    return execa(`podman start ${this.containerName}`);
  }

  private stopContainer(): ExecaChildProcess<string> {
    return execa(`podman stop ${this.containerName}`);
  }

  private runContainer(): ExecaChildProcess<string> {
    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
      `Running PodmanService as container ${this.containerName}`,
    );

    let child: ExecaChildProcess<string>;
    if (this.containerExists()) {
      child = this.start();
    } else {
      child = execa(
        `podman run --rm -d -p :8010 --name ${this.containerName} ${this.imageName}`,
      );
    }

    // Wait for the container to start
    while (!this.isContainerRunning()) {
      setTimeout(function () {
        Constants.EXTENSION_OUTPUT_CHANNEL.append(".");
      }, 500);
    }
    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(".");
    Constants.EXTENSION_OUTPUT_CHANNEL.appendLine("PodmanService starte.");

    return child;
  }

  // Public instance methods
  public dispose(): void {
    this.stop();
  }

  public start(): ExecaChildProcess<string> {
    // Is the machine initialized?
    if (!this.podmanMachineInitialized()) {
      // Prompt for initialization
    }
    // Is the machine running?
    if (!this.isPodmanMachineRunning()) this.startPodmanMachine();
    // Is the image available?
    if (!this.isImageAvailable()) this.pullImage();

    if (!this.isContainerRunning()) this.startPodmanMachine();

    return this.startContainer();
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isContainerRunning()) {
        this.stopContainer().then(() => {
          resolve();
        });
      } else {
        reject("Container is not running");
      }
    });
  }

  public getPort(): number {
    const containerInfo: ContainerInfo[] = this.inspectContainer();
    return containerInfo[0].HostConfig.PortBindings["8010/tcp"][0].HostPort;
  }

  public getHost(): string {
    const containerInfo: ContainerInfo[] = this.inspectContainer();
    return containerInfo[0].HostConfig.PortBindings["8010/tcp"][0].HostIp;
  }

  public getURL(): string {
    return `http://${this.getHost()}:${this.getPort()}${
      Constants.SERVICE_CHECK_PATH
    }`;
  }

  public ping(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const url = this.getURL();
      const options = {
        method: "HEAD",
        uri: url,
        resolveWithFullResponse: true,
      };
      fetch(url, options).then((response) => {
        if (response.status === 200) {
          resolve(true);
        } else {
          reject(false);
        }
      });
    });
  }
}
