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
