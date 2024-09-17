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
import { ConfigurationManager } from "./ConfigurationManager";

export default class StatusBarManager {
  private _statusBarItem: vscode.StatusBarItem;
  private readonly configManager: ConfigurationManager;

  public constructor(
    context: vscode.ExtensionContext,
    configManager: ConfigurationManager,
  ) {
    this._statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
    );
    this.configManager = configManager;
    this.setTooltip();
    context.subscriptions.push(this._statusBarItem);
    this._statusBarItem.show();
  }

  public setChecking(): void {
    if (this._statusBarItem) {
      this._statusBarItem.tooltip = "Checking.";
      this._statusBarItem.text = `$(gear~spinning)`;
    }
  }

  public setIdle(): void {
    if (this._statusBarItem) {
      this._statusBarItem.tooltip = "Idle.";
      this._statusBarItem.text = `$(book)`;
    }
  }

  private setTooltip(): void {
    const lintOnOpen = this.configManager.isLintOnOpen();
    const lintOnSave = this.configManager.isLintOnChange();
    const lintOnChange = this.configManager.isLintOnChange();
    let tip = "LanguageTool Linter:";
    if (!lintOnOpen && !lintOnChange && !lintOnSave) {
      if (lintOnOpen) {
        tip += "\n  * Lint on Open";
      }
      if (lintOnChange) {
        tip += "\n  * Lint on Change";
      }
      if (lintOnOpen) {
        tip += "\n  * Lint on Open";
      }
    } else {
      tip += "\n * Lint on Demand";
    }
    this._statusBarItem.tooltip = tip;
  }
}
