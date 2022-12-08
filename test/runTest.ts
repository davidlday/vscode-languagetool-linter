import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { runTests } from "@vscode/test-electron";

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../../");

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./suite");

    const testWorkspace = path.resolve(
      __dirname,
      "../../test-fixtures/workspace",
    );

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [
        testWorkspace,
        "--disable-gpu",
        "--disable-extensions",
        "--user-data-dir",
        `${os.tmpdir()}`,
      ],
    });

    // const servicesTestsPath = path.resolve(__dirname, "./services");

    // if (process.env.LTLINTER_TEST_SERVICES) {
    //   if (process.env.LTLINTER_MANAGED_CLASSPATH) {
    //     const settings = JSON.parse(
    //       fs.readFileSync(
    //         path.resolve(testWorkspace, ".vscode/settings.json"),
    //         "utf8",
    //       ),
    //     );
    //     settings.languageToolLinter.managed.classPath =
    //       process.env.LTLINTER_MANAGED_CLASSPATH;
    //     fs.writeFileSync(
    //       path.resolve(testWorkspace, ".vscode/settings.json"),
    //       JSON.stringify(settings),
    //       "utf8",
    //     );
    //   }
    //   await runTests({
    //     extensionDevelopmentPath,
    //     extensionTestsPath: servicesTestsPath,
    //     launchArgs: [
    //       testWorkspace,
    //       "--disable-gpu",
    //       "--disable-extensions",
    //       "--user-data-dir",
    //       `${os.tmpdir()}`,
    //     ],
    //   });
    // }
  } catch (err) {
    console.error("Failed to run tests");
    process.exit(1);
  }
}

main();
