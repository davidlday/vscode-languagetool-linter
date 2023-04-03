# Change Log

All notable changes to the “languagetool-linter” extension will be documented in
this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Changes not yet released.

## [0.20.0] - 2023-04-02

- Premium Support by Adding Settings for username and apiKey (#438) - thank you
  (@thomaskrause)[https://github.com/thomaskrause],
  (@johangirod)[https://github.com/johangirod]!
- Allow spell-check rules to be ignored by line. This Works for HTML and
  markdown, where inline comments are allowed (e.g. pandoc) - thank you
  (@steven-r)[https://github.com/steven-r]!

## [0.19.0] - 2021-11-23

## Changed

- replaced license-webpack-plugin with webpack-license-plugin

## Maintenance

- dependency updates

## [0.18.0] - 2021-04-02

### Fixed

- Linter wasn't registered as a Code Actions Provider for the list of plain text
  IDs in settings, resulting in no suggestions for potential errors
  ([284](https://github.com/davidlday/vscode-languagetool-linter/issues/284)).

### Added

- Show warning when spaces exist in either Disabled Rules or Disable Categories
  ([217](https://github.com/davidlday/vscode-languagetool-linter/issues/217)).

### Maintenance

- Refactored code for maintainability.
  - Moved tests to root of repo.
  - Moved test fixtures to root of repo.
  - Renamed src files to match class names.

## [0.17.0] - 2021-01-16

### Fixed

- Port number for docker in README
  ([#205](https://github.com/davidlday/vscode-languagetool-linter/issues/205)).
- Smart format command and on save handles apostrophes correctly
  ([216](https://github.com/davidlday/vscode-languagetool-linter/issues/216))

## [0.16.0] - 2020-11-08

### Added

- Support for [mdx](https://mdxjs.com/) files. (Thank you,
  [@shicolas](https://github.com/shicholas)).
- Publication on [Open-VSX Registry](https://open-vsx.org)
  [#182](https://github.com/davidlday/vscode-languagetool-linter/issues/182).
- Option to hide Rule IDs in diagnostics
  [#121](https://github.com/davidlday/vscode-languagetool-linter/issues/121).
- Moved Rule ID to end of diagnostic message and linked to rule info, excluding
  spelling rules. Required updating `@types/vscode` to 1.43.0.

### Fixed

- Replaced deprecated `request` package with `node-fetch`
  [#185](https://github.com/davidlday/vscode-languagetool-linter/issues/185).
- Converted from `tslint` to `eslint`
  [#149](https://github.com/davidlday/vscode-languagetool-linter/issues/149).

## [0.15.0] - 2020-06-21

### Added

- Ability to enable / disable checking of Plain Text documents. Enabled by
  default.
- Ability to provide a list of
  [language ids](https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers)
  that should be considered Plain Text. Defaults to “plaintext”.
- “Force Check as Plain Text Document” command shows on all language ids other
  than HTML and Markdown for manual, one-time checking.
- “Clear Document Diagnostics” command to clear LanguageTool diagnostics in
  support of one-time checking.

### Changed

- Relabeled “Lint Current Document” command to “Check Document”.
- Only HTML and Markdown show the “Check Document” command.

### Maintenance

- updated dependencies
- prettier code

### Security

- npm audit fix

## [0.14.0] - 2020-05-09

### Fixed

- Backslashes in markdown plus a valid escape character no longer shifting
  diagnostic highlighting
  [#132](https://github.com/davidlday/vscode-languagetool-linter/issues/132)

## [0.13.0] - 2020-05-08

### Fixed

- Keyboard shortcuts and light bulb now working on LanguageTool problems
  [#120](https://github.com/davidlday/vscode-languagetool-linter/issues/120)

## [0.12.1] - 2020-05-07

### Changed

- Testing release via GitHub Actions

## [0.12.0] - 2020-01-26

### Changed

- Output channel no longer forced open on errors
- Ignored Word Configuration items specified as strings
- Refactored constants and configuration manager

## [0.11.0] - 2020-01-11

### Fixed

- Smart Format command name updated
- TSLint configuration updated
- Codacy checks use repo configuration
- Reduced unnecessary linting by removing `onDidChangeActiveTextEditor`
  subscription and only subscribing to `onDidChangeTextDocument`
- Diagnostics cleared when document is closed to eliminate messages appearing
  after document is closed
  [#64](https://github.com/davidlday/vscode-languagetool-linter/issues/64)
- Smart Format on Save no longer appending newline at end
  [#81](https://github.com/davidlday/vscode-languagetool-linter/issues/81)
- Conditions for smart double quotes
  [#84](https://github.com/davidlday/vscode-languagetool-linter/issues/84)

### Added

- Smart Format on Save option
- Lint on Save setting
  [#80](https://github.com/davidlday/vscode-languagetool-linter/issues/80)
- Lint on Open setting
  [#80](https://github.com/davidlday/vscode-languagetool-linter/issues/80)
- Diagnostic Severity setting
  [#79](https://github.com/davidlday/vscode-languagetool-linter/issues/79)
- Webpack for performance goodness
- Hide Diagnostics on Change clears when document changes to hide messages while
  typing
- Minimum and maximum port settings for the managed service
  [#78](https://github.com/davidlday/vscode-languagetool-linter/issues/78)

## [0.10.0] - 2019-12-07

### Fixed

- Header marks reduced to only single hash instead of entire markup to prevent
  passing front matter
- Smart Format command only applies smart format to text and skips markup

### Changed

- Auto Format Enabled renamed to Smart Format on Type since it only formats
  smart characters

## [0.9.1] - 2019-12-01

### Fixed

- Header marks (#) preserved to prevent LanguageTool from throwing
  `PUNCTUATION_PARAGRAPH_END` Errors
- Ordered and Unordered list items interpreted as bullets to prevent
  LanguageTool from throwing `UPPERCASE_SENTENCE_START` and
  `PUNCTUATION_PARAGRAPH_END` Errors
- Plaintext Annotatedtext produced correctly

## [0.9.0] - 2019-11-29

### Added

- Ignored Words lists at the User and Workspace levels.
  - The Workspace level list appears in the User settings, but is ignored. This
    is due to how settings work as overrides instead of cumulative.
  - Ignored words have an optional hint shown to remove the word from the
    ignored list.

## [0.8.1] - 2019-11-17

### Fixed

- Corrected category on commands.

## [0.8.0] - 2019-11-17

### Added

- `managed.classPath` setting supports multiple paths and file globbing via
  [node-glob](https://github.com/isaacs/node-glob). This accommodates various
  install methods. For example, on Arch Linux using the pacman LanguageTool
  package, you would set this to `/usr/share/java/languagetool/*.jar`.

### Deprecated

- Deprecated `managed.jarFile` setting in favor of `managed.classPath` to align
  with how the setting was used.

## [0.7.0] - 2019-11-17

### Deleted

- New class path setting. Extension doesn’t activate when published, but all
  tests pass.

## [0.6.0] - 2019-11-17

### Added

- `managed.classPath` setting supports multiple paths and file globbing via
  [node-glob](https://github.com/isaacs/node-glob). This accommodates various
  install methods. For example, on Arch Linux using the pacman LanguageTool
  package, you would set this to `/usr/share/java/languagetool/*.jar`.

### Deprecated

- Deprecated `managed.jarFile` setting in favor of `managed.classPath` to align
  with how the setting was used.

## [0.5.0] - 2019-11-15

### Fixed

- Inline code is interpreted as hashtags, eliminated errors around extra spaces
  or missing words.
  ([#40](https://github.com/davidlday/vscode-languagetool-linter/issues/40))

### Added

- Basic tests for extension, configuration manager, and linter.

## [0.4.1] - 2019-11-15

### Removed

- All version 0.4.0 changes. Package broke on publication.

## [0.4.0] - 2019-11-15

### Fixed

- Inline code is interpreted as hashtags, eliminated errors around extra spaces
  or missing words.
  ([#40](https://github.com/davidlday/vscode-languagetool-linter/issues/40))

### Added

- `managed.classPath` setting supports multiple paths and file globbing via
  [node-glob](https://github.com/isaacs/node-glob). This accommodates various
  install methods. For example, on Arch Linux using the pacman LanguageTool
  package, you would set this to `/usr/share/java/languagetool/*.jar`.

### Deprecated

- Deprecated `managed.jarFile` setting in favor of `managed.classPath` to align
  with how the setting was used.

## [0.3.2] - 2019-11-04

### Fixed

- `autoFormatCommand` no longer eats the quotes at start of line
- `autoFormatCommand` no longer converts comments to em-dashes

### Changed

- Use regex in `autoFormatCommand` for simplicity.

## [0.3.1] - 2019-10-25

### Fixed

- Upgraded http-proxy-agent to 2.2.3.
  ([npmjs advisory 1184](https://www.npmjs.com/advisories/1184))

## [0.3.0] - 2019-10-20

### Added

- Auto Format on Type feature. Replaces double and single quotes with smart
  quotes, apostrophes with smart apostrophe, multiple consecutive hyphens with
  em and en dashes, and three consecutive periods with ellipses. Feature is
  controlled with `autoformat.enabled` setting.
- Auto Format Command replaces quotes, apostrophes, dashes, and periods with
  smart quotes, en-dash, em-dash, and ellipses in the entire document.

### Fixed

- Updated annotatedtext-remark to filter out front matter.

## [0.2.1] - 2019-10-06

### Fixed

- Checking occurred on non-file documents (i.e. git). Lint functions now check
  to make sure documents passed in have a
  [URI](https://code.visualstudio.com/api/references/vscode-api#Uri) schema of
  “file”. See
  [issue #9](https://github.com/davidlday/vscode-languagetool-linter/issues/9).

## [0.2.0] - 2019-10-05

### Added

- “Service Type” setting with the following 3 options:
  - `external` (default): Use an external LanguageTool service. URL must be
    provided in “External: URL”.
  - **NEW**: `managed`: Have VS Code manage a LanguageTool service. A path to a
    languagetool-server.jar file must be provided in “Managed: Jar File”. The
    extension will try to find a random open port.
  - `public`: Uses the public LanguageTool API service.

### Changed

- **BREAKING:** The checkbox setting “Public Api” has been replaced by the
  “Service Type” drop-down setting.
- **BREAKING:** The “URL” setting has been moved to “External: URL”.
- The caution notice for “Lint on Change” has been removed. Throttling seems to
  be working. Still off by default.
- Output / errors now sent to “LanguageTool Linter” output channel.

## [0.1.0] - 2019-09-28

### Added

- Basic Spelling / Grammar Checking with Quick Fix options on errors.
- `languageTool.disableCategories`: IDs of categories to be disabled,
  comma-separated.
- `languageTool.disabledRules`: IDs of rules to be disabled, comma-separated.
- `languageTool.language`: A language code like en-US, de-DE, fr, or auto to
  guess the language automatically (see `preferredVariants` below). For
  languages with variants (English, German, Portuguese) spell checking will only
  be activated when you specify the variant, e.g. en-GB instead of just en.
- `languageTool.motherTongue`: A language code of the user‘s native language,
  enabling false friends checks for some language pairs.
- `languageTool.preferredVariants`: Comma-separated list of preferred language
  variants. The language detector used with language=auto can detect e.g.
  English, but it cannot decide whether British English or American English is
  used. Thus, this parameter can be used to specify the preferred variants like
  en-GB and de-AT. Only available with language=auto.
- `lintOnChange`: Lint every time the document changes. Use with caution.
- `publicApi`: Use the public LanguageTool API Service.
- `url`: URL of your LanguageTool server. Defaults to localhost on port 8081.
