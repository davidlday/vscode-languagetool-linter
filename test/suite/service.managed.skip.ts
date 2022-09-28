import * as assert from "assert";
import * as vscode from "vscode";
import { SERVICE_STATES } from "../../src/Constants";
import { ManagedService } from "../../src/services/ManagedService";

suite("ManagedService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();

  // ManagedService Tests
  let managedservice: ManagedService;

  test("ManagedService should instantiate", function () {
    // If testing environment variables are defined, inject them into the config
    if (process.env.LANGUAGETOOL_MANAGED_CLASSPATH) {
      config.update(
        "languageToolLinter.managed.classPath",
        process.env.LANGUAGETOOL_MANAGED_CLASSPATH,
      );
    }
    managedservice = new ManagedService(config);
    assert.ok(managedservice);
  });

  test("ManagedService should NOT be pingable", function () {
    return managedservice
      .ping()
      .then((result) => {
        assert.ok(!result);
      })
      .catch((err) => {
        assert.notStrictEqual(
          err,
          new Error("LanguageTool URL is not defined."),
        );
      });
  });

  test("ManagedService should start", function () {
    this.timeout(20000);
    return managedservice
      .start()
      .then(() => {
        assert.strictEqual(managedservice.getState(), SERVICE_STATES.READY);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ManagedService should respond to ping.", function () {
    return managedservice
      .ping()
      .then((result) => {
        assert.ok(result);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ManagedService should stop", function () {
    this.timeout(12000);
    return managedservice
      .stop()
      .then(() => {
        assert.strictEqual(managedservice.getState(), SERVICE_STATES.STOPPED);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ManagedService should NOT respond to ping", function () {
    return managedservice
      .ping()
      .then((result) => {
        assert.strictEqual(result, false);
      })
      .catch((err) => {
        assert.ok(err);
      });
  });
});
