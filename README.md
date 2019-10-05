# LanguageTool Linter for Visual Studio Code

[![Build Status](https://travis-ci.org/davidlday/vscode-languagetool-linter.svg?branch=master)](https://travis-ci.org/davidlday/vscode-languagetool-linter)

Grammar, Style and Spell Checking in VS Code via [LanguageTool](https://languagetool.org). Support Markdown, HTML, and plain text files.

In memory of [Adam Voss](https://github.com/adamvoss), original creator of the [LanguageTool for Visual Studio Code](https://github.com/languagetool-language-server/vscode-languagetool) extension.

## BREAKING CHANGES

I've tweaked the configuration a little, so you'll need to review the setup options below and make sure you have a valid configuration. Note that the "Public Api" checkbox has been replaced by the "Service Type", and "URL" setting is now "> External: URL".

## Features

* Issue highlighting with hover description.
* Replacement suggestions.
* Checks plain text, Markdown, and HTML.

## Setup

The defaults are probably not going to work for you, but they are there to make sure using [LanguageTool's Public API](http://wiki.languagetool.org/public-http-api) is done by choice. See [this issue](https://github.com/wysiib/linter-languagetool/issues/33) on the [Atom LanguageTool Linter](https://atom.io/packages/linter-languagetool) for an explanation why.

The defaults assume the following:

1. You do not want to use the [LanguageTool's Public API](http://wiki.languagetool.org/public-http-api)
2. You're running [LanguageTool HTTP Server](http://wiki.languagetool.org/http-server) on your machine using the default port of 8081.
3. You do not want to have this extension manage your local [LanguageTool HTTP Server](http://wiki.languagetool.org/http-server) service.

If this doesn't work for you, here are your options.

### Option 1: Use an External Service

This could either be a [locally running instance](https://github.com/davidlday/vscode-languagetool-linter/wiki#run-a-local-languagetool-service) of LanguageTool, or the service running somewhere else.

1. Set the URL in "LanguageTool Linter > External: Url" (i.e. `http://localhost:8081`).
1. Set "LanguageTool Linter: Service Type" to `external`.

![External URL](images/external.gif)

### Option 2: Use an Extension-Managed Service

Works well if you're only using LangaugeTool in Visual Studio Code.

1. [Install LanguageTool](https://github.com/davidlday/vscode-languagetool-linter/wiki#installing-languagetool) locally.
1. Set "LanguageTool Linter > Managed: Jar File" to the location of the `languagetool-server.jar` file. The install doc has hints.
1. Set "LanguageTool Linter: Service Type" to `managed`.

![Managed Service](images/managed.gif)

### Option 3: Public API Service

Make sure you read and understand [LanguageTool's Public API](http://wiki.languagetool.org/public-http-api) before doing this.

1. Set "LanguageTool Linter: Service Type" to `public`.

![Public API](images/public.gif)

## Configuration

Most configuration items should be safe, but there are three you should pay particular attention to:

1. *Public Api*: This will use [LanguageTool's Public API](http://wiki.languagetool.org/public-http-api) service. If you violate their conditions, they'll block your IP address.
2. *Lint on Change*: This will make a call to the LanguageTool API on every change. If you mix this with the *Public Api*, you're more likely to violate their conditions and get your IP address blocked. I prefer to set VS Code's [Auto Save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) to `afterDelay`, set for 1000ms (default).
3. *Language Tool: Preferred Variants*: If you set this, then *Language Tool: Language* must be set to `auto`. If it isn't, the service will throw an error.

Below is the full configuration for reference:

```JSON
        "languageToolLinter.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Allow to enable languageTool on specific workspaces"
        },
        "languageToolLinter.lintOnChange": {
          "type": "boolean",
          "default": false,
          "description": "Lint every time the document changes. Use with caution."
        },
        "languageToolLinter.serviceType": {
          "type": "string",
          "default": "custom",
          "description": "What kind of LanguageTool service to use: external (default), public, or managed.",
          "enum": [
            "external",
            "managed",
            "public"
          ],
          "enumDescriptions": [
            "Provide a URL to an external LanguageTool service. Defaults to 'http://localhost:8081'. Specify the URL in 'External: Url'.",
            "Let LanguageTool Linter manage a local service. Specify the path to the script in 'Script'.",
            "Use the public LanguageTool API Service at https://languagetool.org/api."
          ]
        },
        "languageToolLinter.external.url": {
          "type": "string",
          "default": "http://localhost:8081",
          "description": "URL of your LanguageTool server. Defaults to localhost on port 8081."
        },
        "languageToolLinter.managed.jarFile": {
          "type": "string",
          "default": "",
          "description": "Path to languagetool-server.jar on your local machine."
        },
        "languageToolLinter.languageTool.language": {
          "type": "string",
          "default": "auto",
          "description": "A language code like en-US, de-DE, fr, or auto to guess the language automatically (see preferredVariants below). For languages with variants (English, German, Portuguese) spell checking will only be activated when you specify the variant, e.g. en-GB instead of just en.",
          "enum": [
            "auto",
            "ast-ES",
            "be-BY",
            "br-FR",
            "ca-ES",
            "ca-ES-valencia",
            "zh-CN",
            "da-DK",
            "nl",
            "en",
            "en-AU",
            "en-CA",
            "en-GB",
            "en-NZ",
            "en-ZA",
            "en-US",
            "eo",
            "fr",
            "gl-ES",
            "de",
            "de-AT",
            "de-DE",
            "de-CH",
            "el-GR",
            "it",
            "ja-JP",
            "km-KH",
            "fa",
            "pl-PL",
            "pt",
            "pt-AO",
            "pt-BR",
            "pt-MZ",
            "pt-PT",
            "ro-RO",
            "ru-RU",
            "de-DE-x-simple-language",
            "sk-SK",
            "sl-SI",
            "es",
            "sv",
            "tl-PH",
            "ta-IN",
            "uk-UA"
          ],
          "enumDescriptions": [
            "Auto Select",
            "Asturian",
            "Belarusian",
            "Breton",
            "Catalan",
            "Catalan (Valencian)",
            "Chinese",
            "Danish",
            "Dutch",
            "English",
            "English (Australian)",
            "English (Canadian)",
            "English (GB)",
            "English (New Zealand)",
            "English (South African)",
            "English (US)",
            "Esperanto",
            "French",
            "Galician",
            "German",
            "German (Austria)",
            "German (Germany)",
            "German (Swiss)",
            "Greek",
            "Italian",
            "Japanese",
            "Khmer",
            "Persian",
            "Polish",
            "Portuguese",
            "Portuguese (Angola preAO)",
            "Portuguese (Brazil)",
            "Portuguese (Moçambique preAO)",
            "Portuguese (Portugal)",
            "Romanian",
            "Russian",
            "Simple German",
            "Slovak",
            "Slovenian",
            "Spanish",
            "Swedish",
            "Tagalog",
            "Tamil",
            "Ukrainian"
          ]
        },
        "languageToolLinter.languageTool.motherTongue": {
          "type": "string",
          "default": "",
          "description": "A language code of the user's native language, enabling false friends checks for some language pairs.",
          "enum": [
            "",
            "ast-ES",
            "be-BY",
            "br-FR",
            "ca-ES",
            "ca-ES-valencia",
            "zh-CN",
            "da-DK",
            "nl",
            "en",
            "en-AU",
            "en-CA",
            "en-GB",
            "en-NZ",
            "en-ZA",
            "en-US",
            "eo",
            "fr",
            "gl-ES",
            "de",
            "de-AT",
            "de-DE",
            "de-CH",
            "el-GR",
            "it",
            "ja-JP",
            "km-KH",
            "fa",
            "pl-PL",
            "pt",
            "pt-AO",
            "pt-BR",
            "pt-MZ",
            "pt-PT",
            "ro-RO",
            "ru-RU",
            "de-DE-x-simple-language",
            "sk-SK",
            "sl-SI",
            "es",
            "sv",
            "tl-PH",
            "ta-IN",
            "uk-UA"
          ],
          "enumDescriptions": [
            "No Language Selected",
            "Asturian",
            "Belarusian",
            "Breton",
            "Catalan",
            "Catalan (Valencian)",
            "Chinese",
            "Danish",
            "Dutch",
            "English",
            "English (Australian)",
            "English (Canadian)",
            "English (GB)",
            "English (New Zealand)",
            "English (South African)",
            "English (US)",
            "Esperanto",
            "French",
            "Galician",
            "German",
            "German (Austria)",
            "German (Germany)",
            "German (Swiss)",
            "Greek",
            "Italian",
            "Japanese",
            "Khmer",
            "Persian",
            "Polish",
            "Portuguese",
            "Portuguese (Angola preAO)",
            "Portuguese (Brazil)",
            "Portuguese (Moçambique preAO)",
            "Portuguese (Portugal)",
            "Romanian",
            "Russian",
            "Simple German",
            "Slovak",
            "Slovenian",
            "Spanish",
            "Swedish",
            "Tagalog",
            "Tamil",
            "Ukrainian"
          ]
        },
        "languageToolLinter.languageTool.preferredVariants": {
          "type": "string",
          "default": "",
          "description": "Comma-separated list of preferred language variants. The language detector used with language=auto can detect e.g. English, but it cannot decide whether British English or American English is used. Thus this parameter can be used to specify the preferred variants like en-GB and de-AT. Only available with language=auto."
        },
        "languageToolLinter.languageTool.disabledRules": {
          "type": "string",
          "default": "",
          "description": "IDs of rules to be disabled, comma-separated."
        },
        "languageToolLinter.languageTool.disabledCategories": {
          "type": "string",
          "default": "",
          "description": "IDs of categories to be disabled, comma-separated."
        }
```

## Credits

The following projects provided excellent guidance on creating this project.

* [LaguageTool](https://languagetool.org) (of course!)
* [Atom Linter LanguageTool](https://github.com/wysiib/linter-languagetool/)
* [LT<sub>e</sub>X](https://github.com/valentjn/vscode-ltex) — a fork of [LanguageTool for Visual Studio Code](https://github.com/languagetool-language-server/vscode-languagetool)
* [VS Code Write Good Extension](https://github.com/TravisTheTechie/vscode-write-good/)
* [Fall: Not Yet Another Parser Generator](https://github.com/matklad/fall)
* [markdownlint](https://github.com/DavidAnson/vscode-markdownlint)
