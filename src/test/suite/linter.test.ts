import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigurationManager } from '../../common/configuration-manager';
import { Linter } from "../../linter/linter";

suite('Linter Test Suite', () => {

  const config: ConfigurationManager = new ConfigurationManager();
  const linter: Linter = new Linter(config);
  const testWorkspace: string = path.resolve(__dirname, "../../../src/test-fixtures/workspace");

  test('Linter should instantiate', () => {
    assert.ok(linter);
  });

  test('Linter should return annotated text for Basic Markdown', () => {
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/basic.json"), "utf8"));
    const text = fs.readFileSync(path.resolve(__dirname, testWorkspace + "/markdown/basic.md"), "utf8");
    const result = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/basic.json"), JSON.stringify(result), "utf8");
    assert.deepEqual(expected, result);
  });

  test('Linter should return annotated text for HTML', () => {
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, testWorkspace + "/html/basic.json"), "utf8"));
    const text = fs.readFileSync(path.resolve(__dirname, testWorkspace + "/html/basic.html"), "utf8");
    const result = linter.buildAnnotatedHTML(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/html/basic.json"), JSON.stringify(result), "utf8");
    assert.deepEqual(expected, result);
  });

  test('Linter should return annotated text for Plaintext', () => {
    const expected = JSON.parse(fs.readFileSync(path.resolve(__dirname, testWorkspace + "/plaintext/basic.json"), "utf8"));
    const text = fs.readFileSync(path.resolve(__dirname, testWorkspace + "/plaintext/basic.txt"), "utf8");
    const result = linter.buildAnnotatedPlaintext(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/plaintext/basic.json"), JSON.stringify(result), "utf8");
    assert.deepEqual(expected, result);
  });

  test('Linter should only smart format text in annotatedtext', () => {
    // TODO: Make a real test.
    assert.ok(true);
  });

});
