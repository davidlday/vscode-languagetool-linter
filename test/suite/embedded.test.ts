/****
 *    Copyright 2021 David L. Day
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import * as assert from "assert";
import * as crypto from "crypto";
import * as del from "del";
import * as fs from "fs";
import * as Fetch from "node-fetch";
import * as path from "path";
import { ExtensionContext } from "vscode";
import { MockExtensionContext } from "./mockUtils";
import { EmbeddedLanguageTool } from "../../src/EmbeddedLanguageTool";
import { ILanguageToolResponse } from "../../src/Interfaces";

suite("Embedded LanguageTool Test Suite", () => {
  const testContext: ExtensionContext = new MockExtensionContext();
  const testHomeDirectory: string = path.resolve(
    testContext.globalStoragePath,
    "embedded",
  );
  const service: EmbeddedLanguageTool = new EmbeddedLanguageTool(testContext);

  const ltVersion = "5.2";
  const ltArchive = path.resolve(
    testHomeDirectory,
    "lt",
    `LanguageTool-${ltVersion}.zip`,
  );
  const ltHashExpected =
    "e7776143c76a88449d451897cedc9f3ce698450e25bce25d4ed52457fa2d0cde";
  const ltHome = path.resolve(testHomeDirectory, "lt", ltVersion);

  const jreVersion = "11.0.10+9";
  let jreArchive: string;
  let jreHashExpected: string;
  const jreHome = path.resolve(testHomeDirectory, "jre", jreVersion);

  let os = "unknown";
  let arch = "unknown";

  suiteSetup(async function () {
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
        .readFileSync(path.resolve(testContext.globalStoragePath, "jres.json"))
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
      testHomeDirectory,
      "jre",
      platformJre[0].package.name,
    );
    return await service.uninstall();
  });

  suiteTeardown(function () {
    // Ensure service is stopped
    service.stopService();
    // Clean up jre and lt directories
    del([`${this.jreHome}/**`, `${this.jreHome}/.*`, `${this.ltHome}/**`], {
      force: true,
    });
  });

  test("Embedded service should instantiate", async function () {
    assert.ok(service);
  });

  test("Embedded service should download and install JRE and LT", async function () {
    this.timeout(120000);
    const keepArchives = true;
    return await service
      .init(keepArchives)
      .then(() => {
        // Validate we got the expected LT archive
        assert.ok(fs.existsSync(ltArchive));
        const ltHash = crypto.createHash("sha256");
        fs.createReadStream(ltArchive)
          .on("data", (data) => ltHash.update(data))
          .on("end", () => {
            const ltHashResult = ltHash.digest("hex");
            assert.strictEqual(ltHashResult, ltHashExpected);
          });
      })
      .then(() => {
        // Validate the LT home directory exists
        assert.ok(fs.existsSync(ltHome));
      })
      .then(() => {
        // Validate we got the expected JRE archive
        assert.ok(fs.existsSync(jreArchive));
        const jreHash = crypto.createHash("sha256");
        fs.createReadStream(jreArchive)
          .on("data", (data) => jreHash.update(data))
          .on("end", () => {
            const jreHashResult = jreHash.digest("hex");
            assert.strictEqual(jreHashResult, jreHashExpected);
          });
      })
      .then(() => {
        // Validate the JRE home directory exists
        assert.ok(fs.existsSync(jreHome));
      })
      .then(() => {
        // Clean up lt archive
        if (fs.existsSync(this.ltArchive)) {
          fs.unlinkSync(this.ltArchive);
        }
        // Clean up jre archive
        if (fs.existsSync(this.jreArchive)) {
          fs.unlinkSync(this.jreArchive);
        }
      });
  });

  test("Embedded service should start", async function () {
    this.timeout(60000);
    const timer = new Promise((resolve) => {
      setTimeout(() => resolve("done!"), 1000);
    });

    return await service
      .startService(9500, 65535)
      .then((serviceUrl) => {
        assert.strictEqual(serviceUrl, "http://localhost:9500/v2/check");
        return serviceUrl;
      })
      .then(async (serviceUrl) => {
        const ltPostDataDict: Record<string, string> = {};
        ltPostDataDict.language = "en-US";
        ltPostDataDict.text = "A simple test.";
        const formBody = Object.keys(ltPostDataDict)
          .map(
            (key: string) =>
              encodeURIComponent(key) +
              "=" +
              encodeURIComponent(ltPostDataDict[key]),
          )
          .join("&");

        const options: Fetch.RequestInit = {
          body: formBody,
          headers: {
            "Accepts": "application/json",
            "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          },
          method: "POST",
        };

        let count = 0;
        while (count < 5) {
          await timer;
          count++;
        }

        const response = await Fetch.default(serviceUrl, options);
        const ltReponse: ILanguageToolResponse = (await response.json()) as ILanguageToolResponse;
        assert.strictEqual(ltReponse.software.version, ltVersion);
      });
  });

  test("Embedded service should delete JRE and LT", async function () {
    return await service
      .uninstall()
      .then((deleted) => {
        // Something got deleted
        assert.ok(deleted.length > 0);
      })
      .then(() => {
        // JRE home got deleted
        assert.ok(!fs.existsSync(this.jreHome));
      })
      .then(() => {
        // LT home got deleted
        assert.ok(!fs.existsSync(this.ltHome));
      });
  });
});
