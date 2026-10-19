/**
 * Where a new task goes when the user asks for one "below this task" in the rendered view (M27), and what its
 * line looks like. Pure: works on the document's lines.
 */

const TASK = /^([ \t]*)([-*+]|(\d+)([.)]))\s+\[[^\]]\]/;
const OPEN = /^\s*([-*+]|\d+[.)])\s+\[[^\]]\]/;

/** Visual width of leading whitespace (a tab counts as 4). */
function indentWidth(line: string): number {
  let w = 0;
  for (const ch of line) {
    if (ch === ' ') w += 1;
    else if (ch === '\t') w += 4;
    else break;
  }
  return w;
}

export interface TaskInsertion {
  /** The new line goes right after this line: the task's last note or nested line. */
  after: number;
  /** Indentation, list marker and `[ ] ` for the new line, the same depth as the task. */
  prefix: string;
}

/**
 * Below the task's whole block (its notes and nested items, which are indented deeper), at the same depth, with
 * the same bullet — or the next number in an ordered list. Undefined when `line` is not a task line.
 */
export function insertAfterTask(lines: readonly string[], line: number): TaskInsertion | undefined {
  const m = TASK.exec(lines[line] ?? '');
  if (!m) return undefined;
  const indent = m[1]!;
  const marker = m[3] !== undefined ? `${Number(m[3]) + 1}${m[4]}` : m[2]!;
  return { after: blockEnd(lines, line), prefix: `${indent}${marker} [ ] ` };
}

/** The task's last line: its notes and nested items are indented deeper; a blank line or a dedent ends it. */
function blockEnd(lines: readonly string[], line: number): number {
  const width = indentWidth(lines[line]!);
  let after = line;
  for (let i = line + 1; i < lines.length; i++) {
    const text = lines[i]!;
    if (!text.trim()) break; // a blank line ends the list item
    if (indentWidth(text) <= width) break;
    after = i;
  }
  return after;
}

const LIST_ITEM = /^([ \t]*)([-*+]|(\d+)([.)]))\s/;

/**
 * As the task's last subtask (M32): after its whole block, at the depth and with the bullet of its existing children
 * (the next number in a numbered list), or one level under the task's text when it has none.
 */
export function insertUnderTask(lines: readonly string[], line: number): TaskInsertion | undefined {
  const m = TASK.exec(lines[line] ?? '');
  if (!m) return undefined;
  const after = blockEnd(lines, line);
  let indent: string | undefined;
  let width = Number.POSITIVE_INFINITY;
  let marker = '-';
  for (let i = line + 1; i <= after; i++) {
    const item = LIST_ITEM.exec(lines[i]!);
    if (!item) continue;
    const w = indentWidth(lines[i]!);
    if (w > width) continue; // deeper than the direct children
    if (w < width) [width, indent] = [w, item[1]!];
    marker = item[3] !== undefined ? `${Number(item[3]) + 1}${item[4]}` : item[2]!;
  }
  if (indent === undefined) indent = m[1]!.includes('\t') ? `${m[1]}\t` : m[1]! + ' '.repeat(m[2]!.length + 1);
  return { after, prefix: `${indent}${marker} [ ] ` };
}

/** A written task line (`- [/] text …`) at `insertion`'s depth and bullet, keeping its status and text. */
export function placeTaskLine(insertion: TaskInsertion, written: string): string {
  const m = /^\s*(?:[-*+]|\d+[.)])\s+\[([^\]])\]\s?(.*)$/.exec(written);
  if (!m) return insertion.prefix + written.trim();
  return insertion.prefix.replace(/\[ \] $/, `[${m[1]}] `) + m[2];
}

/** The line to write for what the user typed: their own `- [ ] …` is kept (re-indented), anything else gets the prefix. */
export function newTaskLine(insertion: TaskInsertion, typed: string): string {
  const text = typed.replace(/\s*\n\s*/gu, ' ').trim();
  if (OPEN.test(text)) return insertion.prefix.slice(0, insertion.prefix.search(/\S|$/)) + text;
  return insertion.prefix + text;
}
