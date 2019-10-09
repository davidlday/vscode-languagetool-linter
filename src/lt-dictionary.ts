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

// A custom list of words to be ignored
// at both the User and Workspace level

export class LTDictionary() {

  const SPELLING_RULE_PREFIXES: string[] = [
    "MORFOLOGIK_RULE",
    "SPELLER_RULE",
    "HUNSPELL_NO_SUGGEST_RULE",
    "HUNSPELL_RULE",
    "FR_SPELLING_RULE"
  ];

  function isSpellingRule(ruleId: string): Boolean {
    SPELLING_RULE_PREFIXES.forEach(function (prefix) {
      if (ruleId.indexOf(prefix) !== -1) {
        return true;
      }
    });
    return false;
  }

}

