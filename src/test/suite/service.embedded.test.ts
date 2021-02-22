import * as assert from "assert";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { ExtensionContext } from "vscode";
import { ConfigurationManager } from "../../configuration/manager";
import { MockExtensionContext } from "./mockUtils";
import { EmbeddedLanguageTool } from "../../languagetool/embedded";

suite("Embedded LanguageTool Test Suite", () => {
  const testContext: ExtensionContext = new MockExtensionContext();
  const config: ConfigurationManager = new ConfigurationManager(
    testContext as ExtensionContext,
  );
  const embeddedTestHomedirectory: string = path.resolve(
    __dirname,
    "../../../src/test-fixtures/workspace/embedded",
  );
  const service: EmbeddedLanguageTool = new EmbeddedLanguageTool(
    embeddedTestHomedirectory,
  );

  const ltVersion = "5.2";
  const ltArchive = path.resolve(
    embeddedTestHomedirectory,
    "lt",
    `LanguageTool-${ltVersion}.zip`,
  );
  const ltHashExpected =
    "e7776143c76a88449d451897cedc9f3ce698450e25bce25d4ed52457fa2d0cde";
  const ltHome = path.resolve(embeddedTestHomedirectory, "lt", ltVersion);

  const jreVersion = "11.0.10+9";
  let jreArchive: string;
  let jreHashExpected: string;
  const jreHome = path.resolve(embeddedTestHomedirectory, "jre", jreVersion);

  let os = "unknown";
  let arch = "unknown";

  setup(async function () {
    os = "";
    switch (process.platform) {
      case "aix":
        os = "aix";
        break;
      case "darwin":
        os = "mac";
        break;
      case "linux":
        os = "linux";
        break;
      case "sunos":
        os = "solaris";
        break;
      case "win32":
        os = "windows";
        break;
    }
    arch = process.arch === "ia32" ? "x32" : process.arch;

    // set os-specific jre values
    const jresJson = JSON.parse(
      fs
        .readFileSync(path.resolve(embeddedTestHomedirectory, "jres.json"))
        .toString(),
    );
    assert.ok(jresJson);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platformJre = jresJson[0].binaries.filter(function (jre: any) {
      return jre.os === os && jre.architecture === arch;
    });
    assert.strictEqual(platformJre.length, 1);
    jreHashExpected = platformJre[0].package.checksum;
    jreArchive = path.resolve(
      embeddedTestHomedirectory,
      "jre",
      platformJre[0].package.name,
    );
  });

  teardown(function () {
    // Clean up lt archive
    if (fs.existsSync(ltArchive)) {
      fs.unlinkSync(ltArchive);
    }
    // Clean up jre archive
    if (fs.existsSync(jreArchive)) {
      fs.unlinkSync(jreArchive);
    }
  });

  test("Embedded service should instantiate", function () {
    assert.ok(service);
  });

  test("Embedded service should download and install JRE and LT", async function () {
    this.timeout(90000);
    await service.install();

    // Validate we got the expected zip
    assert.ok(fs.existsSync(ltArchive));
    const ltHash = crypto.createHash("sha256");
    fs.createReadStream(ltArchive)
      .on("data", (data) => ltHash.update(data))
      .on("end", () => {
        const ltHashResult = ltHash.digest("hex");
        assert.strictEqual(ltHashResult, ltHashExpected);
      });

    // Validate the JRE home directory exists
    assert.ok(fs.existsSync(ltHome));

    // Validate we got the expected zip
    assert.ok(fs.existsSync(jreArchive));
    const jreHash = crypto.createHash("sha256");
    fs.createReadStream(jreArchive)
      .on("data", (data) => jreHash.update(data))
      .on("end", () => {
        const jreHashResult = jreHash.digest("hex");
        assert.strictEqual(jreHashResult, jreHashExpected);
      });
    // Validate the JRE home directory exists
    assert.ok(fs.existsSync(jreHome));
  });

  test("Embedded service should delete JRE and LT", async function () {
    await service
      .uninstall()
      .then(() => {
        assert.ok(!fs.existsSync(jreHome));
      })
      .then(() => {
        assert.ok(!fs.existsSync(ltHome));
      });
  });
});
