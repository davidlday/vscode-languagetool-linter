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

  test("Extension should activate", function() {
    this.timeout(60000);
    const ext: any = vscode.extensions.getExtension(
      "davidlday.languagetool-linter"
    );
    return ext.activate().then((api: any) => {
      assert.ok(true);
    });
  });

  test("Extension should register all commands", () => {
    return vscode.commands.getCommands(true).then((commands) => {
      const EXPECTED_COMMANDS: string[] = [
        "languagetoolLinter.lintCurrentDocument",
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
      assert.equal(
        FOUND_COMMANDS.length,
        EXPECTED_COMMANDS.length,
        "Either not all commands are registered or new commands have not been added to this test."
      );
    });
  });
});
