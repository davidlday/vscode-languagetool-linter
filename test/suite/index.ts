import * as fs from "fs";
import { glob } from "glob";
import Mocha from "mocha";
import * as path from "path";

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    color: true,
    ui: "tdd",
  });

  const testsRoot = path.resolve(__dirname, "..");

  return new Promise((c, e) => {
    const files = glob.sync("**/**.test.js", { cwd: testsRoot });

    // Add files to the test suite
    files.forEach((f) => mocha.addFile(path.resolve(testsRoot, f)));

    try {
      // Run the mocha test
      mocha.run((failures) => {
        // Write Istanbul coverage data if available (for nyc reporting)
        const coverageData = (global as any).__coverage__;
        if (coverageData) {
          const nycOutputDir = path.resolve(__dirname, "../../../.nyc_output");
          if (!fs.existsSync(nycOutputDir)) {
            fs.mkdirSync(nycOutputDir, { recursive: true });
          }
          fs.writeFileSync(
            path.resolve(nycOutputDir, "coverage.json"),
            JSON.stringify(coverageData)
          );
        }

        if (failures > 0) {
          e(new Error(`${failures} tests failed.`));
        } else {
          c();
        }
      });
    } catch (err) {
      e(err);
    }
  });
}
