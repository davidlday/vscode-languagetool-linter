import * as assert from 'assert';
import { before } from 'mocha';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../../common/configuration';
import * as constants from '../../common/constants';
import * as path from 'path';
import * as fs from 'fs';

suite('ConfigurationManager Test Suite', () => {

  test('ConfigurationManager should load configuration', () => {
    assert.ok(vscode.workspace.getConfiguration(constants.LT_CONFIGURATION_ROOT));
  });

  test('ConfigurationManager should return the default service URL', () => {
    const EXPECTED_DEFAULT_URL = "http://localhost:8081/v2/check";
    let config: ConfigurationManager = new ConfigurationManager();
    assert.equal(config.getUrl(), EXPECTED_DEFAULT_URL, "Default URL is not correct");
  });

});
