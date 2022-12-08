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

import { AbstractService } from "./AbstractService";
import * as Constants from "../Constants";
import { WorkspaceConfiguration } from "vscode";

export class PublicService extends AbstractService {
  constructor(workspaceConfig: WorkspaceConfiguration) {
    super(workspaceConfig);
    this._serviceConfigurationRoot = Constants.CONFIGURATION_PUBLIC;
    this._ltUrl =
      workspaceConfig.get(Constants.CONFIGURATION_PUBLIC_URL) +
      Constants.SERVICE_CHECK_PATH;
    this._username = workspaceConfig.get(
      Constants.CONFIGURATION_PUBLIC_USERNAME,
    );
    this._apiKey = workspaceConfig.get(Constants.CONFIGURATION_PUBLIC_APIKEY);
  }
}
