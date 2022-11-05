import * as assert from "assert";
import * as vscode from "vscode";
import * as Constants from "../../src/Constants";
import { ExternalService } from "../../src/services/ExternalService";

suite("ExternalService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();

  // ExternalService Tests
  let service: ExternalService;

  test("ExternalService should instantiate", function () {
    service = new ExternalService(config);
    assert.ok(service);
  });

  test("ExternalService should NOT be pingable", function () {
    return service
      .ping()
      .then((result) => {
        assert.strictEqual(result, false);
      })
      .catch((err) => {
        assert.notStrictEqual(
          err,
          new Error("LanguageTool URL is not defined."),
        );
      });
  });

  test("ExternalService should start", function () {
    this.timeout(20000);
    return service
      .start()
      .then(() => {
        assert.strictEqual(service.getState(), Constants.SERVICE_STATES.READY);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ExternalService should respond to ping.", function () {
    return service
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
    return service
      .stop()
      .then(() => {
        assert.strictEqual(
          service.getState(),
          Constants.SERVICE_STATES.STOPPED,
        );
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ExternalService should NOT respond to ping", function () {
    return service
      .ping()
      .then((result) => {
        assert.strictEqual(result, false);
      })
      .catch((err) => {
        assert.ok(err);
      });
  });
});
