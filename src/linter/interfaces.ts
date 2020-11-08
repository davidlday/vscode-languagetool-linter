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

// Interface - LanguageTool Response
export interface ILanguageToolResponse {
  software: {
    name: string;
    version: string;
    buildDate: string;
    apiVersion: number;
    premium: boolean;
    premiumHint: string;
    status: string;
  };
  warnings: {
    incompleteResults: boolean;
  };
  language: {
    name: string;
    code: string;
    detectedLanguage: {
      name: string;
      code: string;
      confidence: number;
    };
  };
  matches: ILanguageToolMatch[];
}

// Interface - LangaugeTool Match
export interface ILanguageToolMatch {
  message: string;
  shortMessage: string;
  offset: number;
  length: number;
  replacements: ILanguageToolReplacement[];
  context: {
    text: string;
    offset: number;
    length: number;
  };
  sentence: string;
  type: {
    typeName: string;
  };
  rule: {
    id: string;
    description: string;
    issueType: string;
    category: {
      id: string;
      name: string;
    };
  };
  ignoreForIncompleteSentence: boolean;
  contextForSureMatch: number;
}

// Interface LanguageTool Replacement
export interface ILanguageToolReplacement {
  value: string;
  shortDescription: string;
}
