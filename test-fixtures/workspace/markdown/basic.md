# ATFB

Annotated Text Format Builder (ATFB) is a JavaScript module for converting various
text formats to an annotated text format suitable for processing by the LanguageTool server.

This is just a playground for a proof of concent and may move to a better home if it looks useful.

## History

[LanguageTool](https://languagetool.org) is an **excellent** open source spell and grammar checker. It's
being integrated into more and more IDEs so that developers can leverage it alongside their other
tools. However, LanguageTool's creator has explicitly stated, ["LT only works on plain text, so you'll need to either convert Markdown to plain text first, or tell LT what the markup is."](https://forum.languagetool.org/t/rules-for-markdown/374/2) Pretty clear.

Tdhis makes perfect sense. LanguageTool is meant to parse and analyze natural languages, not computer languages.

## Goals

So what are the goals here? Glad you asked:

* Create a simple, lightweight parser in JavaScript.
* Be portable across editors that leverage JavaScript in their plugins.
* Map various formatting languages to the simple Annotated Text format described in LanguageTool's API.
* Use this readme as a test document.

Oh, and because we shouldn't assume the text ends with text, here's a link to one of my favorite quotes by Socrates:
["I am the wisest man alive, for I know one thing, and that is that I know nothing."](https://www.brainyquote.com/quotes/socrates_125872)
