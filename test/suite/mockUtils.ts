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

import * as path from "path";
import { Disposable, ExtensionContext, Memento } from "vscode";

export class MockMemento implements Memento {
  private map: Map<string, unknown> = new Map<string, unknown>();

  get(key: string, defaultValue?: unknown): unknown {
    return this.map.has(key) ? this.map.get(key) : defaultValue;
  }

  update(key: string, value: unknown): Thenable<void> {
    return new Promise((resolve) => {
      this.map.set(key, value);
      resolve();
    });
  }
}

export class MockExtensionContext implements ExtensionContext, Disposable {
  readonly extensionPath: string = path.resolve(__dirname, "..", "..");
  private readonly mockContextRoot = path.resolve(
    this.extensionPath,
    "../test-fixtures/mock-context",
  );

  public readonly subscriptions: { dispose(): unknown }[] = [];
  readonly workspaceState: Memento = new MockMemento();
  readonly globalState: Memento = new MockMemento();
  public storagePath: string = path.resolve(
    this.mockContextRoot,
    "storagePath",
  );
  public globalStoragePath: string = path.resolve(
    this.mockContextRoot,
    "globalStoragePath",
  );
  public logPath: string = path.resolve(__dirname, "logPath");

  asAbsolutePath(relativePath: string): string {
    return path.resolve(this.mockContextRoot, relativePath);
  }

  dispose(): void {
    this.subscriptions.forEach((subscription) => subscription.dispose());
  }
}
