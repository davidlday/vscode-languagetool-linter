import * as path from "path";
// tslint:disable-next-line: no-implicit-dependencies
import { runTests } from "@vscode/test-electron";

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./suite/index");

    const testWorkspace = path.resolve(__dirname, "../test-fixtures/workspace");

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [testWorkspace],
    });
  } catch (err) {
    // tslint:disable-next-line: no-console
    console.error("Failed to run tests");
    process.exit(1);
  }
}

// tslint:disable-next-line: no-floating-promises
main();
