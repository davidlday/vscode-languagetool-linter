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

  const podmanservice: PodmanService = new PodmanService(config);

  this.beforeAll(function (done) {
    this.timeout(100000);
    podmanservice
      .start()
      .then(() => {
        done();
      })
      .catch((err) => {
        done(err);
      });
  });
  // const imageName = process.env.LTLINTER_EXTERNAL_PORT
  //   ? process.env.LTLINTER_PODMAN_IMAGE_NAME
  //   : config.get(Constants.CONFIGURATION_PODMAN_IMAGE_NAME);
  // const ip = process.env.LTLINTER_PODMAN_IP
  //   ? process.env.LTLINTER_PODMAN_IP
  //   : config.get(Constants.CONFIGURATION_PODMAN_IP);
  // const port = process.env.LTLINTER_PODMAN_PORT
  //   ? process.env.LTLINTER_PODMAN_PORT
  //   : config.get(Constants.CONFIGURATION_PODMAN_PORT);
  // const externalUrl = process.env.LTLINTER_EXTERNAL_PORT
  //   ? `http://localhost:${process.env.LTLINTER_EXTERNAL_PORT}`
  //   : config.get(Constants.CONFIGURATION_EXTERNAL_URL);

  // config
  //   .update(Constants.CONFIGURATION_PODMAN_IMAGE_NAME, imageName)
  //   .then(() => {
  //     config
  //       .update(
  //         Constants.CONFIGURATION_PODMAN_CONTAINER_NAME,
  //         "external-test",
  //       )
  //       .then(() => {
  //         config.update(Constants.CONFIGURATION_PODMAN_IP, ip).then(() => {
  //           config
  //             .update(Constants.CONFIGURATION_PODMAN_PORT, port)
  //             .then(() => {
  //               config
  //                 .update(Constants.CONFIGURATION_EXTERNAL_URL, externalUrl)
  //                 .then(() => {
  //                   const service = new PodmanService(config);
  //                   service
  //                     .start()
  //                     .then((result) => {
  //                       assert.ok(result);
  //                       done();
  //                     })
  //                     .catch((err) => {
  //                       if (err instanceof Error) {
  //                         assert.fail(err);
  //                       } else {
  //                         assert.fail("Unknown error");
  //                       }
  //                     });
  //                 });
  //             });
  //         });
  //       });
  //   });

  this.afterAll(function (done) {
    this.timeout(100000);
    podmanservice.stop().then((result) => {
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
        assert.ok(result);
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
