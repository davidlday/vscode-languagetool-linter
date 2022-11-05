import * as assert from "assert";
import * as vscode from "vscode";
import {
  CONFIGURATION_MANAGED_CLASS_PATH,
  SERVICE_STATES,
} from "../../src/Constants";
import { ManagedService } from "../../src/services/ManagedService";

suite("ManagedService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();
  this.timeout(10000);

  // ManagedService Tests
  let service: ManagedService;

  // Set up config from environment variables
  this.beforeAll(function (done) {
    if (process.env.LTLINTER_MANAGED_CLASSPATH) {
      config
        .update(
          CONFIGURATION_MANAGED_CLASS_PATH,
          process.env.LTLINTER_MANAGED_CLASSPATH,
        )
        .then(() => {
          assert.ok(config);
          done();
        });
    }
  });

  test("ManagedService should instantiate", function () {
    this.timeout(30000);
    service = new ManagedService(config);
    assert.ok(service);
  });

  test("ManagedService should NOT be pingable", function () {
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

  test("ManagedService should start", function () {
    this.timeout(50000);
    return service
      .start()
      .then(() => {
        assert.strictEqual(service.getState(), SERVICE_STATES.READY);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ManagedService should respond to ping.", function () {
    while (service.getState() === SERVICE_STATES.STARTING) {
      // Wait for service to be ready
    }
    return service
      .ping()
      .then((result) => {
        assert.ok(result);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ManagedService should stop", function () {
    this.timeout(12000);
    return service
      .stop()
      .then(() => {
        assert.strictEqual(service.getState(), SERVICE_STATES.STOPPED);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ManagedService should NOT respond to ping", function () {
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
