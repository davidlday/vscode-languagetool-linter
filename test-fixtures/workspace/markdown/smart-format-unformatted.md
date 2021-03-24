---
title: "Smart Format Test Case"
singlequotes: "'"
doublequotes: '"'
ellipses: "..."
endash: "--"
emdash: "---"
---

Make sure the smart format command only applies formatting to text and skips all
markdown, such as this front matter.

## Smart Quotes

This "sentence" contains 'quotes'.

## Apostrophe

Let's see if apostrophes are handled correctly.

## Ellipses

This sentence ends with ellipses...

## Dashes

This non--sense sentence contains en-dashes.

This sentence---if you can call it that---contains em-dashes.

## Comments

Smart formatting should ignore comment brackets.

<!-- "Like this," he said... But---at least I think---so will the linter. -->
