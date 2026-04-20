import * as assert from "assert";
import * as vscode from "vscode";
import { OnTypeFormattingDispatcher } from "../../src/OnTypeFormattingDispatcher";

suite("OnTypeFormattingDispatcher Test Suite", () => {
  test("should dispatch to matching provider", () => {
    const provider: vscode.OnTypeFormattingEditProvider = {
      provideOnTypeFormattingEdits: (
        _document,
        position,
        _ch,
        _options,
        _token,
      ) => [vscode.TextEdit.insert(position, "x")],
    };

    const dispatcher = new OnTypeFormattingDispatcher({
      ".": provider,
    });

    const result = dispatcher.provideOnTypeFormattingEdits(
      {} as vscode.TextDocument,
      new vscode.Position(0, 0),
      ".",
      { tabSize: 2, insertSpaces: true },
      {
        isCancellationRequested: false,
        onCancellationRequested: () => new vscode.Disposable(() => {}),
      },
    ) as vscode.TextEdit[];

    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].newText, "x");
  });

  test("should return empty edits for unknown trigger", () => {
    const dispatcher = new OnTypeFormattingDispatcher({});
    const result = dispatcher.provideOnTypeFormattingEdits(
      {} as vscode.TextDocument,
      new vscode.Position(0, 0),
      "?",
      { tabSize: 2, insertSpaces: true },
      {
        isCancellationRequested: false,
        onCancellationRequested: () => new vscode.Disposable(() => {}),
      },
    ) as vscode.TextEdit[];

    assert.deepStrictEqual(result, []);
  });
});
