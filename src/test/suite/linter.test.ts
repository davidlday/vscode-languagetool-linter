import * as assert from 'assert';
import * as chai from 'chai';
import { before } from 'mocha';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationManager } from '../../common/configuration-manager';
import * as constants from '../../common/constants';
import { Linter } from "../../linter/linter";

suite('Linter Test Suite', () => {

  const config: ConfigurationManager = new ConfigurationManager();
  const linter: Linter = new Linter(config);

	test('Linter should instantiate', () => {
		assert.ok(linter);
	});

  test('Linter should return annotated text for Markdown', () => {
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../src/test-fixtures/workspace/markdown/backticks.json"), "utf8"));
    const text = fs.readFileSync(path.resolve(__dirname, "../../../src/test-fixtures/workspace/markdown/backticks.md"), "utf8");
    const result = JSON.parse(linter.buildAnnotatedMarkdown(text));
    assert.ok(chai.expect(result).to.deep.equal(expected));
  });

  test('Linter should return annotated text for HTML', () => {
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../../src/test-fixtures/workspace/html/basic.json"), "utf8"));
    const text = fs.readFileSync(path.resolve(__dirname, "../../../src/test-fixtures/workspace/html/basic.html"), "utf8");
    const result = JSON.parse(linter.buildAnnotatedHTML(text));
    assert.ok(chai.expect(result).to.deep.equal(expected));
  });

});
