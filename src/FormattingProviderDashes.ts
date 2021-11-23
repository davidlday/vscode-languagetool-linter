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

export class FormattingProviderDashes
  implements vscode.OnTypeFormattingEditProvider {
  public static readonly emDash: string = "—";
  public static readonly enDash: string = "–";
  public static readonly hyphen: string = "-";
  public static readonly triggers: string[] = ["-"];

  private readonly config: ConfigurationManager;

  constructor(config: ConfigurationManager) {
    this.config = config;
  }

  public provideOnTypeFormattingEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    _ch: string,
    _options: vscode.FormattingOptions,
    _cancellationToken: vscode.CancellationToken,
  ): vscode.TextEdit[] {
    const line: vscode.TextLine = document.lineAt(position.line);
    const range: vscode.Range = new vscode.Range(
      position.line,
      position.character - 2,
      position.line,
      position.character,
    );
    const prevCh: string =
      position.character > 0 ? line.text.charAt(position.character - 2) : " ";
    const prevPrevCh: string =
      position.character > 1 ? line.text.charAt(position.character - 3) : " ";

    if (this.config.isSmartFormatOnType()) {
      if (prevCh === FormattingProviderDashes.enDash) {
        return [new vscode.TextEdit(range, FormattingProviderDashes.emDash)];
      } else if (prevCh === FormattingProviderDashes.hyphen) {
        if (prevPrevCh === FormattingProviderDashes.hyphen) {
          const expandedRange: vscode.Range = new vscode.Range(
            position.line,
            position.character - 3,
            position.line,
            position.character,
          );
          return [
            new vscode.TextEdit(expandedRange, FormattingProviderDashes.emDash),
          ];
        } else {
          return [new vscode.TextEdit(range, FormattingProviderDashes.enDash)];
        }
      }
    }
    return [];
  }
}
