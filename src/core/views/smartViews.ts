import type { Dayjs } from '../dates/dayjs';
import { type TaskIndex } from '../index';
import { Query } from '../query';
import { type Task, priorityNumber, urgency } from '../task';

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
 * The built-in sidebar views, expressed in the query language so that the sidebar, the status
 * bar and user queries share one set of semantics (FR-5.1).
 */
export const SMART_VIEW_QUERIES: Readonly<Record<SmartViewId, string>> = {
  today: 'not done\nhappens on or before today',
  upcoming: 'not done\nhappens after today\nhappens on or before in 7 days',
  overdue: 'not done\ndue before today',
  inProgress: 'status.type is IN_PROGRESS',
  blocked: 'not done\nis blocked',
  open: 'not done',
  doneRecent: 'done\n(done on or after 30 days ago) OR (cancelled on or after 30 days ago)',
};

const compiled = new Map<SmartViewId, Query>();
export function smartViewQuery(id: SmartViewId): Query {
  let q = compiled.get(id);
  if (!q) {
    q = Query.parse(SMART_VIEW_QUERIES[id]);
    if (q.errors.length) throw new Error(`smart view ${id}: ${q.errors[0]!.message}`);
    compiled.set(id, q);
  }
  return q;
}

/** Default ordering (Obsidian): urgency desc, then due (missing last), priority, file/line. */
export function compareTasksDefault(a: Task, b: Task, now?: Dayjs): number {
  if (now) {
    const ua = urgency(a, now), ub = urgency(b, now);
    if (ua !== ub) return ub - ua;
  }
  const ad = a.due?.date?.valueOf() ?? Number.POSITIVE_INFINITY;
  const bd = b.due?.date?.valueOf() ?? Number.POSITIVE_INFINITY;
  if (ad !== bd) return ad - bd;
  const ap = priorityNumber(a.priority);
  const bp = priorityNumber(b.priority);
  if (ap !== bp) return ap - bp;
  if (a.location.path !== b.location.path) return a.location.path < b.location.path ? -1 : 1;
  return a.location.line - b.location.line;
}

export function runSmartView(id: SmartViewId, ctx: SmartViewContext): Task[] {
  return smartViewQuery(id).run({ index: ctx.index, today: ctx.today, allowFunctions: false }).root.tasks;
}
