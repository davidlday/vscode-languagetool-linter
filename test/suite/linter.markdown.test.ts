import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { ConfigurationManager } from "../../src/ConfigurationManager";
import { Linter } from "../../src/Linter";

suite("Linter Markdown Test Suite", () => {
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
        path.resolve(__dirname, testWorkspace + "/markdown/backticks.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/markdown/backticks.md"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/backticks.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Bold and/or Italics", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          testWorkspace + "/markdown/bold-or-italics.json",
        ),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/markdown/bold-or-italics.md"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/bold-or-italics.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Comments", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/markdown/comments.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/markdown/comments.md"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/comments.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Front Matter (YAML)", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/markdown/front-matter.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/markdown/front-matter.md"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/front-matter.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Headers", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/markdown/headers.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/markdown/headers.md"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/headers.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Ordered Lists", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/markdown/ordered-lists.json"),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/markdown/ordered-lists.md"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/ordered-lists.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Unordered Lists", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          testWorkspace + "/markdown/unordered-lists.json",
        ),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/markdown/unordered-lists.md"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/markdown/unordered-lists.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(actual, expected);
  });

  test("Linter should return annotated text for Markdown with Escape Characters (\\)", () => {
    const expected = JSON.parse(
      fs.readFileSync(
        path.resolve(
          __dirname,
          testWorkspace + "/markdown/escape-character.json",
        ),
        "utf8",
      ),
    );
    const text = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/markdown/escape-character.md"),
      "utf8",
    );
    const actual = linter.buildAnnotatedMarkdown(text);
    // fs.writeFileSync(
    //   path.resolve(
    //     __dirname,
    //     testWorkspace + "/markdown/escape-character-new.json",
    //   ),
    //   JSON.stringify(actual),
    //   "utf8",
    // );
    assert.deepStrictEqual(actual, expected);
  });
});
