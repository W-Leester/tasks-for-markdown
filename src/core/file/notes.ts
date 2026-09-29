import { isTaskLine } from '../task';
import { LIST_ITEM_RE, indentWidth } from './FileParser';

/** A direct child list item of a task. */
export interface ChildItem {
  line: number;
  /** Leading whitespace. */
  indent: string;
  /** List marker (`-`, `*`, `+`, `1.`…). */
  marker: string;
  text: string;
  isTask: boolean;
  /** Last line of the item's own subtree (itself, deeper items and continuation lines). */
  end: number;
}

export interface NoteBlock {
  /** Direct children without a checkbox — the task's notes. */
  notes: ChildItem[];
  children: ChildItem[];
  /** Indentation for a new direct child. */
  childIndent: string;
  /** Marker for a new note: the existing notes' bullet, else `-`. */
  marker: string;
}

/**
 * The list items directly under the task on `taskLine`, read from the current document text
 * (the index may lag behind). Stops at the first non-blank line indented no deeper than the task.
 */
export function noteBlock(lines: readonly string[], taskLine: number): NoteBlock {
  const strip = (l: string) => (l.endsWith('\r') ? l.slice(0, -1) : l);
  const task = LIST_ITEM_RE.exec(strip(lines[taskLine] ?? ''));
  const taskWs = task?.[1] ?? '';
  const taskIndent = indentWidth(taskWs);
  const children: ChildItem[] = [];
  const stack: number[] = [];
  for (let j = taskLine + 1; j < lines.length; j++) {
    const line = strip(lines[j]!);
    if (line.trim().length === 0) continue;
    const ws = /^[ \t]*/u.exec(line)![0];
    const width = indentWidth(ws);
    if (width <= taskIndent) break;
    const m = LIST_ITEM_RE.exec(line);
    if (m) {
      while (stack.length && stack[stack.length - 1]! >= width) stack.pop();
      if (!stack.length) {
        children.push({ line: j, indent: ws, marker: m[2]!, text: line.slice(m[0].length).trim(), isTask: isTaskLine(line), end: j });
      }
      stack.push(width);
    }
    const last = children[children.length - 1];
    if (last) last.end = j;
  }
  const notes = children.filter((c) => !c.isTask);
  const bullet = notes.find((n) => /^[-*+]$/u.test(n.marker))?.marker ?? '-';
  const childIndent = children[0]?.indent ?? taskWs + ' '.repeat(task ? task[0].length - taskWs.length : 2);
  return { notes, children, childIndent, marker: bullet };
}
