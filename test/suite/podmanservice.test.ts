import * as assert from "assert";
import * as vscode from "vscode";
import * as Constants from "../../src/Constants";
import { PodmanService } from "../../src/PodmanService";

suite("PodmanService Test Suite", () => {
  test("PodmanService should instantiate", () => {
    const podman = new PodmanService(
      "docker.io/erikvl87/languagetool:5.8",
      "vscode-languagetool-linter-test",
    );
    assert.ok(podman);
  });

  test("PodmanService should create a new container", () => {
    const podman = new PodmanService(
      "docker.io/erikvl87/languagetool:5.8",
      "vscode-languagetool-linter-test",
    );
    podman.run();
    assert.ok(podman.port());
  });
});
