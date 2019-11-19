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

import { ExtensionContext, Memento } from 'vscode';

export class LTDictionary {

  context: ExtensionContext;

  constructor(context: ExtensionContext) {
    this.context = context;
  }

  // Get Words
  getWords(ruleId: string, state: Memento) {
    let words: Set<string> = state.get(ruleId) as Set<string>;
    if (words) {
      return words;
    } else {
      return new Set<string>();
    }
  }

  getUserWords(ruleId: string): Set<string> {
    return this.getWords(ruleId, this.context.globalState);
  }

  getWorkspaceWords(ruleId: string): Set<string> {
    return this.getWords(ruleId, this.context.workspaceState);
  }

  // Has Word
  hasWord(ruleId: string, word: string, state: Memento) {
    if (LTDictionary.isSpellingRule(ruleId)) {
      let words: Set<string> = this.getWords(ruleId, state);
      if (words && words.has(word)) {
        return true;
      }
    }
    return false;
  }

  hasUserWord(ruleId: string, word: string): boolean {
    return this.hasWord(ruleId, word, this.context.globalState);
  }

  hasWorkspaceWord(ruleId: string, word: string): boolean {
    return this.hasWord(ruleId, word, this.context.workspaceState);
  }

  // Add Word
  addWord(ruleId: string, word: string, state: Memento): void {
    let words = this.getWords(ruleId, state);
    words.add(word);
    state.update(ruleId, words);
  }

  addUserWord(ruleId: string, word: string): void {
    this.addWord(ruleId, word, this.context.globalState);
  }

  addWorkspaceWord(ruleId: string, word: string): void {
    this.addWord(ruleId, word, this.context.workspaceState);
  }

  // Remove Word
  removeWord(ruleId: string, word: string, state: Memento): boolean {
    let words = this.getWords(ruleId, state);
    if (words.delete(word)) {
      state.update(ruleId, words);
      return true;
    }
    return false;
  }

  removeUserWord(ruleId: string, word: string): boolean {
    return this.removeWord(ruleId, word, this.context.globalState);
  }

  removeWorkspaceWord(ruleId: string, word: string): boolean {
    return this.removeWord(ruleId, word, this.context.workspaceState);
  }

  // Is Rule a Spelling Rule?
  static isSpellingRule(ruleId: string): boolean {
    // https://forum.languagetool.org/t/identify-spelling-rules/4775/3
    // https://github.com/languagetool-org/languagetool-website-2018/blob/master/public/vendors/tiny_mce/plugins/atd-tinymce/src/editor_plugin3.js#L535-L537
    return ruleId.indexOf("MORFOLOGIK_RULE") !== -1 || ruleId.indexOf("SPELLER_RULE") !== -1 ||
      ruleId.indexOf("HUNSPELL_NO_SUGGEST_RULE") !== -1 || ruleId.indexOf("HUNSPELL_RULE") !== -1 ||
      ruleId.indexOf("FR_SPELLING_RULE") !== -1;
  }

}
