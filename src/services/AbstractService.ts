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

import * as Fetch from "node-fetch";
import {
  ConfigurationChangeEvent,
  Disposable,
  WorkspaceConfiguration,
} from "vscode";
import * as Constants from "../Constants";
import { ILanguageToolResponse, ILanguageToolService } from "../Interfaces";

export abstract class AbstractService
  implements Disposable, ILanguageToolService
{
  protected _state = Constants.SERVICE_STATES.STOPPED;
  protected _workspaceConfig: WorkspaceConfiguration;
  protected _ltUrl: string | undefined;
  protected _serviceConfigurationRoot: string = Constants.CONFIGURATION_ROOT;
  protected _username: string | undefined;
  protected _apiKey: string | undefined;

  constructor(workspaceConfig: WorkspaceConfiguration) {
    this._workspaceConfig = workspaceConfig;
  }

  public getURL(): string | undefined {
    return this._ltUrl;
  }

  public getState(): string {
    return this._state;
  }

  public async reloadConfiguration(
    event: ConfigurationChangeEvent,
    workspaceConfig: WorkspaceConfiguration,
  ): Promise<boolean> {
    if (event.affectsConfiguration(this._serviceConfigurationRoot)) {
      await this.stop();
      this._workspaceConfig = workspaceConfig;
    }
    return this.start();
  }

  public invokeLanguageTool(
    annotatedText: string,
  ): Promise<ILanguageToolResponse> {
    return new Promise((resolve, reject) => {
      const url = this.getURL();
      if (this._state === Constants.SERVICE_STATES.READY && url) {
        const parameters: Record<string, string> = {};
        parameters["data"] = annotatedText;
        Constants.SERVICE_PARAMETERS.forEach((serviceParameter) => {
          const configKey = `${Constants.CONFIGURATION_LT}.${serviceParameter}`;
          const value: string = this._workspaceConfig.get(configKey) as string;
          if (value) {
            parameters[serviceParameter] = value;
          }
        });
        if (this._username && this._apiKey) {
          // TODO: Give feedback if one is set but not the other
          parameters["username"] = this._username;
          parameters["apiKey"] = this._apiKey;
        }
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
      } else if (this._state !== Constants.SERVICE_STATES.READY) {
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
      this._state = Constants.SERVICE_STATES.READY;
      resolve(true);
    });
  }

  public stop(): Promise<boolean> {
    this._state = Constants.SERVICE_STATES.STOPPING;
    return new Promise((resolve) => {
      this._state = Constants.SERVICE_STATES.STOPPED;
      resolve(true);
    });
  }

  public dispose(): Promise<boolean> {
    return this.stop();
  }

  public ping(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      // If we know the service isn't "running" then we won't ping it
      // This is to provide a consistent response to the user and consistent
      // behaviour across different implementations of the service
      if (this._state === Constants.SERVICE_STATES.READY) {
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
      } else {
        resolve(false);
      }
    });
  }

  protected forcedPing(): Promise<boolean> {
    return new Promise((resolve) => {
      this.invokeLanguageTool('{"annotation":[{"text": "Ping"}]}')
        .then((response: ILanguageToolResponse) => {
          if (response) {
            resolve(true);
          } else {
            resolve(false);
          }
        })
        .catch(() => {
          resolve(false);
        });
    });
  }
  // end of class
}
