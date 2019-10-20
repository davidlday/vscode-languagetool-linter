# LanguageTool Linter for Visual Studio Code

[![Build Status](https://travis-ci.org/davidlday/vscode-languagetool-linter.svg?branch=master)](https://travis-ci.org/davidlday/vscode-languagetool-linter)

Grammar, Style and Spell Checking in VS Code via [LanguageTool](https://languagetool.org). Support Markdown, HTML, and plain text files.

In memory of [Adam Voss](https://github.com/adamvoss), original creator of the [LanguageTool for Visual Studio Code](https://github.com/languagetool-language-server/vscode-languagetool) extension.

### Breaking Changes

I've tweaked the configuration a little in version 0.2.0, so you'll need to review the setup options below and make sure you have a valid configuration. See the Changelog for details.

## Features

* Issue highlighting with hover description.
* Replacement suggestions.
* Checks plain text, Markdown, and HTML.
* Auto format on type to replace quotes with smart quotes, multiple consecutive hyphens with em or en-dash, and three consecutive periods with ellipses.
  * Make sure 'Editor: Format On Type' is enabled or this feature won't work. You can enable it at the document format level as well in your `settings.json`.

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

## Configuration Notes

Most configuration items should be safe, but there are three you should pay particular attention to:

1. *Public Api*: This will use [LanguageTool's Public API](http://wiki.languagetool.org/public-http-api) service. If you violate their conditions, they'll block your IP address.
2. *Lint on Change*: This will make a call to the LanguageTool API on every change. If you mix this with the *Public Api*, you're more likely to violate their conditions and get your IP address blocked.
3. *Language Tool: Preferred Variants*: If you set this, then *Language Tool: Language* must be set to `auto`. If it isn't, the service will throw an error.

## Credits

The following projects provided excellent guidance on creating this project.

* [LaguageTool](https://languagetool.org) (of course!)
* [Atom Linter LanguageTool](https://github.com/wysiib/linter-languagetool/)
* [LT<sub>e</sub>X](https://github.com/valentjn/vscode-ltex) — a fork of [LanguageTool for Visual Studio Code](https://github.com/languagetool-language-server/vscode-languagetool)
* [VS Code Write Good Extension](https://github.com/TravisTheTechie/vscode-write-good/)
* [Fall: Not Yet Another Parser Generator](https://github.com/matklad/fall)
* [markdownlint](https://github.com/DavidAnson/vscode-markdownlint)
