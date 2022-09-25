import * as assert from "assert";
import * as vscode from "vscode";
import { SERVICE_STATES } from "../../src/Constants";
import { ExternalService } from "../../src/services/ExternalService";

suite("ExternalService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();

  // ExternalService Tests
  let externalservice: ExternalService;

  test("ExternalService should instantiate", function () {
    externalservice = new ExternalService(config);
    assert.ok(externalservice);
  });

  test("ExternalService should NOT be pingable", function () {
    return externalservice
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

  test("ExternalService should start", function () {
    this.timeout(10000);
    return externalservice
      .start()
      .then(() => {
        assert.strictEqual(externalservice.getState(), SERVICE_STATES.RUNNING);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ExternalService should respond to ping.", function () {
    return externalservice
      .ping()
      .then((result) => {
        assert.ok(result);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ExternalService should stop", function () {
    this.timeout(12000);
    return externalservice
      .stop()
      .then(() => {
        assert.strictEqual(externalservice.getState(), SERVICE_STATES.STOPPED);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ExternalService should NOT respond to ping", function () {
    return externalservice
      .ping()
      .then((result) => {
        assert.strictEqual(result, false);
      })
      .catch((err) => {
        assert.ok(err);
      });
  });
});
