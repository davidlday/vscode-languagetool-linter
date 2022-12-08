import * as assert from "assert";
// tslint:disable-next-line: no-implicit-dependencies
import { before } from "mocha";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  before(() => {
    vscode.window.showInformationMessage("Start all tests.");
  });

  test("Extension should be present", () => {
    assert.ok(vscode.extensions.getExtension("davidlday.languagetool-linter"));
  });

  test("Extension should activate", async () => {
    const ext: vscode.Extension<unknown> | undefined =
      vscode.extensions.getExtension("davidlday.languagetool-linter");
    await ext?.activate();
    assert.ok(ext?.isActive);
  });

  test("Extension should register all commands", async () => {
    return await vscode.commands.getCommands(true).then((commands) => {
      const EXPECTED_COMMANDS: string[] = [
        "languagetoolLinter.checkDocument",
        "languagetoolLinter.checkDocumentAsPlainText",
        "languagetoolLinter.clearDocumentDiagnostics",
        "languagetoolLinter.smartFormatDocument",
        "languagetoolLinter.ignoreWordGlobally",
        "languagetoolLinter.ignoreWordInWorkspace",
        "languagetoolLinter.removeGloballyIgnoredWord",
        "languagetoolLinter.removeWorkspaceIgnoredWord",
      ];
      const FOUND_COMMANDS = commands.filter((value) => {
        return (
          EXPECTED_COMMANDS.indexOf(value) >= 0 ||
          value.startsWith("languagetoolLinter.")
        );
      });
      assert.strictEqual(
        FOUND_COMMANDS.length,
        EXPECTED_COMMANDS.length,
        "Either not all commands are registered or new commands have not been added to this test.",
      );
    });
  });
});
