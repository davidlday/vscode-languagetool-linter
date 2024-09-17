import * as assert from "assert";
import * as fs from "fs";
import * as path from "path";
import { ConfigurationManager } from "../../src/ConfigurationManager";
import { IAnnotatedtext } from "annotatedtext";
import { Linter } from "../../src/Linter";

suite("Linter HTML Test Suite", () => {
  const configManager: ConfigurationManager = new ConfigurationManager();
  const linter: Linter = new Linter(configManager);
  const testWorkspace: string = path.resolve(
    __dirname,
    "../../../test-fixtures/workspace",
  );

  test("Linter should instantiate", () => {
    assert.ok(linter);
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

  test("Linter should return annotated text for HTML with Escape Characters (\\)", () => {
    const expected: JSON = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, testWorkspace + "/html/escape-character.json"),
        "utf8",
      ),
    );
    const text: string = fs.readFileSync(
      path.resolve(__dirname, testWorkspace + "/html/escape-character.html"),
      "utf8",
    );
    const actual: IAnnotatedtext = linter.buildAnnotatedHTML(text);
    // fs.writeFileSync(path.resolve(__dirname, testWorkspace + "/html/basic.json"), JSON.stringify(actual), "utf8");
    assert.deepStrictEqual(expected, actual);
  });
});
