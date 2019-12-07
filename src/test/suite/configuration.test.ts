import * as assert from 'assert';
import * as vscode from 'vscode';
import { ConfigurationManager } from '../../common/configuration-manager';
import * as constants from '../../common/constants';

suite('ConfigurationManager Test Suite', () => {

	test('ConfigurationManager should load configuration', () => {
		assert.ok(vscode.workspace.getConfiguration(constants.LT_CONFIGURATION_ROOT));
	});

  test('ConfigurationManager should return the default service URL', () => {
    const EXPECTED_DEFAULT_URL = "http://localhost:8081/v2/check";
    let config: ConfigurationManager = new ConfigurationManager();
    assert.equal(EXPECTED_DEFAULT_URL, config.getUrl(), "Default URL is not correct");
  });

});
