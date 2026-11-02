/**
 * Which checkbox lists are task lists (11-02): the rendered and live views show a list in columns, with a header, only
 * when one of its tasks carries a Tasks field — a date, a priority, a recurrence, an id, a dependency or "on
 * completion". A plain checklist (`- [ ] Answer:`) stays a plain checklist.
 */
import { Priority } from './Priority';
import type { Task } from './Task';

/** The task has a Tasks field beyond its checkbox and text (tags do not count). */
export function hasTaskFields(task: Task): boolean {
  return !!(task.created || task.start || task.scheduled || task.due || task.done || task.cancelled) ||
    task.priority !== Priority.None || !!task.recurrenceText || !!task.onCompletion || !!task.id || task.dependsOn.length > 0;
}

const LIST_LINE = /^\s*(?:[-*+]|\d+[.)])\s/;
const FENCE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * The top-level list each line belongs to (0-based lines; -1 outside a list or inside a code block). A list starts at
 * an unindented item and goes on through items, indented lines and blank lines that lead to more of it; unindented
 * text that is not an item ends it.
 */
export function listGroups(lines: readonly string[]): number[] {
  const out: number[] = new Array<number>(lines.length).fill(-1);
  let group = -1, next = 0, fence: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const text = lines[i]!;
    const f = FENCE.exec(text);
    if (fence !== null) {
      if (f && f[1]![0] === fence[0] && f[1]!.length >= fence.length && !/\S/.test(text.slice(f[0].length))) fence = null;
      if (group >= 0 && /^\s/.test(text)) out[i] = group;
      continue;
    }
    if (f && !/^\s/.test(text)) { fence = f[1]!; group = -1; continue; }
    if (!text.trim()) {
      // A blank line stays in the list only when more of it follows.
      let k = i + 1;
      while (k < lines.length && !lines[k]!.trim()) k++;
      if (group >= 0 && k < lines.length && (/^\s/.test(lines[k]!) || LIST_LINE.test(lines[k]!))) out[i] = group;
      else group = -1;
      continue;
    }
    if (/^\s/.test(text)) { if (group >= 0) out[i] = group; continue; }
    if (LIST_LINE.test(text)) { if (group < 0) group = next++; out[i] = group; continue; }
    group = -1;
  }
  return out;
}
