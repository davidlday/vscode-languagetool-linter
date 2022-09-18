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
import { Disposable, workspace, WorkspaceConfiguration } from "vscode";
import * as Constants from "./Constants";

export interface ContainerInfo {
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
        HostPort: string;
      }[];
    };
  };
}

export interface MachineInfo {
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

export class PodmanService implements Disposable {
  private config: WorkspaceConfiguration;
  private containerName: string;
  private imageName: string;

  // Constructor
  constructor(imageName: string, containerName: string) {
    this.config = workspace.getConfiguration(Constants.CONFIGURATION_ROOT);
    this.containerName = containerName;
    this.imageName = imageName;
  }

  // Private instance methods
  private machineInfo(): MachineInfo {
    const result = execa.sync("podman", [
      "machine",
      "info",
      "--format",
      "json",
    ]);
    return JSON.parse(result.stdout);
  }

  private inspectContainer(): ContainerInfo[] {
    const result = execa.sync("podman", [
      "inspect",
      this.containerName,
      "--format",
      "json",
    ]);
    return JSON.parse(result.stdout);
  }

  private startContainer(): void {
    execa.sync("podman", ["start", this.containerName]);
  }

  private stopContainer(): void {
    execa.sync("podman", ["stop", this.containerName]);
  }

  private startMachine(): void {
    execa.sync("podman", ["machine", "start"]);
  }

  // Public instance methods
  public run(): void {
    execa.sync("podman", [
      "run",
      "-d",
      "-p",
      ":8010",
      "--name",
      this.containerName,
      this.imageName,
    ]);

    // Wait for the container to start
    while (!this.isRunning()) {
      // Do nothing
    }
  }

  public dispose(): void {
    this.stop();
  }

  public start(): void {
    if (this.machineInfo().Host.MachineState !== "Running") {
      this.startMachine();
    }
    this.startContainer();
  }

  public stop(): void {
    this.stopContainer();
  }

  public isRunning(): boolean {
    return this.machineInfo().Host.MachineState === "Running"
      ? this.inspectContainer()[0].State.Running
      : false;
  }

  public rename(newName: string): void {
    execa.sync("podman", ["rename", this.containerName, newName]);
    this.containerName = newName;
  }

  public port(): string {
    const containerInfo: ContainerInfo[] = this.inspectContainer();
    return containerInfo[0].HostConfig.PortBindings["8010/tcp"][0].HostPort;
  }

  public name(): string {
    return this.containerName;
  }
}
