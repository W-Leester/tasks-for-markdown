/**
 * The created date on a task line made without the dialog — `Ctrl+Shift+C`, Enter in the rendered view (M33) — when
 * `tasksmd.setCreatedDate` is on. Pure text: appended at the end, where the parser reads fields in any order.
 */

const TASK = /^\s*(?:[-*+]|\d+[.)])\s+\[[^\]]\]/;
const HAS_CREATED = /➕\s*\d{4}-\d{2}-\d{2}|[[(]created::/u;

export function appendCreated(line: string, isoDate: string, format: 'emoji' | 'dataview'): string {
  if (!TASK.test(line) || HAS_CREATED.test(line)) return line;
  const field = format === 'dataview' ? `[created:: ${isoDate}]` : `➕ ${isoDate}`;
  // An empty box keeps its trailing space, so the description typed next goes before the date.
  return /\]\s*$/.test(line.trimEnd()) && line.endsWith(' ') ? `${line} ${field}` : `${line.trimEnd()} ${field}`;
}
