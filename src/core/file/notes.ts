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

/** One note per non-empty line, trimmed (newlines inside an entry split it). */
export function cleanNoteTexts(notes: readonly string[]): string[] {
  return notes.flatMap((n) => n.split('\n')).map((n) => n.trim()).filter((n) => n.length > 0);
}

/**
 * Add one note under the task on `taskLine` — after its existing notes (and their sub-items), else
 * right below the task — in a copy of `lines`. Same rule as the editor (TaskEditService.addNote).
 */
export function addNoteLines(lines: readonly string[], taskLine: number, text: string): { lines: string[]; line: number } {
  const note = text.replace(/\s*\n\s*/gu, ' ').trim();
  if (!note) throw new Error('Empty note');
  const block = noteBlock(lines, taskLine);
  const after = block.notes.length ? block.notes[block.notes.length - 1]!.end : taskLine;
  const out = [...lines];
  out.splice(after + 1, 0, block.childIndent + block.marker + ' ' + note);
  return { lines: out, line: after + 1 };
}

/**
 * Replace the task's notes in a copy of `lines`: existing note lines are rewritten in place, extra
 * ones added after the last note (or below the task), surplus ones removed with their sub-items.
 * Sub-tasks are never touched. Same rule as the editor (TaskEditService.setNotes).
 */
export function setNoteLines(lines: readonly string[], taskLine: number, notes: readonly string[]): string[] {
  const wanted = cleanNoteTexts(notes);
  const block = noteBlock(lines, taskLine);
  const existing = block.notes;
  const out = [...lines];
  for (let i = 0; i < Math.min(existing.length, wanted.length); i++) {
    const n = existing[i]!;
    out[n.line] = `${n.indent}${n.marker} ${wanted[i]}`;
  }
  // Removals first, bottom-up, so earlier line numbers stay valid.
  for (const n of existing.slice(wanted.length).reverse()) out.splice(n.line, n.end - n.line + 1);
  if (wanted.length > existing.length) {
    const after = existing.length ? existing[existing.length - 1]!.end : taskLine;
    out.splice(after + 1, 0, ...wanted.slice(existing.length).map((n) => `${block.childIndent}${block.marker} ${n}`));
  }
  return out;
}
