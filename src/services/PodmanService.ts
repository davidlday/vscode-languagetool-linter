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
import { Disposable, WorkspaceConfiguration } from "vscode";
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

// interface PodmanMachine {
//   Name: string;
//   Default: boolean;
//   Created: string;
//   Running: boolean;
//   Starting: boolean;
//   LastUp: string;
//   Stream: string;
//   VMType: string;
//   CPUs: number;
//   Memory: string;
//   DiskSize: string;
//   Port: number;
//   RemoteUsername: string;
//   IdentityPath: string;
// }

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
  private port: number;
  private ip: string;
  private hardStop: boolean;
  private command: string;

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
    this.command = this._workspaceConfig.get(
      Constants.CONFIGURATION_PODMAN_COMMAND,
    ) as string;
  }

  public start(): Promise<boolean> {
    this._state = Constants.SERVICE_STATES.STARTING;
    return new Promise((resolve, reject) => {
      const isPodmanMachineRunning = this.isPodmanMachineRunning();
      const isImageAvailable = isPodmanMachineRunning
        ? this.isImageAvailable()
        : false;
      const isContainerAvailable = isImageAvailable
        ? this.containerExists()
        : false;
      const isContainerRunning = isContainerAvailable
        ? this.isContainerRunning()
        : false;
      const isContainerHealthy = isContainerRunning
        ? this.isContainerHealthy()
        : false;
      if (isContainerHealthy) {
        this._ltUrl = this.getServiceURL();
        this._state = Constants.SERVICE_STATES.READY;
        resolve(true);
      } else if (isContainerRunning) {
        let health = this.getContainerHealth();
        while (health == "starting") {
          execa.sync("sleep", ["1"]);
          health = this.getContainerHealth();
        }
        if (health == "healthy") {
          this._ltUrl = this.getServiceURL();
          this._state = Constants.SERVICE_STATES.READY;
          resolve(true);
        } else {
          this._state = Constants.SERVICE_STATES.ERROR;
          reject(new Error("Container is unhealthy"));
        }
      } else if (isContainerAvailable) {
        const result = execa.sync(this.command, ["start", this.containerName]);
        if (result.exitCode == 0) {
          let health = this.getContainerHealth();
          while (health == "starting") {
            execa.sync("sleep", ["1"]);
            health = this.getContainerHealth();
          }
          if (health == "healthy") {
            this._ltUrl = this.getServiceURL();
            this._state = Constants.SERVICE_STATES.READY;
            resolve(true);
          } else {
            this._state = Constants.SERVICE_STATES.ERROR;
            reject(new Error("Container is unhealthy"));
          }
        } else {
          this._state = Constants.SERVICE_STATES.ERROR;
          reject(new Error("Failed to start container"));
        }
      } else if (isImageAvailable || isPodmanMachineRunning) {
        const result = execa.sync(this.command, [
          "run",
          "-d",
          "-p",
          `${this.ip}:${this.port}:8010/tcp`,
          "--name",
          this.containerName,
          this.imageName,
        ]);
        if (result.exitCode === 0) {
          while (!this.isContainerHealthy()) {
            if (!this.isContainerRunning()) {
              this._state = Constants.SERVICE_STATES.ERROR;
              reject(new Error("Container is not running"));
            } else {
              let health = this.getContainerHealth();
              while (health == "starting") {
                execa.sync("sleep", ["1"]);
                health = this.getContainerHealth();
              }
              if (health == "healthy") {
                this._ltUrl = this.getServiceURL();
                this._state = Constants.SERVICE_STATES.READY;
                resolve(true);
              } else {
                this._state = Constants.SERVICE_STATES.ERROR;
                reject(new Error("Container is not healthy"));
              }
            }
          }
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
        const result = execa.sync(this.command, ["stop", this.containerName]);
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

  // public reloadConfiguration(
  //   event: ConfigurationChangeEvent,
  //   workspaceConfig: WorkspaceConfiguration,
  // ): Promise<boolean> {
  //   this._workspaceConfig = workspaceConfig;
  //   if (
  //     event.affectsConfiguration(Constants.CONFIGURATION_PODMAN_CONTAINER_NAME)
  //   ) {
  //     this.containerName = this._workspaceConfig.get(
  //       Constants.CONFIGURATION_PODMAN_CONTAINER_NAME,
  //     ) as string;
  //     if (this.containerName) {
  //       this.renameContainer(this.containerName);
  //     }
  //   }
  // }

  // Private methods
  private getServiceURL(): string {
    const container: ContainerInfo = this.inspectContainer()[0];
    const portBindings = container.HostConfig.PortBindings["8010/tcp"];
    if (container) {
      const containerIp = portBindings[0].HostIp
        ? portBindings[0].HostIp
        : this.ip;
      const containerPort = portBindings[0].HostPort
        ? portBindings[0].HostPort
        : this.port;
      return `http://${containerIp}:${containerPort}${Constants.SERVICE_CHECK_PATH}`;
    } else {
      throw new Error("Container not found.");
    }
  }

  private isPodmanMachineRunning(): boolean {
    // Podman doesn't require a machine on linux
    // Might cause issues on WSL2
    if (process.platform === "linux") {
      return true;
    } else {
      try {
        const result = execa.sync(this.command, [
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
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("unknown error getting podman machine state");
        }
      }
    }
  }

  private isImageAvailable(): boolean {
    try {
      const result = execa.sync(this.command, [
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
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("unknown error getting image state");
      }
    }
  }

  // Container methods
  private inspectContainer(): ContainerInfo[] {
    try {
      const result = execa.sync(this.command, [
        "inspect",
        this.containerName,
        "--format",
        "json",
      ]);
      if (result.exitCode === 0) {
        return result ? JSON.parse(result.stdout) : [];
      } else {
        throw new Error(result.stderr);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("unknown error inspecting container");
      }
    }
  }

  private containerExists(): boolean {
    try {
      const result = execa.sync(this.command, [
        "ps",
        "-a",
        "--format",
        "json",
        "--filter",
        `name=${this.containerName}`,
      ]);
      if (result.exitCode === 0) {
        if (result.stdout === "[]") {
          return false;
        } else {
          return true;
        }
      } else {
        throw new Error(result.stderr);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("unknown error testing if container exists");
      }
    }
  }

  private isContainerRunning(): boolean {
    try {
      const status = this.getContainerStatus();
      if (status === Constants.PODMAN_CONTAINER_STATUS.RUNNING) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("unknown error testing if container is running");
      }
    }
  }

  private getContainerStatus(): string {
    try {
      if (this.isPodmanMachineRunning() && this.containerExists()) {
        const containerInfo: ContainerInfo[] = this.inspectContainer();
        if (containerInfo[0]) {
          return containerInfo[0].State.Status;
        } else {
          throw new Error("Container not found.");
        }
      }
      return Constants.PODMAN_CONTAINER_STATUS.UNKNOWN;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("unknown error getting container status");
      }
    }
  }

  private getContainerHealth(): string {
    if (this.isPodmanMachineRunning() && this.containerExists()) {
      try {
        const containerInfo: ContainerInfo[] = this.inspectContainer();
        if (containerInfo[0].State.Health.Status) {
          return containerInfo[0].State.Health.Status;
        } else {
          throw new Error("Container not found.");
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("unknown error getting container health");
        }
      }
    }
    return Constants.PODMAN_CONTAINER_HEALTH.UNKNOWN;
  }

  private isContainerHealthy(): boolean {
    if (this.isPodmanMachineRunning() && this.containerExists()) {
      try {
        const containerInfo: ContainerInfo[] = this.inspectContainer();
        if (containerInfo[0].State.Health.Status === "healthy") {
          return true;
        } else {
          return false;
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("unknown error testing if container is healthy");
        }
      }
    } else {
      return false;
    }
  }

  private renameContainer(newName: string): void {
    try {
      const result = execa.sync(this.command, [
        "rename",
        this.containerName,
        newName,
      ]);
      if (result.exitCode === 0) {
        this.containerName = newName;
      } else {
        throw new Error(result.stderr);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error("unknown error renaming container");
      }
    }
  }
}
