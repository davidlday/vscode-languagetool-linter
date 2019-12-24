# Bold or Italics Test Case

Markdown text decorated with _, __, *, ** to produce italic or bold text will throw an error (StatusCodeError: 500).

Here is the markdown failing:

This is a **bold** style and this is *italic* style using * char

This is a __bold__ style and this is _italic_ style using _ char

You can reproduce the error with every service type.
