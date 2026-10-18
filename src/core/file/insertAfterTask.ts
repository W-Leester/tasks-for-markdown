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
  const width = indentWidth(lines[line]!);
  let after = line;
  for (let i = line + 1; i < lines.length; i++) {
    const text = lines[i]!;
    if (!text.trim()) break; // a blank line ends the list item
    if (indentWidth(text) <= width) break;
    after = i;
  }
  return { after, prefix: `${indent}${marker} [ ] ` };
}

/** The line to write for what the user typed: their own `- [ ] …` is kept (re-indented), anything else gets the prefix. */
export function newTaskLine(insertion: TaskInsertion, typed: string): string {
  const text = typed.replace(/\s*\n\s*/gu, ' ').trim();
  if (OPEN.test(text)) return insertion.prefix.slice(0, insertion.prefix.search(/\S|$/)) + text;
  return insertion.prefix + text;
}
