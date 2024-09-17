import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { ConfigurationManager } from "../../src/ConfigurationManager";
import { Linter } from "../../src/Linter";

suite("Linter MDX Test Suite", () => {
  const configManager: ConfigurationManager = new ConfigurationManager();
  const linter: Linter = new Linter(configManager);
  const testWorkspace: string = path.resolve(
    __dirname,
    "../../../test-fixtures/workspace",
  );

  test("Linter should instantiate", () => {
    assert.ok(linter);
  });

  test("Linter should return annotated text for Markdown with Backticks", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/mdx/backticks.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/mdx/backticks.mdx"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/mdx/backticks.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Bold and/or Italics", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/mdx/bold-or-italics.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/mdx/bold-or-italics.mdx"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/mdx/bold-or-italics.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Comments", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/mdx/comments.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/mdx/comments.mdx"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/mdx/comments.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Front Matter (YAML)", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/mdx/front-matter.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/mdx/front-matter.mdx"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/mdx/front-matter.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Headers", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/mdx/headers.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/mdx/headers.mdx"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/mdx/headers.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Ordered Lists", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/mdx/ordered-lists.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/mdx/ordered-lists.mdx"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/mdx/ordered-lists.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Unordered Lists", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/mdx/unordered-lists.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/mdx/unordered-lists.mdx"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/mdx/unordered-lists.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Escape Characters (\\)", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/mdx/escape-character.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/mdx/escape-character.mdx"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/mdx/unordered-lists.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });
});
