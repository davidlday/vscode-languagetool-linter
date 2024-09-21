import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { ConfigurationManager } from "../../src/ConfigurationManager";
import { IAnnotatedtext } from "annotatedtext";
import { Linter } from "../../src/Linter";

suite("Linter Test Suite", () => {
  const configManager: ConfigurationManager = new ConfigurationManager();
  const linter: Linter = new Linter(configManager);
  const testWorkspace: string = path.resolve(
    __dirname,
    "../../../test-fixtures/workspace",
  );

  test("Linter should instantiate", () => {
    assert.ok(linter);
  });

  test("Linter should return annotated text for Basic MDX", () => {
    const expected: JSON = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/mdx/basic.json"),
        "utf8",
      ),
    );
    const text: string = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/mdx/basic.mdx"),
      "utf8",
    );
    const actual: IAnnotatedtext = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/basic.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(expected, actual);
  });

  test("Linter should return annotated text for Basic Markdown", () => {
    const expected: JSON = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/markdown/basic.json"),
        "utf8",
      ),
    );
    const text: string = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/markdown/basic.md"),
      "utf8",
    );
    const actual: IAnnotatedtext = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/basic.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(expected, actual);
  });

  test("Linter should return annotated text for HTML", () => {
    const expected: JSON = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/html/basic.json"),
        "utf8",
      ),
    );
    const text: string = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/html/basic.html"),
      "utf8",
    );
    const actual: IAnnotatedtext = linter.buildAnnotatedHTML(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/html/basic.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(expected, actual);
  });

  test("Linter should return annotated text for Plaintext", () => {
    const expected: JSON = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/plaintext/basic.json"),
        "utf8",
      ),
    );
    const text: string = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/plaintext/basic.txt"),
      "utf8",
    );
    const actual: IAnnotatedtext = linter.buildAnnotatedPlaintext(text);
    // fs.writeFileSync(
    //   path.resolve(__dirname, testWorkspace + "/plaintext/basic.new.json"),
    //   JSON.stringify(actual),
    //   "utf8",
    // );
    assert.deepStrictEqual(expected, actual);
  });

  test("Linter should only smart format text in annotatedtext", () => {
    const expected: string = fs.readFileSync(
      path.resolve(
        __dirname,
        testWorkspace + "/markdown/smart-format-formatted.md",
      ),
      "utf8",
    );
    const expectedJSON: JSON = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          testWorkspace + "/markdown/smart-format-unformatted.json",
        ),
        "utf8",
      ),
    );
    const text: string = fs.readFileSync(
      path.resolve(
        __dirname,
        testWorkspace + "/markdown/smart-format-unformatted.md",
      ),
      "utf8",
    );
    const annotatedtext: IAnnotatedtext = linter.buildAnnotatedMarkdown(text);
    assert.deepStrictEqual(annotatedtext, expectedJSON);
    // fs.writeFileSync(
    //   path.resolve(
    //     __dirname,
    //     testWorkspace + "/markdown/smart-format-unformatted.json",
    //   ),
    //   JSON.stringify(annotatedtext),
    //   "utf8",
    // );
    const actual: string = linter.smartFormatAnnotatedtext(annotatedtext);
    assert.strictEqual(actual, expected);
  });
});
