// import { CancellationToken, FormattingOptions, OnTypeFormattingEditProvider, Position, TextDocument, TextEdit, TextLine, Range } from 'vscode';
import * as vscode from 'vscode';

export class SmartQuotesFormatter implements vscode.OnTypeFormattingEditProvider {
    // private readonly formatter = new LineFormatter();
    private readonly startRegEx: RegExp = /(^|\s+)"/;
    private readonly startQuote: string = '“';

    public provideOnTypeFormattingEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        ch: string,
        options: vscode.FormattingOptions,
        cancellationToken: vscode.CancellationToken): vscode.TextEdit[] {

        if (ch === '"') {

          const line: vscode.TextLine = document.lineAt(position.line);
          const chRange: vscode.Range = new vscode.Range(position, position);
          const prevCh: string = (position.character > 0) ? line.text.charAt(position.character - 1) : " ";
          const nextCh: string = (position.character < line.text.length) ? line.text.charAt(line.text.length + 1) : " ";
          if (prevCh === " ") {
            return [new vscode.TextEdit(chRange, '“')]
          } else if (nextCh === " ") {
            return [new vscode.TextEdit(chRange, '”')]
          }

        }

        return [];
    }
}
