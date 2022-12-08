import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as vscode from "vscode";
import { CONFIGURATION_MANAGED_CLASS_PATH } from "../../src/Constants";
import { ManagedService } from "../../src/services/ManagedService";
import * as Constants from "../../src/Constants";
import execa from "execa";
import { exec } from "child_process";

chai.use(chaiAsPromised);
chai.should();
const assert = chai.assert;

suite("ManagedService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();
  this.timeout(10000);

  // ManagedService Tests
  let service: ManagedService;

  // Set up config from environment variables
  this.beforeAll(async function () {
    if (process.env.LTLINTER_MANAGED_CLASSPATH) {
      await config.update(
        CONFIGURATION_MANAGED_CLASS_PATH,
        process.env.LTLINTER_MANAGED_CLASSPATH,
      );
    }
  });

  test("ManagedService should instantiate", function () {
    this.timeout(30000);
    service = new ManagedService(config);
    assert.ok(service);
  });

  test("ManagedService should NOT be pingable", function () {
    return service.ping().should.eventually.be.false;
  });

  test("ManagedService should start", function () {
    this.timeout(20000);
    return service.start().should.eventually.be.true;
  });

  test("ManagedService should respond to ping.", function () {
    let state = service.getState();
    while (state !== Constants.SERVICE_STATES.READY) {
      execa("sleep", ["1"]);
      state = service.getState();
    }
    return service.ping().catch((err) => {
      console.log(err);
    }).should.eventually.be.true;
  });

  test("ManagedService should stop", function () {
    this.timeout(12000);
    return service.stop().should.eventually.be.true;
  });

  test("ManagedService should NOT respond to ping", function () {
    return service.ping().should.eventually.be.false;
  });
});
