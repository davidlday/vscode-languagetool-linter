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
import * as vscode from "vscode";

export default class StatusBarManager {
  private _statusBarItem: vscode.StatusBarItem;
  private _statusStarting: string = "starting";
  private _statusChecking: string = "checking";
  private _statusIdle: string = "idle";
  private _statusStopping: string = "stopping";

  public constructor(context: vscode.ExtensionContext) {
    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
    );
    this._statusBarItem.tooltip = "LanguageTool Linter";
    this._statusBarItem.text = `$(gear~spin) ${this._statusIdle}.`;
    context.subscriptions.push(this._statusBarItem);
    this._statusBarItem.show();
  }

  public setChecking(): void {
    if (this._statusBarItem) {
      this._statusBarItem.tooltip = "Checking.";
      this._statusBarItem.text = `$(gear~spinning)`;
    }
  }
}
