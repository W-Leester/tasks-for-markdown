/**
 * A blockquote as the text the rendered view lets the user type into (M38), and back. Pure: works on the
 * quote's lines. One `>` level (and the space after it) comes off each line, so an inner quote stays `> …`.
 */

const QUOTE = /^([ \t]*)>/;
const MARK = /^[ \t]*> ?/;

export interface QuoteText {
  /** Whitespace before the first line's `>`, put back on every line. */
  indent: string;
  /** The quote's lines without their `>`, joined with `\n`. */
  text: string;
}

/** Null when the first line does not start with `>` after whitespace (e.g. `- > …`, a quote on a list marker). */
export function quoteText(lines: readonly string[]): QuoteText | null {
  const clean = lines.map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  const m = clean.length ? QUOTE.exec(clean[0]!) : null;
  if (!m) return null;
  // Lazy continuation lines (no `>`) belong to the quote's paragraph; they come back with one.
  const text = clean.map((l) => (MARK.test(l) ? l.replace(MARK, '') : l.trimStart())).join('\n');
  return { indent: m[1]!, text };
}

/** The lines to write for `text`: `> ` before each, a bare `>` for blank ones, one `>` line when it is all empty. */
export function quoteLines(indent: string, text: string): string[] {
  return text.split(/\r?\n/).map((l) => (l.trim() ? `${indent}> ${l}` : `${indent}>`));
}
