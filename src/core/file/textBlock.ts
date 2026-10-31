/**
 * A block of a note (paragraph, heading, list item, table, code block) as the text the rendered view lets the user
 * type into (M39), and back. Pure. The first line's leading whitespace is the block's indent: it comes off every line
 * that has it and goes back on when saved, so a nested list item keeps its place. List markers (`- `, `1. `) stay in
 * the text — the user edits the Markdown as written.
 */

export interface BlockText {
  /** Whitespace before the first line, put back on every non-blank line. */
  indent: string;
  /** The block's lines without the indent, joined with `\n`. */
  text: string;
}

export function blockText(lines: readonly string[]): BlockText {
  const clean = lines.map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  const indent = /^[ \t]*/.exec(clean[0] ?? '')![0];
  // A line indented less than the first (lazy continuation) loses only what it has.
  const text = clean.map((l) => (l.startsWith(indent) ? l.slice(indent.length) : l.trimStart())).join('\n');
  return { indent, text };
}

/** The lines to write for `text`: the indent before each non-blank line, blank lines empty. */
export function blockLines(indent: string, text: string): string[] {
  return text.split(/\r?\n/).map((l) => (l.trim() ? `${indent}${l}` : ''));
}
