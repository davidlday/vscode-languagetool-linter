import * as assert from "assert";
import * as vscode from "vscode";
import { ConfigurationManager } from "../../src/ConfigurationManager";
import { ILanguageToolResponse } from "../../src/Interfaces";
import { Linter } from "../../src/Linter";

function buildResponseWithMatch(
  offset: number,
  length: number,
): ILanguageToolResponse {
  return {
    software: {
      name: "lt",
      version: "0",
      buildDate: "",
      apiVersion: 1,
      premium: false,
      premiumHint: "",
      status: "ok",
    },
    warnings: { incompleteResults: false },
    language: {
      name: "English",
      code: "en",
      detectedLanguage: {
        name: "English",
        code: "en",
        confidence: 1,
      },
    },
    matches: [
      {
        message: "Bad match",
        shortMessage: "",
        offset,
        length,
        replacements: [{ value: "x", shortDescription: "" }],
        context: { text: "hello", offset: 0, length: 5 },
        sentence: "hello",
        type: { typeName: "Other" },
        rule: {
          id: "TEST_RULE",
          description: "test",
          issueType: "misspelling",
          category: { id: "TYPOS", name: "Typos" },
        },
        ignoreForIncompleteSentence: false,
        contextForSureMatch: 0,
      },
    ],
  };
}

suite("Linter Phase 3 Hardening Suite", () => {
  const configManager = new ConfigurationManager();
  const linter = new Linter(configManager);

  test("provideCodeActions should return early when cancelled", () => {
    const cancelledToken = {
      isCancellationRequested: true,
      onCancellationRequested: () => new vscode.Disposable(() => {}),
    } as vscode.CancellationToken;

    const actions = linter.provideCodeActions(
      {} as vscode.TextDocument,
      {} as vscode.Range,
      { diagnostics: [], only: undefined, triggerKind: 1 },
      cancelledToken,
    );

    assert.deepStrictEqual(actions, []);
  });

  test("suggest should ignore invalid LanguageTool match ranges", async () => {
    const doc = await vscode.workspace.openTextDocument({
      language: "markdown",
      content: "hello",
    });

    const response = buildResponseWithMatch(999, 10);
    (
      linter as unknown as {
        suggest: (
          document: vscode.TextDocument,
          ltResponse: ILanguageToolResponse,
        ) => void;
      }
    ).suggest(doc, response);

    const diagnostics = linter.diagnosticCollection.get(doc.uri) ?? [];
    assert.strictEqual(diagnostics.length, 0);
  });
});
