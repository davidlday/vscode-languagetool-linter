# Change Log

All notable changes to the "languagetool-linter" extension will be documented in this file.

## [Unreleased]

## [0.2.0] - 2019-10-05

### Added

* "Service Type" setting with the following 3 options:
  * `external` (default): Use an external LanguageTool service. URL must be provided in "External: Url".
  * **NEW**: `managed`: Have VS Code manage a LanguageTool service. A path to a languagetool-server.jar file must be provided in "Managed: Jar File". The extension will try to find a random open port.
  * `public`: Uses the public LanguageTool API service.

### Changed

* **BREAKING:** The checkbox setting "Public Api" has been replaced by the "Service Type" drop-down setting.
* **BREAKING:** The "Url" setting has been moved to "External: Url".
* The caution notice for "Lint on Change" has been removed. Throttling seems to be working. Still off by default.
* Output / errors now sent to "LanguageTool Linter" output channel.

## [0.1.0] - 2019-09-28

### Added

* Basic Spelling / Grammar Checking with QuickFix options on errors.
* `languageTool.disableCategories`: IDs of categories to be disabled, comma-separated.
* `languageTool.disabledRules`: IDs of rules to be disabled, comma-separated.
* `languageTool.language`: A language code like en-US, de-DE, fr, or auto to guess the language automatically (see preferredVariants below). For languages with variants (English, German, Portuguese) spell checking will only be activated when you specify the variant, e.g. en-GB instead of just en.
* `languageTool.motherTongue`: A language code of the user's native language, enabling false friends checks for some language pairs.
* `languageTool.preferredVariants`: Comma-separated list of preferred language variants. The language detector used with language=auto can detect e.g. English, but it cannot decide whether British English or American English is used. Thus this parameter can be used to specify the preferred variants like en-GB and de-AT. Only available with language=auto.
* `lintOnChange`: Lint every time the document changes. Use with caution.
* `publicApi`: Use the public LanguageTool API Service.
* `url`: URL of your LanguageTool server. Defaults to localhost on port 8081.
