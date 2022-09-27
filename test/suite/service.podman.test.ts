import * as assert from "assert";
import * as vscode from "vscode";
import { SERVICE_STATES } from "../../src/Constants";
import { PodmanService } from "../../src/services/PodmanService";

suite("PodmanService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();

  // PodmanService Tests
  let podmanservice: PodmanService;

  test("PodmanService should instantiate", function () {
    podmanservice = new PodmanService(config);
    assert.ok(podmanservice);
  });

  test("PodmanService should NOT be pingable", function () {
    return podmanservice
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

  test("PodmanService should start", function () {
    this.timeout(20000);
    return podmanservice
      .start()
      .then(() => {
        assert.strictEqual(podmanservice.getState(), SERVICE_STATES.READY);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("PodmanService should respond to ping.", function () {
    return podmanservice
      .ping()
      .then((result) => {
        assert.ok(result);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("PodmanService should stop", function () {
    this.timeout(12000);
    return podmanservice
      .stop()
      .then(() => {
        assert.strictEqual(podmanservice.getState(), SERVICE_STATES.STOPPED);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("PodmanService should NOT respond to ping", function () {
    return podmanservice
      .ping()
      .then((result) => {
        assert.strictEqual(result, false);
      })
      .catch((err) => {
        assert.ok(err);
      });
  });
});
