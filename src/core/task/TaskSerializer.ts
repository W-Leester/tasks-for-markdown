import { PRIORITY_EMOJI, PRIORITY_NAME, Priority } from './Priority';
import type { Task, DateFieldName } from './Task';
import { DATAVIEW_DATE_KEY } from './formats/dataview';
import { DEPENDS_ON_EMOJI, ID_EMOJI, ON_COMPLETION_EMOJI, RECURRENCE_EMOJI, WRITE_EMOJI } from './formats/emoji';
import type { TaskFormat } from './formats/types';

/**
 * Fixed write order (FR-1.6), identical to Obsidian Tasks' layout order so that lines written by
 * either tool are byte-for-byte the same:
 * id → dependsOn → priority → recurrence → onCompletion → created → start → scheduled → due → cancelled → done.
 */
const DATE_ORDER: readonly DateFieldName[] = ['created', 'start', 'scheduled', 'due', 'cancelled', 'done'];

function emojiFields(task: Task): string[] {
  const out: string[] = [];
  if (task.id) out.push(`${ID_EMOJI} ${task.id}`);
  if (task.dependsOn.length) out.push(`${DEPENDS_ON_EMOJI} ${task.dependsOn.join(',')}`);
  if (task.priority !== Priority.None) out.push(PRIORITY_EMOJI[task.priority]);
  if (task.recurrenceText) out.push(`${RECURRENCE_EMOJI} ${task.recurrenceText}`);
  if (task.onCompletion) out.push(`${ON_COMPLETION_EMOJI} ${task.onCompletion}`);
  for (const name of DATE_ORDER) {
    const f = task[name];
    if (f) out.push(`${WRITE_EMOJI[name]} ${f.format()}`);
  }
  return out;
}

function dataviewFields(task: Task): string[] {
  const out: string[] = [];
  if (task.id) out.push(`[id:: ${task.id}]`);
  if (task.dependsOn.length) out.push(`[dependsOn:: ${task.dependsOn.join(',')}]`);
  if (task.priority !== Priority.None) out.push(`[priority:: ${PRIORITY_NAME[task.priority]}]`);
  if (task.recurrenceText) out.push(`[repeat:: ${task.recurrenceText}]`);
  if (task.onCompletion) out.push(`[onCompletion:: ${task.onCompletion}]`);
  for (const name of DATE_ORDER) {
    const f = task[name];
    if (f) out.push(`[${DATAVIEW_DATE_KEY[name]}:: ${f.format()}]`);
  }
  return out;
}

/** Only the part after `[x] ` — description plus fields, without the block link. */
export function serializeTaskBody(task: Task, format: TaskFormat): string {
  const fields = format === 'dataview' ? dataviewFields(task) : emojiFields(task);
  return [task.description, ...fields].filter((s) => s.length > 0).join(' ');
}

/**
 * Serialise a Task back to one markdown line. Indentation, list marker and status symbol are
 * reproduced as read; fields come out in canonical order with single spaces between them.
 */
export function serializeTask(task: Task, format: TaskFormat = 'emoji'): string {
  const body = serializeTaskBody(task, format);
  let line = `${task.indentation}${task.listMarker} [${task.status.symbol}]`;
  if (body) line += ` ${body}`;
  if (task.blockLink) line += ` ^${task.blockLink}`;
  return line;
}
