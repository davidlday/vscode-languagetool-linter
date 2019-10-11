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

import * as fs from 'fs';
import * as path from 'path';

export class LTDictionary {

  dictionaryFile: fs.PathLike;
  dictionaryMap: Map<string, Set<string>>;

  constructor(dictionaryFile: string) {
    this.dictionaryFile = dictionaryFile;
    this.dictionaryMap = new Map<string, Set<string>>();
  }

  getWords(ruleId: string): Set<string> {
    let words: Set<string> | undefined = this.dictionaryMap.get(ruleId);
    if (words) {
      return words;
    } else {
      return new Set<string>();
    }
  }

  hasWord(ruleId: string, word: string): boolean {
    let words = this.dictionaryMap.get(ruleId);
    if (words && words.has(word)) {
      return true;
    }
    return false;
  }

  addWord(ruleId: string, word: string): void {
    let words = this.getWords(ruleId).add(word);
    this.dictionaryMap.set(ruleId, words);
  }

  removeWord(ruleId: string, word: string): boolean {
    let words = this.getWords(ruleId);
    if (words.delete(word)) {
      this.dictionaryMap.set(ruleId, words);
      return true;
    }
    return false;
  }

  loadDictionaryMap(): boolean {
    return true;
  }

  saveDictionaryMap(): boolean {
    return true;
  }

}
