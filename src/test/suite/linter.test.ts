import * as assert from 'assert';
import { before } from 'mocha';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationManager } from '../../common/configuration';
import * as constants from '../../common/constants';
import { LinterCommands } from "../../linter/commands";

suite('Linter Test Suite', () => {

  const config: ConfigurationManager = new ConfigurationManager();
  const linter: LinterCommands = new LinterCommands(config);

	test('Linter should instantiate', () => {
		assert.ok(linter);
	});

  test('Linter should return annotated text for Markdown', () => {
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../src/test-fixtures/workspace/markdown/backticks.json"), "utf8"));
    const text = fs.readFileSync(path.resolve(__dirname, "../../../src/test-fixtures/workspace/markdown/backticks.md"), "utf8");
    const result = JSON.parse(linter.buildAnnotatedMarkdown(text));
    // fs.writeFileSync(path.resolve(__dirname, "../../../src/test-fixtures/workspace/markdown/backticks.json"), result);
    assert.equal(result, expected, "Annotated Markdown not built correctly.");
  });

});
