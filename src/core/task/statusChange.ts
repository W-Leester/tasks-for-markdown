import type { Dayjs } from '../dates/dayjs';
import { DateField } from './DateField';
import type { Status } from './Status';
import { StatusType } from './StatusType';
import type { Task } from './Task';

export interface StatusChangeOptions {
  today: Dayjs;
  /** Add ✅ when a task becomes DONE. Leaving DONE always removes it. */
  setDoneDate: boolean;
  /** Add ❌ when a task becomes CANCELLED. Leaving CANCELLED always removes it. */
  setCancelledDate: boolean;
}

export interface StatusChangeResult {
  /** The edited task (same line). */
  task: Task;
  /** Extra tasks to insert next to it — recurring copies (M3). Empty for now. */
  newTasks: Task[];
}

/**
 * Pure rule for a status transition (FR-1.18). Behaviour keys off the status *type*, so custom
 * symbols with the same type behave identically: entering DONE gains ✅, leaving it loses ✅;
 * CANCELLED does the same with ❌.
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

  return { task: task.with({ status: newStatus, done, cancelled }), newTasks: [] };
}
