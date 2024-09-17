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
  private statusBarItem: vscode.StatusBarItem;
  private readonly configManager: ConfigurationManager;

  public constructor(configManager: ConfigurationManager) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
    );
    this.configManager = configManager;
    this.setTooltip();
    this.setIdle();
    this.statusBarItem.show();
  }

  public setChecking(): void {
    if (this.statusBarItem) {
      // this.statusBarItem.tooltip = "Checking.";
      this.statusBarItem.text = `$(gear~spinning)`;
    }
  }

  public setIdle(): void {
    if (this.statusBarItem) {
      // this.statusBarItem.tooltip = "Idle.";
      this.statusBarItem.text = `$(book)`;
    }
  }

  private setTooltip(): void {
    const lintOnOpen: boolean = this.configManager.isLintOnOpen();
    const lintOnSave: boolean = this.configManager.isLintOnChange();
    const lintOnChange: boolean = this.configManager.isLintOnChange();
    let tip = "LanguageTool Linter:";
    if (!lintOnOpen && !lintOnChange && !lintOnSave) {
      tip += "  * Lint on Demand";
    } else {
      if (lintOnOpen) {
        tip += "\n  * Lint on Open";
      }
      if (lintOnChange) {
        tip += "\n  * Lint on Change";
      }
      if (lintOnSave) {
        tip += "\n  * Lint on Save";
      }
    }
    this.statusBarItem.tooltip = tip;
  }

  public dispose(): void {}
}
