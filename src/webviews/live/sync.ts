/**
 * Keeping the live view's editor (M40) and the note in step. Pure; the host and the webview both use it.
 */

/** One replacement in a text: offsets `from`..`to` of the old text become `insert`. */
export interface TextChange {
  from: number;
  to: number;
  insert: string;
}

/** The query column header's words, and the column choice shared with the rendered view. */
export interface ColumnLabels { desc: string; due: string; created: string; done: string; more: string; hide: string; show: string; width: string; widthHint: string }
export interface ColumnState { hidden: string[]; widths: Record<string, number>; labels: ColumnLabels }

/** Messages to the live view's webview. */
export type ToLive =
  /** `eol`: the note's line ends, so the editor's offsets match the document's (CRLF counts two). */
  | { type: 'live/init'; text: string; eol: '\n' | '\r\n'; fontSize: number; lineHeight: number; maxWidth: number; view: { sort: string; scope: string }; today: string }
  /** The note changed elsewhere (source editor, an AI, a command): its whole text. */
  | { type: 'live/text'; text: string }
  /** Results of the note's ```tasks blocks, by the block's source (the lines between the fences). */
  | { type: 'live/queries'; blocks: { source: string; html: string }[]; columns: ColumnState };

/** Messages from the live view's webview. */
export type FromLive =
  | { type: 'live/ready' }
  /** Changes in the editor, in the coordinates of the text before them (`length` is that text's length). */
  | { type: 'live/edit'; changes: TextChange[]; length: number }
  /** A task's checkbox was clicked, or Option/Alt+C on its line (0-based line). */
  | { type: 'live/toggle'; line: number }
  /** A task in a query result was ticked: its file (as shown) and line. */
  | { type: 'live/toggleTask'; path: string; line: number }
  /** ✎ / ⏩ on a task: in the note (`path` null, 0-based line) or in a query result (its file as shown). */
  | { type: 'live/rowAct'; act: 'edit' | 'postpone'; path: string | null; line: number }
  /** 💬 on a query result row: a note under that task. */
  | { type: 'live/addNote'; path: string; line: number; text: string }
  /** Option/Alt+Shift+C: edit the task on this line, or create one there. */
  | { type: 'live/editTask'; line: number }
  | { type: 'live/link'; href: string }
  /** The query column header changed: hidden columns or widths (kept for the rendered view too). */
  | { type: 'live/columns'; hidden?: string[]; widths?: Record<string, number> }
  /** Sort and show filter picked in the toolbar (kept per note, shared with the rendered view). */
  | { type: 'live/view'; sort: string; scope: string }
  /** The toolbar's mode buttons: this note in the rendered view or the text editor. */
  | { type: 'live/mode'; mode: 'rendered' | 'source' };

const isHigh = (c: number) => c >= 0xd800 && c <= 0xdbff;
const isLow = (c: number) => c >= 0xdc00 && c <= 0xdfff;

/**
 * The smallest single replacement turning `a` into `b` (common start and end left out), or null when equal. Never splits
 * a surrogate pair (an emoji stays whole).
 */
export function minimalChange(a: string, b: string): TextChange | null {
  if (a === b) return null;
  const max = Math.min(a.length, b.length);
  let start = 0;
  while (start < max && a.charCodeAt(start) === b.charCodeAt(start)) start++;
  if (start > 0 && isHigh(a.charCodeAt(start - 1))) start--;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a.charCodeAt(endA - 1) === b.charCodeAt(endB - 1)) { endA--; endB--; }
  if (endA < a.length && isLow(a.charCodeAt(endA))) { endA++; endB++; }
  return { from: start, to: endA, insert: b.slice(start, endB) };
}

/** `changes` (old-text coordinates, any order, not overlapping) applied to `text`. */
export function applyChanges(text: string, changes: readonly TextChange[]): string {
  let out = text;
  for (const c of [...changes].sort((x, y) => y.from - x.from)) out = out.slice(0, c.from) + c.insert + out.slice(c.to);
  return out;
}
