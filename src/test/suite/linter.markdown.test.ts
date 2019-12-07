import * as assert from 'assert';
import * as chai from 'chai';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationManager } from '../../common/configuration-manager';
import { Linter } from "../../linter/linter";

suite('Linter Markdown Test Suite', () => {

  const config: ConfigurationManager = new ConfigurationManager();
  const linter: Linter = new Linter(config);
  const testWorkspace: string = path.resolve(__dirname, "../../../src/test-fixtures/workspace");

	test('Linter should instantiate', () => {
		assert.ok(linter);
	});

  test('Linter should return annotated text for Markdown with Backticks', () => {
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/backticks.json"), "utf8"));
    const text = fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/backticks.md"), "utf8");
    const result = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/backticks.json"), JSON.stringify(result), "utf8");
    assert.ok(chai.expect(result).to.deep.equal(expected));
  });

  test('Linter should return annotated text for Markdown with Front Matter (YAML)', () => {
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/front-matter.json"), "utf8"));
    const text = fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/front-matter.md"), "utf8");
    const result = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/front-matter.json"), JSON.stringify(result), "utf8");
    assert.ok(chai.expect(result).to.deep.equal(expected));
  });


  test('Linter should return annotated text for Markdown with Headers', () => {
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/headers.json"), "utf8"));
    const text = fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/headers.md"), "utf8");
    const result = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/headers.json"), JSON.stringify(result), "utf8");
    assert.ok(chai.expect(result).to.deep.equal(expected));
  });

  test('Linter should return annotated text for Markdown with Ordered Lists', () => {
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/ordered-lists.json"), "utf8"));
    const text = fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/ordered-lists.md"), "utf8");
    const result = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/ordered-lists.json"), JSON.stringify(result), "utf8");
    assert.ok(chai.expect(result).to.deep.equal(expected));
  });

  test('Linter should return annotated text for Markdown with Unordered Lists', () => {
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/unordered-lists.json"), "utf8"));
    const text = fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/unordered-lists.md"), "utf8");
    const result = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/unordered-lists.json"), JSON.stringify(result), "utf8");
    assert.ok(chai.expect(result).to.deep.equal(expected));
  });

});
