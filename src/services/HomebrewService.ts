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
import { Disposable } from "vscode";
import { ILanguageToolService } from "../Interfaces";
import { AbstractService } from "./AbstractService";

interface HomebrewServiceInfo {
  name: string;
  service_name: string;
  running: boolean;
  loaded: boolean;
  schedulable: boolean;
  pid: number;
  exit_code: number;
  user: string;
  status: string;
  file: string;
  command: string;
  working_dir: string;
  root_dir: string;
  log_path: string;
  error_log_path: string;
  interval: string;
  cron: string;
}

// Minimal Info for now
interface HomebrewFormulaInfo {
  name: string;
  full_name: string;
  desc: string;
  license: string;
  homepage: string;
  versions: {
    stable: string;
    head: string;
    bottle: string;
  };
  installed: [
    {
      version: string;
    },
  ];
}

export class HomebrewService
  extends AbstractService
  implements Disposable, ILanguageToolService
{
  private command = "brew";

  private isBrewInstalled(): boolean {
    if (process.platform === "win32") {
      return false;
    } else {
      try {
        const result = execa.sync(this.command, ["--version"]);
        if (result.exitCode === 0) {
          return true;
        } else {
          throw new Error(result.stderr);
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("unknown error getting homebrew version");
        }
      }
    }
  }

  private isLanguageToolBrewed(): boolean {
    if (process.platform === "win32") {
      throw new Error("Homebrew doesn't run on windows.");
    } else {
      try {
        const result = execa.sync(this.command, [
          "info",
          "languagetool",
          "--json",
        ]);
        if (result.exitCode === 0) {
          const brewInfo: HomebrewFormulaInfo = JSON.parse(result.stdout);
          if (brewInfo.installed.length > 0) {
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
          throw new Error("unknown error checking if languagetool is brewed");
        }
      }
    }
  }

  private isLanguageToolServiceRunning(): boolean {
    if (process.platform === "win32") {
      throw new Error("Homebrew doesn't run on windows.");
    } else {
      try {
        const result = execa.sync(this.command, [
          "services",
          "info",
          "languagetool",
          "--json",
        ]);
        if (result.exitCode === 0) {
          const brewInfo: HomebrewServiceInfo = JSON.parse(result.stdout);
          return brewInfo.running;
        } else {
          throw new Error(result.stderr);
        }
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error(
            "unknown error checking if languagetool brew service is running",
          );
        }
      }
    }
  }
}
