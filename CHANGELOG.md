# Change Log

All notable changes to the "languagetool-linter" extension will be documented in this file.

## [Unreleased]

### Added

* `managed.classPath` setting supports multiple paths and file globbing via [node-glob](https://github.com/isaacs/node-glob). This accomodates various install methods. For example, on Arch Linux using the pacman LanguageTool package, you would set this to `/usr/share/java/languagetool/*.jar`

### Deprecated

* Deprecated `managed.jarFile` setting in favor of `managed.classPath` to align with how the setting was used.

## [0.5.0] - 2019-11-15

### Fixed

* Inline code is interpreted as hashtags, eliminated errors around extra spaces or missing words. ([#40](https://github.com/davidlday/vscode-languagetool-linter/issues/40))

### Added

* Basic tests for extension, configuration manager, and linter.

## [0.4.1] - 2019-11-15

### Removed

* All version 0.4.0 Fixes, adds, and deprecations. Package broke on publication.

## [0.4.0] - 2019-11-15

### Fixed

* Inline code is interpreted as hashtags, eliminated errors around extra spaces or missing words. ([#40](https://github.com/davidlday/vscode-languagetool-linter/issues/40))

### Added

* `managed.classPath` setting supports multiple paths and file globbing via [node-glob](https://github.com/isaacs/node-glob). This accomodates various install methods. For example, on Arch Linux using the pacman LanguageTool package, you would set this to `/usr/share/java/languagetool/*.jar`

### Deprecated

* Deprecated `managed.jarFile` setting in favor of `managed.classPath` to align with how the setting was used.

## [0.3.2] - 2019-11-04

### Fixed

* `autoFormatCommand` no longer eats the quotes at start of line
* `autoFormatCommand` no longer converts comments to em-dashes

### Changed

* Use regex in `autoFormatCommand` for simplicity.

## [0.3.1] - 2019-10-25

### Fixed

* Upgraded http-proxy-agent to 2.2.3. ([npmjs advisory 1184](https://www.npmjs.com/advisories/1184))

## [0.3.0] - 2019-10-20

### Added

* Auto Format on Type feature. Replaces double and single quotes with smart quotes, apostrophes with smart apostrophe, multiple consecutive hyphens with em and en dashes, and three consecutive periods with ellipses. Feature is controlled with `autoformat.enabled` setting.
* Auto Format Command replaces quotes, apostrophes, dashes, and periods with smart quotes, en-dash, em-dash, and ellipses in the entire document.

### Fixed

* Updated annotatedtext-remark to filter out front matter.

## [0.2.1] - 2019-10-06

### Fixed

* Checking occurred on non-file documents (i.e. git). Lint functions now check to make sure documents passed in have a [URI](https://code.visualstudio.com/api/references/vscode-api#Uri) schema of "file". See [issue #9](https://github.com/davidlday/vscode-languagetool-linter/issues/9).

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
