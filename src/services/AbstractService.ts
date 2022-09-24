/****
 *    Copyright 2019 David L. Day
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

import {
  ConfigurationChangeEvent,
  Disposable,
  TextDocument,
  WorkspaceConfiguration,
} from "vscode";
import * as Fetch from "node-fetch";
import { ILanguageToolResponse, ILanguageToolService } from "../Interfaces";
import * as Constants from "../Constants";

export abstract class AbstractService
  implements Disposable, ILanguageToolService
{
  protected _workspaceConfig: WorkspaceConfiguration;
  protected _ltUrl: string | undefined;

  constructor(workspaceConfig: WorkspaceConfiguration) {
    this._workspaceConfig = workspaceConfig;
  }

  public getURL(): string | undefined {
    return this._ltUrl;
  }

  public reloadConfiguration(
    event: ConfigurationChangeEvent,
    workspaceConfig: WorkspaceConfiguration,
  ): void {
    if (event.affectsConfiguration(Constants.CONFIGURATION_ROOT)) {
      this._workspaceConfig = workspaceConfig;
    }
  }

  public invokeLanguageTool(
    document: TextDocument,
    ltPostDataDict: Record<string, string>,
  ): Promise<ILanguageToolResponse> {
    return new Promise((resolve, reject) => {
      const url = this.getURL();
      if (url) {
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
        Fetch.default(url, options)
          .then((res) => res.json())
          .then((json) => resolve(json as ILanguageToolResponse))
          .catch((err) => {
            reject(err.message);
          });
      } else {
        reject("LanguageTool URL is not defined");
      }
    });
  }
  public start(): Promise<boolean> {
    return new Promise((resolve) => {
      resolve(true);
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      resolve();
    });
  }

  public dispose(): Promise<void> {
    return this.stop();
  }

  public ping(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const url = this._ltUrl;
      if (url) {
        const options = {
          method: "HEAD",
          uri: url,
          resolveWithFullResponse: true,
        };
        Fetch.default(url, options).then((response) => {
          if (response.status === 200) {
            Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
              `Ping to ${url} succeeded.`,
            );
            resolve(true);
          } else {
            Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
              `Ping to ${url} failed with status ${response.status}.`,
            );
            reject(false);
          }
        });
      } else {
        Constants.EXTENSION_OUTPUT_CHANNEL.appendLine(
          "Ping called, but LanguageTool URL is not defined",
        );
        reject(false);
      }
    });
  }
}
