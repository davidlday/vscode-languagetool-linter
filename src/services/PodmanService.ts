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

interface Image {
  Id: string;
  ParentId: string;
  RepoTags: string[];
  RepoDigests: string[];
  Size: number;
  SharedSize: number;
  VirtualSize: number;
  Labels: {
    [key: string]: string;
  };
  Containers: number;
  Names: string[];
  Digest: string;
  History: string[];
  Created: string;
  CreatedAt: string;
}
export class PodmanService
  extends AbstractService
  implements Disposable, ILanguageToolService
{
  private containerName: string;
  private imageName: string;
  private podman = "podman";
  private port: number;
  private ip: string;
  private hardStop: boolean;

  // ILanguageToolService methods
  constructor(workspaceConfig: WorkspaceConfiguration) {
    super(workspaceConfig);
    this.containerName = this._workspaceConfig.get(
      Constants.CONFIGURATION_PODMAN_CONTAINER_NAME,
    ) as string;
    this.imageName = this._workspaceConfig.get(
      Constants.CONFIGURATION_PODMAN_IMAGE_NAME,
    ) as string;
    this.port = this._workspaceConfig.get(
      Constants.CONFIGURATION_PODMAN_PORT,
    ) as number;
    this.ip = this._workspaceConfig.get(
      Constants.CONFIGURATION_PODMAN_IP,
    ) as string;
    this.hardStop = this._workspaceConfig.get(
      Constants.CONFIGURATION_PODMAN_HARDSTOP,
    ) as boolean;
  }

  public start(): Promise<boolean> {
    this._state = Constants.SERVICE_STATES.STARTING;
    return new Promise((resolve, reject) => {
      const isContainerRunning = this.isContainerRunning();
      const isImageAvailable = this.isImageAvailable();
      const isContainerAvailable = this.containerExists();
      const isPodmanMachineRunning = this.isPodmanMachineRunning();
      if (isContainerRunning) {
        this._ltUrl = this.getServiceURL();
        this._state = Constants.SERVICE_STATES.RUNNING;
        resolve(true);
      } else if (isContainerAvailable) {
        const result = execa.sync("podman", ["start", this.containerName]);
        if (result.exitCode === 0) {
          this._ltUrl = this.getServiceURL();
          this._state = Constants.SERVICE_STATES.RUNNING;
          resolve(true);
        } else {
          this._state = Constants.SERVICE_STATES.ERROR;
          reject(new Error(result.stderr));
        }
      } else if (isImageAvailable || isPodmanMachineRunning) {
        const result = execa.sync("podman", [
          "run",
          "-d",
          "-p",
          `${this.ip}:${this.port}:8010/tcp`,
          "--name",
          this.containerName,
          this.imageName,
        ]);
        if (result.exitCode === 0) {
          this._ltUrl = this.getServiceURL();
          console.log(`Podman URL: ${this._ltUrl}`);
          this._state = Constants.SERVICE_STATES.RUNNING;
          resolve(true);
        } else {
          this._state = Constants.SERVICE_STATES.ERROR;
          reject(new Error(result.stderr));
        }
      } else {
        this._state = Constants.SERVICE_STATES.ERROR;
        reject(
          new Error("Podman Machine is either not initialized or not running."),
        );
      }
    });
  }

  public stop(): Promise<boolean> {
    this._state = Constants.SERVICE_STATES.STOPPING;
    return new Promise((resolve, reject) => {
      if (this.isContainerRunning() && this.hardStop) {
        const result = execa.sync("podman", ["stop", this.containerName]);
        if (result.exitCode === 0) {
          this._state = Constants.SERVICE_STATES.STOPPED;
          resolve(true);
        } else {
          this._state = Constants.SERVICE_STATES.ERROR;
          reject(new Error(result.stderr));
        }
      } else {
        this._state = Constants.SERVICE_STATES.STOPPED;
        resolve(true);
      }
    });
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

  // Private methods
  private getServiceURL(): string {
    const container: ContainerInfo = this.inspectContainer()[0];
    const portBindings = container.HostConfig.PortBindings["8010/tcp"];
    if (container) {
      return `http://${portBindings[0].HostIp}:${portBindings[0].HostPort}${Constants.SERVICE_CHECK_PATH}`;
    } else {
      throw new Error("Container not found.");
    }
  }

  private isPodmanMachineRunning(): boolean {
    // Podman doesn't require a machine on linux
    // Might cause issues on WSL2
    if (process.platform === "linux") {
      return true;
    }
    const result = execa.sync("podman", [
      "machine",
      "info",
      "--format",
      "json",
    ]);
    if (result.exitCode === 0) {
      const machineInfo: MachineInfo = JSON.parse(result.stdout);
      if (machineInfo.Host.MachineState === "Running") {
        return true;
      } else {
        return false;
      }
    } else {
      throw new Error(result.stderr);
    }
  }

  private isImageAvailable(): boolean {
    const result = execa.sync("podman", [
      "images",
      "--format",
      "json",
      "--filter",
      `reference=${this.imageName}`,
    ]);
    if (result.exitCode === 0) {
      const images: Image[] = JSON.parse(result.stdout);
      if (images.length > 0) {
        return true;
      } else {
        return false;
      }
    } else {
      throw new Error(result.stderr);
    }
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
    const result = execa.sync("podman", [
      "rename",
      this.containerName,
      newName,
    ]);
    if (result.exitCode === 0) {
      this.containerName = newName;
    } else {
      throw new Error(result.stderr);
    }
  }
}
