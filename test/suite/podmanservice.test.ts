import * as assert from "assert";
import * as vscode from "vscode";
import * as Constants from "../../src/Constants";
import { PodmanService } from "../../src/PodmanService";

suite("PodmanService Test Suite", function () {
  const containerName = "languagetool";
  const imageName = "docker.io/erikvl87/languagetool:5.8";

  const podman = new PodmanService(imageName, containerName);

  test("PodmanService should instantiate", function () {
    assert.ok(podman);
  });

  test("PodmanService should NOT be running", function () {
    const running = podman.isContainerRunning();
    assert.strictEqual(running, false);
  });

  test("PodmanService should create a new container", function () {
    this.timeout(10000);
    podman.runContainer();
    assert.ok(podman.getPort());
  });

  test("PodmanService should be running", function () {
    const running = podman.isContainerRunning();
    assert.strictEqual(running, true);
  });

  test("PodmanService should stop", function () {
    this.timeout(12000);
    podman.stop();
    const running = podman.isContainerRunning();
    assert.strictEqual(running, false);
  });

  test("PodmanService should NOT be running", function () {
    const running = podman.isContainerRunning();
    assert.strictEqual(running, false);
  });
});
