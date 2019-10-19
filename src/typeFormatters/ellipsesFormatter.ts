// import { CancellationToken, FormattingOptions, OnTypeFormattingEditProvider, Position, TextDocument, TextEdit, TextLine, Range } from 'vscode';
import * as vscode from 'vscode';

export class EllipsesFormattingProvider implements vscode.OnTypeFormattingEditProvider {
  private readonly ellipses: string = '…';
  private readonly period: string = '.';
  static readonly triggers: string[] = ['.'];

  public provideOnTypeFormattingEdits(
    document: vscode.TextDocument,
    position: vscode.Position,
    ch: string,
    options: vscode.FormattingOptions,
    cancellationToken: vscode.CancellationToken): vscode.TextEdit[] {

    const line: vscode.TextLine = document.lineAt(position.line);
    const range: vscode.Range = new vscode.Range(position.line, position.character - 3, position.line, position.character);
    const prevCh: string = (position.character > 0) ? line.text.charAt(position.character - 2) : " ";
    const prevPrevCh: string = (position.character > 1) ? line.text.charAt(position.character - 3) : " ";

    if (prevCh === this.period && prevPrevCh === this.period) {
      return [new vscode.TextEdit(range, this.ellipses)];
    }
    return [];
  }
}


