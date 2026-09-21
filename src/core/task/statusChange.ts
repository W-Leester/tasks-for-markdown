import type { Dayjs } from '../dates/dayjs';
import { Recurrence } from '../recurrence/Recurrence';
import { DateField } from './DateField';
import type { Status } from './Status';
import { StatusType } from './StatusType';
import type { Task } from './Task';

export interface RecurrenceSettings {
  /** Status the new instance gets (normally the registry's `[ ]`). */
  todoStatus: Status;
  /** Give the new instance a ➕ date of today. */
  setCreatedDate: boolean;
  /** 🆔 on the new instance: keep the original (default), mint a new one, or drop it. */
  idHandling: 'keep' | 'new' | 'remove';
  /** Copy ⛔ to the new instance (default true). */
  copyDependsOn: boolean;
  removeScheduledDateOnRecurrence: boolean;
  /** Only needed for `idHandling: 'new'`. */
  generateId?: () => string;
}

export interface StatusChangeOptions {
  today: Dayjs;
  /** Add ✅ when a task becomes DONE. Leaving DONE always removes it. */
  setDoneDate: boolean;
  /** Add ❌ when a task becomes CANCELLED. Leaving CANCELLED always removes it. */
  setCancelledDate: boolean;
  /** When present, recurring tasks that become DONE produce their next instance. */
  recurrence?: RecurrenceSettings;
}

export interface StatusChangeResult {
  /** The edited task (same line). */
  task: Task;
  /** Extra tasks to insert next to it — the next instance of a recurring task. */
  newTasks: Task[];
  /** 🏁 delete: the original line is removed instead of being kept as done. */
  deleteOriginal: boolean;
}

/**
 * Pure rule for a status transition (FR-1.18) plus recurrence (FR-1.11 ~ FR-1.13). Behaviour keys
 * off the status *type*, so custom symbols with the same type behave identically: entering DONE
 * gains ✅ and, for recurring tasks, spawns the next instance; leaving it loses ✅. CANCELLED does
 * the same with ❌.
 */
export function applyStatusChange(task: Task, newStatus: Status, opts: StatusChangeOptions): StatusChangeResult {
  const wasDone = task.status.type === StatusType.DONE;
  const wasCancelled = task.status.type === StatusType.CANCELLED;
  const isDone = newStatus.type === StatusType.DONE;
  const isCancelled = newStatus.type === StatusType.CANCELLED;

  let done = task.done;
  if (isDone && !wasDone) done = opts.setDoneDate ? DateField.fromDate(opts.today) : null;
  else if (!isDone) done = null;

  let cancelled = task.cancelled;
  if (isCancelled && !wasCancelled) cancelled = opts.setCancelledDate ? DateField.fromDate(opts.today) : null;
  else if (!isCancelled) cancelled = null;

  const updated = task.with({ status: newStatus, done, cancelled });
  const newTasks: Task[] = [];
  let deleteOriginal = false;

  if (isDone && !wasDone && task.recurrenceText && opts.recurrence) {
    const next = nextInstance(task, opts.today, opts.recurrence);
    if (next) {
      newTasks.push(next);
      deleteOriginal = task.onCompletion === 'delete';
    }
  }
  return { task: updated, newTasks, deleteOriginal };
}

/** The next instance of a recurring task, or null if the rule is invalid or the task has no date. */
export function nextInstance(task: Task, today: Dayjs, rs: RecurrenceSettings): Task | null {
  const occurrence = { start: task.start?.date ?? null, scheduled: task.scheduled?.date ?? null, due: task.due?.date ?? null };
  // Obsidian rule: if the reference (highest-priority) date is invalid, no recurrence.
  const reference = task.due ?? task.scheduled ?? task.start;
  if (!reference || !reference.valid) return null;
  const recurrence = Recurrence.fromText(task.recurrenceText!, occurrence, { today, removeScheduledDateOnRecurrence: rs.removeScheduledDateOnRecurrence });
  if (!recurrence) return null;
  const next = recurrence.next(today);
  if (!next.due && !next.scheduled && !next.start) return null;

  const id = rs.idHandling === 'keep' ? task.id : rs.idHandling === 'new' && task.id ? (rs.generateId?.() ?? task.id) : null;
  return task.with({
    status: rs.todoStatus,
    start: next.start ? DateField.fromDate(next.start) : null,
    scheduled: next.scheduled ? DateField.fromDate(next.scheduled) : null,
    due: next.due ? DateField.fromDate(next.due) : null,
    done: null,
    cancelled: null,
    created: rs.setCreatedDate ? DateField.fromDate(today) : null,
    id,
    dependsOn: rs.copyDependsOn ? task.dependsOn : [],
    blockLink: null,
    originalMarkdown: '',
  });
}
