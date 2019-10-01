# Change Log

All notable changes to the "languagetool-linter" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

* Service is now controlled by `serviceType`, with one of the following values:
  * `external` (default): Use an external LanguageTool service. URL must be provided in `external.url`.
  * `managed`: Have VS Code manage a LanguageTool service. A path to languagetool-server.jar file must be provided in `task.jarFile`, and a port must be provided in `task.port`.
  * `public`: Uses the public LanguageTool API service.

## 0.1.0 - Initial Release

* Basic Spelling / Grammar Checking with QuickFix options on errors.
* `languageTool.disableCategories`: IDs of categories to be disabled, comma-separated.
* `languageTool.disabledRules`: IDs of rules to be disabled, comma-separated.
* `languageTool.language`: A language code like en-US, de-DE, fr, or auto to guess the language automatically (see preferredVariants below). For languages with variants (English, German, Portuguese) spell checking will only be activated when you specify the variant, e.g. en-GB instead of just en.
* `languageTool.motherTongue`: A language code of the user's native language, enabling false friends checks for some language pairs.
* `languageTool.preferredVariants`: Comma-separated list of preferred language variants. The language detector used with language=auto can detect e.g. English, but it cannot decide whether British English or American English is used. Thus this parameter can be used to specify the preferred variants like en-GB and de-AT. Only available with language=auto.
* `lintOnChange`: Lint every time the document changes. Use with caution.
* `publicApi`: Use the public LanguageTool API Service.
* `url`: URL of your LanguageTool server. Defaults to localhost on port 8081.
