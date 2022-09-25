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
  WorkspaceConfiguration,
} from "vscode";
import * as Fetch from "node-fetch";
import { ILanguageToolResponse, ILanguageToolService } from "../Interfaces";
import * as Constants from "../Constants";

export abstract class AbstractService
  implements Disposable, ILanguageToolService
{
  protected _state = Constants.SERVICE_STATES.STOPPED;
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
      while (this._state !== Constants.SERVICE_STATES.STOPPED) {
        // wait for stop to complete
      }
      this._workspaceConfig = workspaceConfig;
      this.start();
      while (this._state !== Constants.SERVICE_STATES.RUNNING) {
        // wait for start to complete
      }
    }
  }

  public invokeLanguageTool(
    annotatedText: string,
  ): Promise<ILanguageToolResponse> {
    while (this._state === Constants.SERVICE_STATES.STARTING) {
      // wait for start to complete
    }
    if (this._state !== Constants.SERVICE_STATES.RUNNING) {
      return Promise.reject(new Error("LanguageTool service is not running"));
    }
    return new Promise((resolve, reject) => {
      const url = this.getURL();
      if (this._state === Constants.SERVICE_STATES.RUNNING && url) {
        const parameters: Record<string, string> = {};
        parameters["data"] = annotatedText;
        Constants.SERVICE_PARAMETERS.forEach((serviceParameter) => {
          const configKey = `${Constants.CONFIGURATION_LT}.${serviceParameter}`;
          const value: string = this._workspaceConfig.get(configKey) as string;
          if (value) {
            parameters[serviceParameter] = value;
          }
        });
        // Make sure disabled rules and disabled categories do not contain spaces
        if (
          this._workspaceConfig.has(Constants.CONFIGURATION_LT_DISABLED_RULES)
        ) {
          const disabledRules: string = this._workspaceConfig.get(
            Constants.CONFIGURATION_LT_DISABLED_RULES,
          ) as string;
          if (disabledRules.split(" ").length > 1) {
            reject(
              new Error(
                '"LanguageTool Linter > Language Tool: Disabled Rules" contains spaces. Please review the setting and remove any spaces.',
              ),
            );
          }
        }
        if (
          this._workspaceConfig.has(
            Constants.CONFIGURATION_LT_DISABLED_CATEGORIES,
          )
        ) {
          const disabledCategories: string = this._workspaceConfig.get(
            Constants.CONFIGURATION_LT_DISABLED_CATEGORIES,
          ) as string;
          if (disabledCategories.split(" ").length > 1) {
            reject(
              new Error(
                '"LanguageTool Linter > Language Tool: Disabled Categories" contains spaces. Please review the setting and remove any spaces.',
              ),
            );
          }
        }

        const formBody = Object.keys(parameters)
          .map(
            (key: string) =>
              encodeURIComponent(key) +
              "=" +
              encodeURIComponent(parameters[key] as string),
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
      } else if (this._state !== Constants.SERVICE_STATES.RUNNING) {
        switch (this._state) {
          case Constants.SERVICE_STATES.STOPPED:
            reject(new Error("LanguageTool called on stopped service."));
            break;
          case Constants.SERVICE_STATES.STARTING:
            reject(new Error("LanguageTool called on starting service."));
            break;
          case Constants.SERVICE_STATES.STOPPING:
            reject(new Error("LanguageTool called on stopping service."));
            break;
          case Constants.SERVICE_STATES.ERROR:
            reject(new Error("LanguageTool called on errored service."));
            break;
          default:
            this._state = Constants.SERVICE_STATES.ERROR;
            reject(new Error("LanguageTool called on unknown service state."));
            break;
        }
      } else if (url === undefined) {
        this._state = Constants.SERVICE_STATES.ERROR;
        reject(new Error("LanguageTool URL is not defined"));
      } else {
        this._state = Constants.SERVICE_STATES.ERROR;
        reject(new Error("Unknown error"));
      }
    });
  }

  public start(): Promise<boolean> {
    this._state = Constants.SERVICE_STATES.STARTING;
    return new Promise((resolve) => {
      this._state = Constants.SERVICE_STATES.RUNNING;
      resolve(true);
    });
  }

  public stop(): Promise<void> {
    this._state = Constants.SERVICE_STATES.STOPPING;
    return new Promise((resolve) => {
      this._state = Constants.SERVICE_STATES.STOPPED;
      resolve();
    });
  }

  public dispose(): Promise<void> {
    return this.stop();
  }

  public ping(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.invokeLanguageTool('{"annotation":[{"text": "Ping"}]}')
        .then((response: ILanguageToolResponse) => {
          if (response) {
            resolve(true);
          } else {
            reject(new Error("Unexpected response from LanguageTool"));
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  // end of class
}
