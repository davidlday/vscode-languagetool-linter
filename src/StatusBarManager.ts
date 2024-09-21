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
import { ILanguageToolResponse } from "./Interfaces";

export class StatusBarManager implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private readonly configManager: ConfigurationManager;
  private ltSoftware: ILanguageToolResponse["software"] | undefined;

  public constructor(configManager: ConfigurationManager) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
    );
    this.configManager = configManager;
    this.refreshToolTip();
    this.setIdle();
    this.statusBarItem.command = "languagetoolLinter.checkDocument";
    this.show();
  }

  public hide(): void {
    this.statusBarItem.hide();
  }

  public show(): void {
    this.statusBarItem.show();
  }

  public setChecking(): void {
    if (this.statusBarItem) {
      this.statusBarItem.text = `$(loading~spin) LT`;
    }
  }

  public setIdle(): void {
    if (this.statusBarItem) {
      this.statusBarItem.text = `$(book) LT`;
    }
  }

  public setLtSoftware(ltSoftware: ILanguageToolResponse["software"]): void {
    this.ltSoftware = ltSoftware;
    this.refreshToolTip();
  }

  public refreshToolTip(): void {
    const tip: vscode.MarkdownString = new vscode.MarkdownString(
      "### Linting On:\n  * Demand",
    );
    if (this.configManager.isLintingSuspended()) {
      tip.appendMarkdown(" _(temporary)_");
    }
    if (this.configManager.isLintOnOpen()) {
      tip.appendMarkdown("\n  * Open");
    }
    if (this.configManager.isLintOnChange()) {
      tip.appendMarkdown("\n  * Change");
    }
    if (this.configManager.isLintOnSave()) {
      tip.appendMarkdown("\n  * Save");
    }
    if (this.ltSoftware?.version) {
      tip.appendMarkdown(
        `\n\n### LT Info: \n * Version: ${this.ltSoftware.version}`,
      );
      tip.appendMarkdown(`\n * API Version: ${this.ltSoftware.apiVersion}\n`);
      const premium = this.ltSoftware.premium ? "Enabled" : "Not Enabled";
      tip.appendMarkdown(`\n * Premium: ${premium}\n`);
    } else {
      tip.appendMarkdown("\n\nLT Info will be detected on first lint.");
    }
    tip.appendMarkdown("\n_Click to check._");
    this.statusBarItem.tooltip = tip;
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
