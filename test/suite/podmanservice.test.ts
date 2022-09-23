import * as assert from "assert";
import * as vscode from "vscode";
import { PodmanService } from "../../src/services/PodmanService";

suite("PodmanService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();

  const podman = new PodmanService(config);

  test("PodmanService should instantiate", function () {
    assert.ok(podman);
  });

  test("PodmanService should NOT be running", function () {
    podman.ping().then((result) => {
      assert.strictEqual(result, false);
    });
  });

  test("PodmanService should start", function () {
    this.timeout(10000);
    podman.start();
    assert.ok(podman.getPort());
  });

  test("PodmanService should be provide a URL and respond to ping.", function () {
    const url = podman.getURL();
    assert.strictEqual(url, "http://localhost:8081/v2/check");
    podman.ping().then((result) => {
      assert.strictEqual(result, true);
    });
  });

  test("PodmanService should stop", function () {
    this.timeout(12000);
    podman.stop();
    const running = podman.isContainerRunning();
    assert.strictEqual(running, false);
  });

  test("PodmanService should NOT be running", function () {
    podman.ping().then((result) => {
      assert.strictEqual(result, false);
    });
  });
});
