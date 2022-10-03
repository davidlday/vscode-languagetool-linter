import * as assert from "assert";
import * as vscode from "vscode";
import * as Constants from "../../src/Constants";
import { PodmanService } from "../../src/services/PodmanService";

suite("PodmanService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();

  // PodmanService Tests
  let service: PodmanService;

  this.beforeAll(function (done) {
    const imageName = process.env.LTLINTER_PODMAN_IMAGE_NAME
      ? process.env.LTLINTER_PODMAN_IMAGE_NAME
      : config.get(Constants.CONFIGURATION_PODMAN_IMAGE_NAME);
    const containerName = process.env.LTLINTER_PODMAN_CONTAINER_NAME
      ? process.env.LTLINTER_PODMAN_CONTAINER_NAME
      : config.get(Constants.CONFIGURATION_PODMAN_CONTAINER_NAME);
    const ip = process.env.LTLINTER_PODMAN_IP
      ? process.env.LTLINTER_PODMAN_IP
      : config.get(Constants.CONFIGURATION_PODMAN_IP);
    const port = process.env.LTLINTER_PODMAN_PORT
      ? process.env.LTLINTER_PODMAN_PORT
      : config.get(Constants.CONFIGURATION_PODMAN_PORT);

    config
      .update(Constants.CONFIGURATION_PODMAN_IMAGE_NAME, imageName)
      .then(() => {
        config
          .update(Constants.CONFIGURATION_PODMAN_CONTAINER_NAME, containerName)
          .then(() => {
            config.update(Constants.CONFIGURATION_PODMAN_IP, ip).then(() => {
              config
                .update(Constants.CONFIGURATION_PODMAN_PORT, port)
                .then(() => {
                  done();
                });
            });
          });
      });
  });

  test("PodmanService should instantiate", function () {
    service = new PodmanService(config);
    assert.ok(service);
  });

  test("PodmanService should NOT be pingable", function () {
    return service
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
    return service
      .start()
      .then(() => {
        assert.strictEqual(service.getState(), Constants.SERVICE_STATES.READY);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("PodmanService should respond to ping.", function () {
    return service
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

  test("PodmanService should NOT respond to ping", function () {
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
