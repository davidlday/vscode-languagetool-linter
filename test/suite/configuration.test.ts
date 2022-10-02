import * as assert from "assert";
import * as vscode from "vscode";
import * as Constants from "../../src/Constants";
import { ConfigurationManager } from "../../src/ConfigurationManager";

suite("ConfigurationManager Test Suite", () => {
  test("ConfigurationManager should load configuration", () => {
    assert.ok(vscode.workspace.getConfiguration(Constants.CONFIGURATION_ROOT));
  });

  test("ConfigurationManager should instantiate", () => {
    const config: ConfigurationManager = new ConfigurationManager();
    assert.ok(config);
  });
});
