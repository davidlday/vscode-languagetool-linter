import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as vscode from "vscode";
import { ExternalService } from "../../src/services/ExternalService";

chai.use(chaiAsPromised);
chai.should();
const assert = chai.assert;

suite("ExternalService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();

  // ExternalService Tests
  let service: ExternalService;

  test("ExternalService should instantiate", function () {
    service = new ExternalService(config);
    assert.ok(service);
  });

  test("ExternalService should NOT be pingable", function () {
    return service.ping().should.eventually.be.false;
  });

  test("ExternalService should start", function () {
    this.timeout(20000);
    return service.start().should.eventually.be.true;
  });

  test("ExternalService should respond to ping.", function () {
    return service.ping().should.eventually.be.true;
  });

  test("ExternalService should stop", function () {
    this.timeout(12000);
    return service.stop().should.eventually.be.true;
  });

  test("ExternalService should NOT respond to ping", function () {
    return service.ping().should.eventually.be.false;
  });
});
