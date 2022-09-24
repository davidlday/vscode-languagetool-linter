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
  protected _state = Constants.ServiceStates.STOPPED;
  protected _workspaceConfig: WorkspaceConfiguration;
  protected _ltUrl: string | undefined;

  constructor(workspaceConfig: WorkspaceConfiguration) {
    this._workspaceConfig = workspaceConfig;
  }

  public getURL(): string | undefined {
    return this._ltUrl;
  }

  public getState(): string {
    return this._state;
  }

  public reloadConfiguration(
    event: ConfigurationChangeEvent,
    workspaceConfig: WorkspaceConfiguration,
  ): void {
    if (event.affectsConfiguration(Constants.CONFIGURATION_ROOT)) {
      this.stop();
      while (this._state !== Constants.ServiceStates.STOPPED) {
        // wait for stop to complete
      }
      this._workspaceConfig = workspaceConfig;
      this.start();
      while (this._state !== Constants.ServiceStates.RUNNING) {
        // wait for start to complete
      }
    }
  }

  public invokeLanguageTool(
    ltPostDataDict: Record<string, string>,
  ): Promise<ILanguageToolResponse> {
    return new Promise((resolve, reject) => {
      const url = this.getURL();
      if (this._state === Constants.ServiceStates.RUNNING && url) {
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
            reject(err);
          });
      } else if (this._state !== Constants.ServiceStates.RUNNING) {
        switch (this._state) {
          case Constants.ServiceStates.STOPPED:
            reject(new Error("LanguageTool called on stopped service."));
            break;
          case Constants.ServiceStates.STARTING:
            reject(new Error("LanguageTool called on starting service."));
            break;
          case Constants.ServiceStates.STOPPING:
            reject(new Error("LanguageTool called on stopping service."));
            break;
          case Constants.ServiceStates.ERROR:
            reject(new Error("LanguageTool called on errored service."));
            break;
          default:
            this._state = Constants.ServiceStates.ERROR;
            reject(new Error("LanguageTool called on unknown service state."));
            break;
        }
      } else if (url === undefined) {
        this._state = Constants.ServiceStates.ERROR;
        reject(new Error("LanguageTool URL is not defined"));
      } else {
        this._state = Constants.ServiceStates.ERROR;
        reject(new Error("Unknown error"));
      }
    });
  }

  public start(): Promise<boolean> {
    this._state = Constants.ServiceStates.STARTING;
    return new Promise((resolve) => {
      this._state = Constants.ServiceStates.RUNNING;
      resolve(true);
    });
  }

  public stop(): Promise<void> {
    this._state = Constants.ServiceStates.STOPPING;
    return new Promise((resolve) => {
      this._state = Constants.ServiceStates.STOPPED;
      resolve();
    });
  }

  public dispose(): Promise<void> {
    return this.stop();
  }

  public ping(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const url = this._ltUrl;
      if (this._state === Constants.ServiceStates.RUNNING && url) {
        const options = {
          method: "HEAD",
          uri: url,
          resolveWithFullResponse: true,
        };
        Fetch.default(url, options)
          .then((response) => {
            if (response.status === 200) {
              resolve(true);
            } else {
              reject(
                new Error(
                  `Ping to ${url} failed with status ${response.status}.`,
                ),
              );
            }
          })
          .catch((err) => {
            this._state = Constants.ServiceStates.ERROR;
            reject(err);
          });
      } else if (this._state !== Constants.ServiceStates.RUNNING) {
        switch (this._state) {
          case Constants.ServiceStates.STOPPED:
            reject(new Error("Ping called on stopped service."));
            break;
          case Constants.ServiceStates.STARTING:
            reject(new Error("Ping called on starting service."));
            break;
          case Constants.ServiceStates.STOPPING:
            reject(new Error("Ping called on stopping service."));
            break;
          case Constants.ServiceStates.ERROR:
            reject(new Error("Ping called on errored service."));
            break;
          default:
            this._state = Constants.ServiceStates.ERROR;
            reject(new Error("Ping called on unknown service state."));
            break;
        }
      } else if (url === undefined) {
        this._state = Constants.ServiceStates.ERROR;
        reject(new Error("LanguageTool URL is not defined"));
      } else {
        this._state = Constants.ServiceStates.ERROR;
        reject(new Error("Unknown error"));
      }
    });
  }
}
