import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as vscode from "vscode";
import { PodmanService } from "../../src/services/PodmanService";

chai.use(chaiAsPromised);
chai.should();
const assert = chai.assert;

suite("PodmanService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();

  // PodmanService Tests
  let service: PodmanService;

  test("PodmanService should instantiate", function () {
    service = new PodmanService(config);
    assert.ok(service);
  });

  test("PodmanService should NOT be pingable", function () {
    return service.ping().should.eventually.be.false;
  });

  test("PodmanService should start", function () {
    this.timeout(20000);
    return service.start().should.eventually.be.true;
  });

  test("PodmanService should respond to ping.", function () {
    return service.ping().should.eventually.be.true;
  });

  test("PodmanService should stop", function () {
    this.timeout(12000);
    return service.stop().should.eventually.be.true;
  });

  test("PodmanService should NOT respond to ping", function () {
    return service.ping().should.eventually.be.false;
  });
});
