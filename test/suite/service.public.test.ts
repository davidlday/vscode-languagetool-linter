import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as vscode from "vscode";
import { PublicService } from "../../src/services/PublicService";

chai.use(chaiAsPromised);
chai.should();
const assert = chai.assert;

suite("PublicService Test Suite", function () {
  const config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration();

  // PublicService Tests
  let service: PublicService;

  test("PublicService should instantiate", function () {
    service = new PublicService(config);
    assert.ok(service);
  });

  test("PublicService should NOT be pingable", function () {
    return service.ping().should.eventually.be.false;
  });

  test("PublicService should start", function () {
    this.timeout(10000);
    return service.start().should.eventually.be.true;
  });

  test("PublicService should respond to ping.", function () {
    return service.ping().should.eventually.be.true;
  });

  test("PublicService should stop", function () {
    this.timeout(12000);
    return service.stop().should.eventually.be.true;
  });

  test("PublicService should NOT respond to ping", function () {
    return service.ping().should.eventually.be.false;
  });
});
