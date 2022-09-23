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

import { ExecaChildProcess } from "execa";
import { Disposable } from "vscode";
import { ILanguageToolService } from "../Interfaces";

export class ManagedService implements Disposable, ILanguageToolService {
  public dispose(): void {
    throw new Error("Method not implemented.");
  }

  public start(): ExecaChildProcess<string> {
    throw new Error("Method not implemented.");
  }

  public stop(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  public getHost(): string {
    throw new Error("Method not implemented.");
  }

  public getPort(): number {
    throw new Error("Method not implemented.");
  }

  public getURL(): string {
    throw new Error("Method not implemented.");
  }

  public ping(): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}
