import * as assert from "assert";
import * as vscode from "vscode";
import * as Constants from "../../src/Constants.js";
import { ConfigurationManager } from "../../src/ConfigurationManager.js";

suite("ConfigurationManager Test Suite", () => {
  test("ConfigurationManager should load configuration", () => {
    assert.ok(vscode.workspace.getConfiguration(Constants.CONFIGURATION_ROOT));
  });

  test("ConfigurationManager should return the default service URL", () => {
    const EXPECTED_DEFAULT_URL = "http://localhost:8081/v2/check";
    const config: ConfigurationManager = new ConfigurationManager();
    assert.equal(EXPECTED_DEFAULT_URL, config.getUrl());
  });
});
