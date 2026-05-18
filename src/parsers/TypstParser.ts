// Converts a Typst source document into LanguageTool's AnnotatedText format.
// The text/markup classification mirrors typst-syntax/src/highlight.rs:
//   - SyntaxKind nodes returning None (no highlight tag) with natural language
//     content → { text }
//   - Everything else → { markup, interpretAs? }

export interface AnnotationNode {
  text?: string;
  markup?: string;
  interpretAs?: string;
}

export interface AnnotatedText {
  annotation: AnnotationNode[];
}

// ---------------------------------------------------------------------------
// Patterns derived from kind.rs + highlight.rs (ordered by priority)
// ---------------------------------------------------------------------------

// 1. COMMENTS  (Tag::Comment)
//    LineComment  → // to end of line
//    BlockComment → /* ... */
//    Shebang      → #! on the first line
const COMMENT =
  /\/\/[^\n]*|\/\*[\s\S]*?\*\/|#![^\n]*/;

// 2. EQUATIONS  (SyntaxKind::Dollar → Tag::MathDelimiter)
//    Block  : $$ ... $$
//    Inline : $ ... $
const EQUATION =
  /\$\$[\s\S]*?\$\$|\$[^$\n]*\$/;

// 3. RAW BLOCKS  (SyntaxKind::Raw → Tag::Raw)
//    Fenced : ```lang\n...\n```
//    Inline : `...`
const RAW =
  /`{3}[\s\S]*?`{3}|`[^`\n]*`/;

// 4. LABELS  (SyntaxKind::Label → Tag::Label)
//    <identifier>  — valid Typst label (letters, digits, hyphens, colons, dots)
const LABEL =
  /<[a-zA-Z][a-zA-Z0-9_:.-]*>/;

// 5. REFERENCES  (SyntaxKind::Ref → Tag::Ref)
//    @target  with optional [...] supplement
const REF =
  /@[a-zA-Z][a-zA-Z0-9_:-]*(?:\[[^\]]*\])?/;

// 6. LINKS  (SyntaxKind::Link → Tag::Link)
const LINK =
  /https?:\/\/[^\s\])\},;]*/;

// 7. CODE EXPRESSIONS  (SyntaxKind::Hash → Tag::Punctuation/Interpolated/Function)
//    Covers: FuncCall, LetBinding, SetRule, ShowRule, ModuleImport,
//            ModuleInclude, Contextual, Conditional, WhileLoop, ForLoop, etc.
//    Consumes # + identifier + optional single-level argument block.
const CODE_EXPR =
  /#(?:[a-zA-Z_][a-zA-Z0-9_-]*)(?:\([^)]*\)|\[[^\]]*\]|\{[^}]*\})?/;

// 8. INLINE FORMATTING  (SyntaxKind::Strong → Tag::Strong, Emph → Tag::Emph)
//    Content inside is exposed via interpretAs so LanguageTool still checks it.
//    Capture group 1 → bold content
//    Capture group 2 → italic content
const STRONG =
  /\*([^*\n]+)\*/;
const EMPH =
  /_([^_\n]+)_/;

// 9. STRUCTURAL MARKERS  (anchored at line start, flag m)
//    HeadingMarker : =, ==, ...
//    ListMarker    : -
//    EnumMarker    : +  or  1.
//    TermMarker    : /
//    (Tag::ListMarker in highlight.rs)
const STRUCTURAL_MARKER =
  /^(?:={1,6}|[-+]|\d+\.|\/(?=\s))/m;

// 10. ESCAPE SEQUENCES & SHORTHANDS  (Tag::Escape in highlight.rs)
//     \u{hex}   Unicode escape
//     \<char>   Any other escape
//     ~         Non-breaking space shorthand
//     ---       Em dash
//     --        En dash
//     ...       Ellipsis
//     -?        Soft hyphen
const ESCAPE =
  /\\u\{[0-9a-fA-F]+\}|\\[^u]|~|---?|\.\.\.|‑|-\?/;

// ---------------------------------------------------------------------------
// Main regex: ordered union of all patterns (higher index = lower priority)
// Capture groups:
//   1 → strong content (*...*),  2 → emph content (_..._)
// ---------------------------------------------------------------------------
const MARKUP_RE = new RegExp(
  [
    COMMENT.source,
    EQUATION.source,
    RAW.source,
    LABEL.source,
    REF.source,
    LINK.source,
    CODE_EXPR.source,
    STRONG.source,           // capture group 1
    EMPH.source,             // capture group 2
    STRUCTURAL_MARKER.source,
    ESCAPE.source,
  ].join("|"),
  "gm",
);

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

/**
 * Builds an AnnotatedText object from raw Typst source.
 *
 * Natural language text nodes (SyntaxKind::Text, Space, Parbreak, SmartQuote…)
 * are emitted as { text }, markup nodes as { markup, interpretAs }.
 */
export function buildAnnotatedTypst(source: string): AnnotatedText {
  const annotation: AnnotationNode[] = [];
  let lastIndex = 0;

  MARKUP_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = MARKUP_RE.exec(source)) !== null) {
    const start = match.index;
    const end   = start + match[0].length;

    // Natural text before this match
    if (start > lastIndex) {
      annotation.push({ text: source.slice(lastIndex, start) });
    }

    const raw          = match[0];
    const strongContent = match[1]; // bold interior
    const emphContent   = match[2]; // italic interior

    if (strongContent !== undefined) {
      // Expose bold content so LanguageTool still checks the words inside
      annotation.push({ markup: raw, interpretAs: strongContent });
    } else if (emphContent !== undefined) {
      // Same for italic
      annotation.push({ markup: raw, interpretAs: emphContent });
    } else {
      // All other markup: preserve newline count to keep line/column offsets accurate
      const newlines = "\n".repeat((raw.match(/\n/g) ?? []).length);
      annotation.push({ markup: raw, interpretAs: newlines });
    }

    lastIndex = end;
    MARKUP_RE.lastIndex = end; // keep regex cursor in sync
  }

  // Remaining natural text after the last match
  if (lastIndex < source.length) {
    annotation.push({ text: source.slice(lastIndex) });
  }

  return { annotation };
}