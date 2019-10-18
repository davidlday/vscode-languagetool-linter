// import { CancellationToken, FormattingOptions, OnTypeFormattingEditProvider, Position, TextDocument, TextEdit, TextLine, Range } from 'vscode';
import * as vscode from 'vscode';

export class SmartQuotesFormattingProvider implements vscode.OnTypeFormattingEditProvider {
  private readonly startDoubleQuote: string = '“';
  private readonly endDoubleQuote: string = '”';
  private readonly startSingleQuote: string = '‘';
  private readonly endSingleQuote: string = '’';
  static readonly triggers: string[] = ['"', "'"];

  public provideOnTypeFormattingEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    ch: string,
    options: vscode.FormattingOptions,
    cancellationToken: vscode.CancellationToken): vscode.TextEdit[] {

    const line: vscode.TextLine = document.lineAt(position.line);
    const chRange: vscode.Range = new vscode.Range(position.line, position.character - 1, position.line, position.character);
    const prevCh: string = (position.character > 0) ? line.text.charAt(position.character - 2) : " ";
    const nextCh: string = (position.character < line.text.length) ? line.text.charAt(line.text.length + 1) : " ";

    switch (ch) {
      case '"':
        if (prevCh === " ") {
          return [new vscode.TextEdit(chRange, this.startDoubleQuote)];
        } else if (nextCh === " ") {
          return [new vscode.TextEdit(chRange, this.endDoubleQuote)];
        }
        break;
      case "'":
        if ([" ", '"', this.startDoubleQuote].indexOf(prevCh) !== -1) {
          return [new vscode.TextEdit(chRange, this.startSingleQuote)];
        } else {
          return [new vscode.TextEdit(chRange, this.endSingleQuote)];
        }
      default:
        break;
    }
    if (ch === '"') {
    }
    return [];
  }
}
