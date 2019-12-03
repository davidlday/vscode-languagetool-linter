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

import * as vscode from 'vscode';
import { ConfigurationManager } from '../common/configuration-manager';

export class QuotesFormattingProvider implements vscode.OnTypeFormattingEditProvider {
  static readonly startDoubleQuote: string = '“';
  static readonly endDoubleQuote: string = '”';
  static readonly startSingleQuote: string = '‘';
  static readonly endSingleQuote: string = '’';
  static readonly doubleQuote: string = '"';
  static readonly singleQuote: string = "'";
  private readonly config: ConfigurationManager;
  static readonly triggers: string[] = ['"', "'"];

  constructor(config: ConfigurationManager) {
    this.config = config;
  }

  public provideOnTypeFormattingEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    ch: string,
    options: vscode.FormattingOptions,
    cancellationToken: vscode.CancellationToken): vscode.TextEdit[] {

    const line: vscode.TextLine = document.lineAt(position.line);
    const chRange: vscode.Range = new vscode.Range(position.line, position.character - 1, position.line, position.character);
    const prevCh: string = (position.character > 1) ? line.text.charAt(position.character - 2) : " ";
    const nextCh: string = (position.character < line.text.length) ? line.text.charAt(line.text.length + 1) : " ";

    if (this.config.isSmartFormatEnabled()) {
      switch (ch) {
        case QuotesFormattingProvider.doubleQuote:
          if (prevCh === " ") {
            return [new vscode.TextEdit(chRange, QuotesFormattingProvider.startDoubleQuote)];
          } else if (nextCh === " ") {
            return [new vscode.TextEdit(chRange, QuotesFormattingProvider.endDoubleQuote)];
          }
          break;
        case QuotesFormattingProvider.singleQuote:
          if ([" ", '"', QuotesFormattingProvider.startDoubleQuote].indexOf(prevCh) !== -1) {
            return [new vscode.TextEdit(chRange, QuotesFormattingProvider.startSingleQuote)];
          } else {
            return [new vscode.TextEdit(chRange, QuotesFormattingProvider.endSingleQuote)];
          }
        default:
          break;
      }
    }
    return [];
  }

}
