import * as assert from "assert";
import * as vscode from "vscode";
import { ExtensionContext } from "vscode";
import * as Constants from "../../configuration/constants";
import { ConfigurationManager } from "../../configuration/manager";
import { MockExtensionContext } from "./mockUtils";

suite("ConfigurationManager Test Suite", () => {
  const testContext: ExtensionContext = new MockExtensionContext();

  test("ConfigurationManager should load configuration", () => {
    assert.ok(vscode.workspace.getConfiguration(Constants.CONFIGURATION_ROOT));
  });

  test("ConfigurationManager should return the default service URL", () => {
    const EXPECTED_DEFAULT_URL = "";
    const config: ConfigurationManager = new ConfigurationManager(
      testContext as ExtensionContext,
    );
    assert.strictEqual(EXPECTED_DEFAULT_URL, config.getServiceUrl());
  });
});
