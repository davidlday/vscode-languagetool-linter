import * as assert from "assert";
import * as vscode from "vscode";
import { SERVICE_STATES } from "../../src/Constants";
import { PublicService } from "../../src/services/PublicService";

suite("PublicService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();

  // PublicService Tests
  let publicservice: PublicService;

  test("PublicService should instantiate", function () {
    publicservice = new PublicService(config);
    assert.ok(publicservice);
  });

  test("PublicService should NOT be pingable", function () {
    return publicservice
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

  test("PublicService should start", function () {
    this.timeout(10000);
    return publicservice
      .start()
      .then(() => {
        assert.strictEqual(publicservice.getState(), SERVICE_STATES.RUNNING);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("PublicService should respond to ping.", function () {
    return publicservice
      .ping()
      .then((result) => {
        assert.ok(result);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("PublicService should stop", function () {
    this.timeout(12000);
    return publicservice
      .stop()
      .then(() => {
        assert.strictEqual(publicservice.getState(), SERVICE_STATES.STOPPED);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("PublicService should NOT respond to ping", function () {
    return publicservice
      .ping()
      .then((result) => {
        assert.strictEqual(result, false);
      })
      .catch((err) => {
        assert.ok(err);
      });
  });
});
