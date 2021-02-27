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

import * as crypto from "crypto";
import * as del from "del";
import * as execa from "execa";
import * as extractzip from "extract-zip";
import * as fs from "fs";
import * as Fetch from "node-fetch";
import * as path from "path";
import * as portfinder from "portfinder";
import * as stream from "stream";
import * as tar from "tar";
import * as util from "util";
import { ExtensionContext, OutputChannel } from "vscode";
import * as Constants from "../configuration/constants";

export class EmbeddedLanguageTool {
  private context: ExtensionContext;

  private homeDirectory: string;
  private minimumPort: number | undefined = undefined;
  private maximumPort: number | undefined = undefined;
  private logger: OutputChannel = Constants.EXTENSION_OUTPUT_CHANNEL;
  private port: number | undefined = undefined;
  private process: execa.ExecaChildProcess | undefined = undefined;
  private serviceUrl: string | undefined = undefined;
  private static CHECK_PATH = "v2/check";

  private os = "unknown";
  private arch = process.arch === "ia32" ? "x32" : process.arch;

  private readonly ltVersion = "5.2";
  private readonly ltUrl = `https://languagetool.org/download/LanguageTool-${this.ltVersion}.zip`;
  private readonly ltSha256 =
    "e7776143c76a88449d451897cedc9f3ce698450e25bce25d4ed52457fa2d0cde";
  private ltHome = "";
  private ltJar = "";

  // See: https://api.adoptopenjdk.net/swagger-ui/#/Assets/get_v3_assets_version__version_
  private readonly jreVersion = "11.0.10+9";
  private readonly jreApi = "https://api.adoptopenjdk.net/v3/assets/version";
  private jreHome = "";
  private java = "";

  constructor(context: ExtensionContext) {
    this.context = context;
    this.homeDirectory = path.resolve(
      this.context.globalStoragePath,
      "embedded",
    );
    if (!fs.existsSync(this.homeDirectory)) {
      fs.mkdirSync(this.homeDirectory, { recursive: true });
    }
    this.ltHome = path.resolve(this.homeDirectory, "lt");
    this.ltJar = path.resolve(
      this.ltHome,
      this.ltVersion,
      "languagetool-server.jar",
    );
    this.jreHome = path.resolve(this.homeDirectory, "jre");
    this.java = path.resolve(this.jreHome, this.jreVersion, "bin", "java");
    switch (process.platform) {
      case "aix":
        this.os = "aix";
        break;
      case "darwin":
        this.os = "mac";
        this.java = path.resolve(
          this.jreHome,
          this.jreVersion,
          "Contents",
          "Home",
          "bin",
          "java",
        );
        break;
      case "linux":
        this.os = "linux";
        break;
      case "sunos":
        this.os = "solaris";
        break;
      case "win32":
        this.os = "windows";
        this.java = path.resolve(
          this.jreHome,
          this.jreVersion,
          "bin",
          "java.exe",
        );
        break;
      default:
        this.os = "unknown";
    }
  }

  public async startService(
    minimumPort: number,
    maximumPort: number,
  ): Promise<string> {
    this.logger.appendLine("embeddedLanguageTool.startService called.");
    await this.stopService();
    this.minimumPort = minimumPort;
    this.maximumPort = maximumPort;
    portfinder.getPort(
      { host: "127.0.0.1", port: this.minimumPort, stopPort: this.maximumPort },
      (error: Error, port: number) => {
        if (error) {
          this.logger.appendLine("Error getting open port: " + error.message);
          this.logger.show(true);
        } else {
          const args: string[] = [
            "-cp",
            this.ltJar,
            "org.languagetool.server.HTTPServer",
            "--port",
            port.toString(),
          ];
          this.logger.appendLine("Starting embedded service.");
          (this.process = execa(this.java, args)).catch(
            (err: execa.ExecaError) => {
              if (err.isCanceled) {
                this.logger.appendLine("Embedded service process stopped.");
              } else if (err.failed) {
                this.logger.appendLine(
                  "Embedded service command failed: " + err.command,
                );
                this.logger.appendLine("Error Message: " + err.message);
                this.logger.show(true);
              }
            },
          );
          this.port = port;
          this.process.stderr.addListener("data", (data) => {
            this.logger.appendLine(data);
            this.logger.show(true);
          });
          this.process.stdout.addListener("data", (data) => {
            this.logger.appendLine(data);
          });
        }
      },
    );

    // Need to find a better way to know if the service is still starting or if something failed.
    const timer = new Promise((resolve) => {
      setTimeout(() => resolve("done!"), 1000);
    });

    let count = 0;
    while (!this.port && count < 10) {
      await timer;
      count++;
    }

    this.serviceUrl = `http://localhost:${this.port}/${EmbeddedLanguageTool.CHECK_PATH}`;
    count = 0;
    while (!(await this.isAvailable()) && count < 10) {
      await timer;
      count++;
    }

    return Promise.resolve(this.serviceUrl);
  }

  public async isAvailable(): Promise<boolean> {
    if (this.serviceUrl) {
      await Fetch.default(this.serviceUrl, { method: "HEAD" })
        .then(() => {
          return Promise.resolve(true);
        })
        .catch(() => {
          return Promise.resolve(false);
        });
    }
    return Promise.reject(
      "No service URL defined. Have you started the service?",
    );
    // return Promise.resolve(false);
  }

