import * as assert from "assert";
import * as vscode from "vscode";
import * as Constants from "../../src/Constants";
import { ExternalService } from "../../src/services/ExternalService";
import { PodmanService } from "../../src/services/PodmanService";

suite("ExternalService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();
  // Use the PodmanService as our external service provider
  // const podmanservice: PodmanService = new PodmanService(config);

  let service: PodmanService;

  this.beforeAll(function (done) {
    config
      .update(
        Constants.CONFIGURATION_PODMAN_PORT,
        process.env.LTLINTER_EXTERNAL_PORT,
      )
      .then(() => {
        return config.update(
          Constants.CONFIGURATION_PODMAN_CONTAINER_NAME,
          "external-test",
        );
      })
      .then(() => {
        return config.update(
          Constants.CONFIGURATION_EXTERNAL_URL,
          `http://localhost:${process.env.LTLINTER_EXTERNAL_PORT}`,
        );
      })
      .then(async () => {
        service = new PodmanService(config);
        this.timeout(100000);
        return service
          .start()
          .then((result) => {
            if (result) {
              done();
            } else {
              done(new Error("Could not start PodmanService"));
            }
          })
          .catch((err) => {
            assert.fail(err);
          });
      })
      .then(() => {
        done();
      });
  });

  this.afterAll(function (done) {
    this.timeout(100000);
    service.stop().then((result) => {
      if (result) {
        done();
      } else {
        done(new Error("Could not stop PodmanService"));
      }
    });
  });

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
        assert.strictEqual(
          externalservice.getState(),
          Constants.SERVICE_STATES.READY,
        );
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ExternalService should respond to ping.", function () {
    this.timeout(10000);
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
        assert.strictEqual(
          externalservice.getState(),
          Constants.SERVICE_STATES.STOPPED,
        );
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
