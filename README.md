# LanguageTool Linter for Visual Studio Code

<!--
NOTE: SVGs not allowed in README on extensions.
[![Node.js CI](https://github.com/davidlday/vscode-languagetool-linter/workflows/Node.js%20CI/badge.svg)](https://github.com/davidlday/vscode-languagetool-linter/actions?query=workflow%3A%22Node.js+CI%22)
-->
[![GitHub Workflow Status](https://img.shields.io/github/workflow/status/davidlday/vscode-languagetool-linter/Node.js%20CI)](https://github.com/davidlday/vscode-languagetool-linter/actions)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/1f9fb350738a438ba0d4142896733026)](https://www.codacy.com/manual/davidlday/vscode-languagetool-linter?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=davidlday/vscode-languagetool-linter&amp;utm_campaign=Badge_Grade)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/davidlday.languagetool-linter?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=davidlday.languagetool-linter)
[![Visual Studio Marketplace Rating (Stars)](https://img.shields.io/visual-studio-marketplace/stars/davidlday.languagetool-linter?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=davidlday.languagetool-linter)

Grammar, Style and Spell Checking in VS Code via [LanguageTool](https://languagetool.org). Support Markdown, HTML, and plain text files.

In memory of [Adam Voss](https://github.com/adamvoss), original creator of the [LanguageTool for Visual Studio Code](https://github.com/languagetool-language-server/vscode-languagetool) extension.

## Features

* Issue highlighting with hover description.
* Replacement suggestions.
* Checks plain text, Markdown, and HTML.
* Smart format on type to replace quotes with smart quotes, multiple consecutive hyphens with em or en-dash, and three consecutive periods with ellipses.
  * Make sure 'Editor: Format On Type' is enabled or this feature won't work. You can enable it at the document format level as well in your `settings.json`.

## Setup

The defaults are probably not going to work for you, but they are there to make sure using [LanguageTool's Public API](http://wiki.languagetool.org/public-http-api) is done by choice. See [this issue](https://github.com/wysiib/linter-languagetool/issues/33) on the [Atom LanguageTool Linter](https://atom.io/packages/linter-languagetool) for an explanation why.

The defaults assume the following:

1. You do not want to use the [LanguageTool's Public API](http://wiki.languagetool.org/public-http-api)
2. You're running [LanguageTool HTTP Server](http://wiki.languagetool.org/http-server) on your machine using the default port of 8081.
  * You can run a local LanguageTool server using the [unofficial Docker image](https://github.com/silvio/docker-languagetool) with `docker run --rm -p 8001:8010 silviof/docker-languagetool`
3. You do not want to have this extension manage your local [LanguageTool HTTP Server](http://wiki.languagetool.org/http-server) service.

If this doesn't work for you, here are your options.

### Option 1: Use an External Service

This could either be a [locally running instance](https://github.com/davidlday/vscode-languagetool-linter/wiki#run-a-local-languagetool-service) of LanguageTool, or the service running somewhere else.

1. Set the URL in “LanguageTool Linter > External: URL” (i.e. `http://localhost:8081`).
1. Set “LanguageTool Linter: Service Type” to `external`.

![External URL](images/external.gif)

### Option 2: Use an Extension-Managed Service

Works well if you're only using LanguageTool in Visual Studio Code.

1. [Install LanguageTool](https://github.com/davidlday/vscode-languagetool-linter/wiki#installing-languagetool) locally.
1. Set “LanguageTool Linter > Managed: Jar File” to the location of the `languagetool-server.jar` file. The install doc has hints.
1. Set “LanguageTool Linter: Service Type” to `managed`.

![Managed Service](images/managed.gif)

### Option 3: Public API Service

Make sure you read and understand [LanguageTool's Public API](http://wiki.languagetool.org/public-http-api) before doing this.

1. Set “LanguageTool Linter: Service Type” to `public`.

![Public API](images/public.gif)

## Configuration Notes

Most configuration items should be safe, but there are three you should pay particular attention to:

1. *Public Api*: This will use [LanguageTool's Public API](http://wiki.languagetool.org/public-http-api) service. If you violate their conditions, they'll block your IP address.
2. *Lint on Change*: This will make a call to the LanguageTool API on every change. If you mix this with the *Public Api*, you're more likely to violate their conditions and get your IP address blocked.
3. *LanguageTool: Preferred Variants*: If you set this, then *LanguageTool: Language* must be set to `auto`. If it isn't, the service will throw an error.

## Credits

The following projects provided excellent guidance on creating this project.

* [LanguageTool](https://languagetool.org) (of course!)
* [Atom Linter LanguageTool](https://github.com/wysiib/linter-languagetool/)
* [LT<sub>e</sub>X](https://github.com/valentjn/vscode-ltex) — a fork of [LanguageTool for Visual Studio Code](https://github.com/languagetool-language-server/vscode-languagetool)
* [VS Code Write Good Extension](https://github.com/TravisTheTechie/vscode-write-good/)
* [Fall: Not Yet Another Parser Generator](https://github.com/matklad/fall)
* [markdownlint](https://github.com/DavidAnson/vscode-markdownlint)
