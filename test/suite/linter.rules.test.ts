import * as assert from "assert";
import { ConfigurationManager } from "../../src/ConfigurationManager";
import { IIgnoreItem } from "../../src/Interfaces";
import { Linter } from "../../src/Linter";

suite("Linter Rule Logic Test Suite", () => {
  const configManager = new ConfigurationManager();
  const linter = new Linter(configManager);

  test("isSpellingRule should detect known spelling rule IDs", () => {
    assert.strictEqual(Linter.isSpellingRule("MORFOLOGIK_RULE_EN_US"), true);
    assert.strictEqual(Linter.isSpellingRule("SPELLER_RULE"), true);
    assert.strictEqual(Linter.isSpellingRule("RANDOM_RULE"), false);
  });

  test("isWarningCategory should detect grammar/punctuation/typography", () => {
    assert.strictEqual(Linter.isWarningCategory("GRAMMAR"), true);
    assert.strictEqual(Linter.isWarningCategory("PUNCTUATION"), true);
    assert.strictEqual(Linter.isWarningCategory("TYPOGRAPHY"), true);
    assert.strictEqual(Linter.isWarningCategory("STYLE"), false);
  });

  test("checkIfIgnored should match by rule ID and optional text", () => {
    const ignored: IIgnoreItem[] = [
      { line: 1, ruleId: "TEST_RULE" },
      { line: 2, ruleId: "ANOTHER_RULE", text: "specific" },
    ];

    assert.strictEqual(linter.checkIfIgnored(ignored, "TEST_RULE", "word"), true);
    assert.strictEqual(
      linter.checkIfIgnored(ignored, "ANOTHER_RULE", "specific"),
      true,
    );
    assert.strictEqual(linter.checkIfIgnored(ignored, "ANOTHER_RULE", "other"), false);
    assert.strictEqual(linter.checkIfIgnored([], "TEST_RULE", "word"), false);
  });
});
