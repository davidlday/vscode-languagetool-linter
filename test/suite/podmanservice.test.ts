import * as assert from "assert";
import * as vscode from "vscode";
import { PodmanService } from "../../src/services/PodmanService";

suite("PodmanService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();
  let podman: PodmanService;

  test("PodmanService should instantiate", function () {
    podman = new PodmanService(config);
    assert.ok(podman);
  });

  test("PodmanService should NOT be pingable", function () {
    return podman
      .ping()
      .then((result) => {
        assert.ok(!result);
      })
      .catch((err) => {
        assert.notStrictEqual(err, new Error("Podman URL is not defined."));
      });
  });

  test("PodmanService should start", function () {
    this.timeout(10000);
    return podman
      .start()
      .then((result) => {
        assert.ok(result);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("PodmanService should respond to ping.", function () {
    return podman
      .ping()
      .then((result) => {
        assert.ok(result);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("PodmanService should stop and not respond to ping", function () {
    this.timeout(12000);
    return podman.stop().catch((err) => {
      assert.fail(err);
    });
  });

  test("PodmanService should NOT respond to ping", function () {
    return podman
      .ping()
      .then((result) => {
        assert.strictEqual(result, false);
      })
      .catch((err) => {
        assert.ok(err);
      });
  });
});