  public async stopService(): Promise<void> {
    if (this.process) {
      this.logger.appendLine("Stopping embedded service.");
      this.process.cancel();
      this.port = undefined;
      this.minimumPort = undefined;
      this.maximumPort = undefined;
      this.process = undefined;
      this.serviceUrl = undefined;
    }
    return Promise.resolve();
  }

  public async dispose(): Promise<void> {
    return await this.stopService();
  }

  // Minimal test for files
  private isInstalled(): boolean {
    return fs.existsSync(this.java) && fs.existsSync(this.ltJar);
  }

  // Initialize the service
  public async init(keepArchives = false): Promise<void> {
    //  Conditional install
    if (!this.isInstalled()) {
      // Clean out any old stuff
      await this.uninstall();
      await this.install(keepArchives);
    }
    return Promise.resolve();
  }

  public async reinstall(keepArchives = false): Promise<void> {
    await this.uninstall();
    return await this.install(keepArchives);
  }

  // Rip it all out
  public async uninstall(): Promise<string[]> {
    await this.stopService();
    const deleted = await del([`${this.homeDirectory}/**`], {
      force: true,
    });
    return Promise.resolve(deleted);
  }

  // Private Functions

  // Install everything
  private async install(keepArchives = false): Promise<void> {
    await this.installJre(keepArchives);
    await this.installLanguageTool(keepArchives);
    return Promise.resolve();
  }

  // Install LanguageTool
  private async installLanguageTool(keepArchives = false): Promise<void> {
    if (!fs.existsSync(this.ltJar)) {
      if (!fs.existsSync(this.ltHome)) {
        fs.mkdirSync(this.ltHome);
      }
      const ltArchive = path.resolve(this.ltHome, path.basename(this.ltUrl));
      await this.download(this.ltUrl, ltArchive, this.ltSha256);
      await extractzip(ltArchive, { dir: this.ltHome });
      fs.renameSync(
        path.resolve(this.ltHome, `LanguageTool-${this.ltVersion}`),
        path.resolve(this.ltHome, this.ltVersion),
      );
      if (!keepArchives && fs.existsSync(ltArchive)) {
        fs.unlinkSync(ltArchive);
      }
    }
    return Promise.resolve();
  }

  // Install JRE
  private async installJre(keepArchives = false): Promise<void> {
    if (!fs.existsSync(this.java)) {
      if (!fs.existsSync(this.jreHome)) {
        fs.mkdirSync(this.jreHome);
      }

      const query_string = `os=${this.os}&architecture=${this.arch}&heap_size=normal&image_type=jre&jvm_impl=hotspot&lts=true&page=0&page_size=10&project=jdk&release_type=ga&sort_method=DEFAULT&sort_order=DESC&vendor=adoptopenjdk`;

      const apiUrl = `${this.jreApi}/${this.jreVersion}?${query_string}`;

      const apiResponse = await Fetch.default(apiUrl);
      const apiJson = await apiResponse.json();
      fs.writeFileSync(
        path.resolve(this.jreHome, "api.json"),
        JSON.stringify(apiJson),
        "utf-8",
      );

      // Download the binary
      const binary = apiJson[0].binaries[0].package;
      const jreArchive = path.resolve(this.jreHome, binary.name);

      // Get the metadata file
      await this.download(
        binary.metadata_link,
        path.resolve(this.jreHome, "metadata.json"),
      );

      // Get the checksume
      await this.download(
        binary.checksum_link,
        path.resolve(this.jreHome, "checksum.txt"),
      );

      // Get the jre archive
      await this.download(binary.link, jreArchive, binary.checksum);

      // Extract the binary
      if (path.extname(jreArchive) === ".zip") {
        await extractzip(jreArchive, { dir: this.jreHome });
      } else {
        await tar.x({ file: jreArchive, cwd: this.jreHome });
      }

      fs.renameSync(
        path.resolve(this.jreHome, `jdk-${this.jreVersion}-jre`),
        path.resolve(this.jreHome, this.jreVersion),
      );

      if (!keepArchives && fs.existsSync(jreArchive)) {
        fs.unlinkSync(jreArchive);
      }
    }
    return Promise.resolve();
  }

  // Downloader
  private async download(
    url: string,
    filename: string,
    sha256?: string,
  ): Promise<string> {
    const response = await Fetch.default(url);
    const targetFile = path.resolve(this.homeDirectory, filename);
    if (!response.ok) {
      Promise.reject(
        new Error(
          `unexpected response ${response.statusText} while downloading ${url}`,
        ),
      );
      fs.unlinkSync(targetFile);
    }
    const streamPipeline = util.promisify(stream.pipeline);
    await streamPipeline(
      response.body,
      fs.createWriteStream(path.resolve(this.homeDirectory, filename)),
    );
    if (sha256) {
      const hash = crypto.createHash("sha256");
      fs.createReadStream(filename)
        .on("data", (data) => hash.update(data))
        .on("end", () => {
          const fileHash = hash.digest("hex");
          if (sha256 === fileHash) {
            return Promise.resolve(filename);
          } else {
            return Promise.reject(
              new Error(
                `Could not verify ${filename}. Expected ${sha256} but found ${fileHash}.`,
              ),
            );
          }
        });
    }
    return Promise.resolve(filename);
  }
}
