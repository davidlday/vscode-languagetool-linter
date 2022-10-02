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
  let managedservice: ManagedService;

  // Set up config from environment variables
  this.beforeAll(() => {
    if (process.env.LTLINTER_MANAGED_CLASSPATH) {
      config
        .update(
          CONFIGURATION_MANAGED_CLASS_PATH,
          process.env.LTLINTER_MANAGED_CLASSPATH,
        )
        .then(() => {
          assert.ok(config);
        });
    } else {
      assert.fail("LTLINTER_MANAGED_CLASSPATH not defined");
    }
  });

  test("ManagedService should instantiate", function () {
    managedservice = new ManagedService(config);
    assert.ok(managedservice);
  });

  test("ManagedService should NOT be pingable", function () {
    return managedservice
      .ping()
      .then((result) => {
        assert.ok(!result);
      })
      .catch((error) => {
        if (error instanceof Error) {
          assert.fail(error.message);
        } else {
          assert.fail("Unknown error");
        }
      });
  });

  test("ManagedService should start", function () {
    this.timeout(20000);
    return managedservice
      .start()
      .then(() => {
        assert.strictEqual(managedservice.getState(), SERVICE_STATES.READY);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ManagedService should respond to ping.", function () {
    return managedservice
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
    return managedservice
      .stop()
      .then(() => {
        assert.strictEqual(managedservice.getState(), SERVICE_STATES.STOPPED);
      })
      .catch((err) => {
        assert.fail(err);
      });
  });

  test("ManagedService should NOT respond to ping", function () {
    return managedservice
      .ping()
      .then((result) => {
        assert.strictEqual(result, false);
      })
      .catch((err) => {
        assert.ok(err);
      });
  });
});
