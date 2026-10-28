/**
 * Turn a line into a checklist item or back (M26, `Cmd+Shift+C` on macOS, `Ctrl+Shift+C` elsewhere): the quick way to get `- [ ]` without the
 * create/edit dialog. Pure text — the editor command applies it to the selected lines.
 */

/** `- [ ] text`, `* [x] text`, `1. [/] text` — any single-character status. */
const TASK = /^(\s*)([-*+]|\d+[.)])\s+\[[^\]]\]\s?(.*)$/;
/** `- text`, `* text`, `1. text` */
const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

export type CheckboxMode = 'add' | 'remove';

/** What toggling this line means: a task line loses its checkbox, anything else gains one. */
export function checkboxMode(line: string): CheckboxMode {
  return TASK.test(line) ? 'remove' : 'add';
}

/**
 * Apply `mode` to one line, keeping the indentation and the list marker. With `add`, a line that already is a
 * task is left alone (a mixed selection follows its first line). Removing the checkbox drops the status too.
 */
export function toggleCheckboxLine(line: string, mode: CheckboxMode = checkboxMode(line)): string {
  const task = TASK.exec(line);
  if (mode === 'remove') return task ? `${task[1]}${task[2]} ${task[3]}` : line;
  if (task) return line;
  const list = LIST.exec(line);
  if (list) return `${list[1]}${list[2]} [ ] ${list[3]}`;
  const plain = /^(\s*)(.*)$/.exec(line)!;
  return `${plain[1]}- [ ] ${plain[2]}`;
}
