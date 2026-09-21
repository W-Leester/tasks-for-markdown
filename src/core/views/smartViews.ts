import type { Dayjs } from '../dates/dayjs';
import { type TaskIndex, isBlocked } from '../index';
import { type Task, StatusType, priorityNumber } from '../task';

export type SmartViewId = 'today' | 'upcoming' | 'overdue' | 'inProgress' | 'blocked' | 'open' | 'doneRecent';

export interface SmartViewDef {
  id: SmartViewId;
  /** l10n key; the view layer translates. */
  labelKey: string;
  icon: string;
}

export const SMART_VIEWS: readonly SmartViewDef[] = [
  { id: 'today', labelKey: 'Today', icon: 'calendar' },
  { id: 'upcoming', labelKey: 'Next 7 days', icon: 'watch' },
  { id: 'overdue', labelKey: 'Overdue', icon: 'warning' },
  { id: 'inProgress', labelKey: 'In progress', icon: 'play-circle' },
  { id: 'blocked', labelKey: 'Blocked', icon: 'circle-slash' },
  { id: 'open', labelKey: 'All open', icon: 'tasklist' },
  { id: 'doneRecent', labelKey: 'Done (30 days)', icon: 'check-all' },
];

export interface SmartViewContext {
  index: TaskIndex;
  today: Dayjs;
}

/**
 * Hard-coded filters for the sidebar's built-in views. M4 re-expresses these as query text on
 * top of the query engine; the semantics defined here are the contract.
 */
export function smartViewFilter(id: SmartViewId, ctx: SmartViewContext): (task: Task) => boolean {
  const { today } = ctx;
  const endOfToday = today.endOf('day');
  const in7 = today.add(7, 'day').endOf('day');
  switch (id) {
    case 'today':
      return (t) => !t.isCompleted && !!t.happens()?.date && !t.happens()!.date!.isAfter(endOfToday);
    case 'upcoming':
      return (t) => {
        const h = t.happens()?.date;
        return !t.isCompleted && !!h && h.isAfter(endOfToday) && !h.isAfter(in7);
      };
    case 'overdue':
      return (t) => !t.isCompleted && !!t.due?.date && t.due.date.isBefore(today.startOf('day'));
    case 'inProgress':
      return (t) => t.status.type === StatusType.IN_PROGRESS;
    case 'blocked':
      return (t) => !t.isCompleted && isBlocked(t, ctx.index);
    case 'open':
      return (t) => !t.isCompleted && t.status.type !== StatusType.NON_TASK;
    case 'doneRecent': {
      const since = today.subtract(30, 'day').startOf('day');
      return (t) => {
        if (!t.isCompleted) return false;
        const d = t.done?.date ?? t.cancelled?.date;
        return !!d && !d.isBefore(since);
      };
    }
  }
}

/** Default ordering until urgency (M3): due date first (missing last), then priority, then file/line. */
export function compareTasksDefault(a: Task, b: Task): number {
  const ad = a.due?.date?.valueOf() ?? Number.POSITIVE_INFINITY;
  const bd = b.due?.date?.valueOf() ?? Number.POSITIVE_INFINITY;
  if (ad !== bd) return ad - bd;
  const ap = priorityNumber(a.priority);
  const bp = priorityNumber(b.priority);
  if (ap !== bp) return ap - bp;
  if (a.location.path !== b.location.path) return a.location.path < b.location.path ? -1 : 1;
  return a.location.line - b.location.line;
}

/** NON_TASK checkboxes (decorative symbols) never appear in smart views (FR-1.19). */
export function runSmartView(id: SmartViewId, ctx: SmartViewContext): Task[] {
  const filter = smartViewFilter(id, ctx);
  return ctx.index.all().filter((t) => t.status.type !== StatusType.NON_TASK && filter(t)).sort(compareTasksDefault);
}
