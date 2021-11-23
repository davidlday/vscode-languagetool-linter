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

export class FormattingProviderQuotes
  implements vscode.OnTypeFormattingEditProvider {
  public static readonly startDoubleQuote: string = "“";
  public static readonly endDoubleQuote: string = "”";
  public static readonly startSingleQuote: string = "‘";
  public static readonly endSingleQuote: string = "’";
  public static readonly doubleQuote: string = '"';
  public static readonly singleQuote: string = "'";
  public static readonly triggers: string[] = [
    FormattingProviderQuotes.doubleQuote,
    FormattingProviderQuotes.singleQuote,
  ];

  private readonly config: ConfigurationManager;

  constructor(config: ConfigurationManager) {
    this.config = config;
  }

  public provideOnTypeFormattingEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    ch: string,
    _options: vscode.FormattingOptions,
    _cancellationToken: vscode.CancellationToken,
  ): vscode.TextEdit[] {
    const line: vscode.TextLine = document.lineAt(position.line);
    const chRange: vscode.Range = new vscode.Range(
      position.line,
      position.character - 1,
      position.line,
      position.character,
    );
    const prevCh: string =
      position.character > 1 ? line.text.charAt(position.character - 2) : " ";
    const _nextCh: string =
      position.character < line.text.length
        ? line.text.charAt(line.text.length + 1)
        : " ";

    if (this.config.isSmartFormatOnType()) {
      switch (ch) {
        case FormattingProviderQuotes.doubleQuote:
          if (
            [
              " ",
              FormattingProviderQuotes.singleQuote,
              FormattingProviderQuotes.startSingleQuote,
            ].indexOf(prevCh) !== -1
          ) {
            return [
              new vscode.TextEdit(
                chRange,
                FormattingProviderQuotes.startDoubleQuote,
              ),
            ];
          } else {
            return [
              new vscode.TextEdit(
                chRange,
                FormattingProviderQuotes.endDoubleQuote,
              ),
            ];
          }
          break;
        case FormattingProviderQuotes.singleQuote:
          if (
            [
              " ",
              FormattingProviderQuotes.doubleQuote,
              FormattingProviderQuotes.startDoubleQuote,
            ].indexOf(prevCh) !== -1
          ) {
            return [
              new vscode.TextEdit(
                chRange,
                FormattingProviderQuotes.startSingleQuote,
              ),
            ];
          } else {
            return [
              new vscode.TextEdit(
                chRange,
                FormattingProviderQuotes.endSingleQuote,
              ),
            ];
          }
        default:
          break;
      }
    }
    return [];
  }
}
