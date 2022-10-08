import * as fs from "fs";
import * as path from "path";
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

    const servicesTestsPath = path.resolve(__dirname, "./services/index");

    if (process.env.LTLINTER_TEST_SERVICES) {
      if (process.env.LTLINTER_MANAGED_CLASSPATH) {
        const settings = JSON.parse(
          fs.readFileSync(
            path.resolve(testWorkspace, ".vscode/settings.json"),
            "utf8",
          ),
        );
        settings.languageToolLinter.managed.classPath =
          process.env.LTLINTER_MANAGED_CLASSPATH;
        fs.writeFileSync(
          path.resolve(testWorkspace, ".vscode/settings.json"),
          JSON.stringify(settings),
          "utf8",
        );
      }
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath: servicesTestsPath,
        launchArgs: [testWorkspace],
      });
    }
  } catch (err) {
    // tslint:disable-next-line: no-console
    console.error("Failed to run tests");
    process.exit(1);
  }
}

// tslint:disable-next-line: no-floating-promises
main();
