import * as assert from "assert";
// tslint:disable-next-line: no-implicit-dependencies
import { before } from "mocha";
import * as vscode from "vscode";
import * as Constants from "../../src/Constants";

suite("Extension Test Suite", () => {
  before(() => {
    vscode.window.showInformationMessage("Start all tests.");
  });

  test("Extension should be present", () => {
    assert.ok(vscode.extensions.getExtension("davidlday.languagetool-linter"));
  });

  test("Extension should activate", function () {
    this.timeout(60000);
    const ext: vscode.Extension<unknown> | undefined =
      vscode.extensions.getExtension("davidlday.languagetool-linter");
    if (ext) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ext.activate().then((api: unknown) => {
        assert.ok(true);
      });
    } else {
      assert.ok(false);
    }
  });

  test("Extension should register all commands", () => {
    return vscode.commands.getCommands(true).then((commands) => {
      const FOUND_COMMANDS = commands.filter((value) => {
        return (
          Constants.COMMAND_STRINGS.indexOf(value) >= 0 ||
          value.startsWith("languagetoolLinter.")
        );
      });
      const MISSING_COMMANDS = Constants.COMMAND_STRINGS.filter(
        (item) => FOUND_COMMANDS.indexOf(item) < 0,
      );
      assert.equal(
        FOUND_COMMANDS.length,
        Constants.COMMAND_STRINGS.length,
        `The following commands were not found: ${MISSING_COMMANDS}`,
      );
    });
  });
});
