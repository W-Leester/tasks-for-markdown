import type { Dayjs } from '../dates/dayjs';
import type { Task } from '../task';

export interface WeekBucket {
  /** ISO week start (Monday), YYYY-MM-DD. */
  start: string;
  end: string;
  /** e.g. "W38" */
  label: string;
  completed: number;
  created: number;
  /** Open tasks whose due date fell in this week (still not completed). */
  overdue: number;
  /** Tasks not completed by the end of the week (created on/before it, or undated). */
  remaining: number;
  current: boolean;
}

export interface WeeklyStatsOptions {
  today: Dayjs;
  weeks?: number;
  tag?: string;
  folder?: string;
}

export interface WeeklyStats {
  weeks: WeekBucket[];
  /** Tasks skipped from completed/created counts because they lack ✅/➕ dates. */
  excluded: number;
  totalOpen: number;
  tags: string[];
  folders: string[];
}

function folderOf(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '/' : path.slice(0, i + 1);
}

/** Weekly (Mon–Sun) counts for the last N weeks (FR-10.9 / FR-10.10). Pure; runs on the index. */
export function computeWeeklyStats(all: readonly Task[], opts: WeeklyStatsOptions): WeeklyStats {
  const weeksCount = opts.weeks ?? 12;
  const tags = [...new Set(all.flatMap((t) => t.tags))].sort();
  const folders = [...new Set(all.map((t) => folderOf(t.location.path)))].sort();
  const tasks = all.filter((t) => (!opts.tag || t.tags.includes(opts.tag)) && (!opts.folder || folderOf(t.location.path) === opts.folder));

  const thisMonday = opts.today.startOf('isoWeek');
  const weeks: WeekBucket[] = [];
  for (let i = weeksCount - 1; i >= 0; i--) {
    const start = thisMonday.subtract(i, 'week');
    const end = start.endOf('isoWeek');
    let completed = 0, created = 0, overdue = 0, remaining = 0;
    for (const t of tasks) {
      const doneAt = t.done?.date ?? t.cancelled?.date ?? null;
      if (doneAt && !doneAt.isBefore(start) && !doneAt.isAfter(end)) completed++;
      if (t.created?.date && !t.created.date.isBefore(start) && !t.created.date.isAfter(end)) created++;
      if (!t.isCompleted && t.due?.date && !t.due.date.isBefore(start) && !t.due.date.isAfter(end) && t.due.date.isBefore(opts.today, 'day')) overdue++;
      const existed = !t.created?.date || !t.created.date.isAfter(end);
      const stillOpen = !t.isCompleted || (doneAt ? doneAt.isAfter(end) : false);
      if (existed && stillOpen) remaining++;
    }
    weeks.push({ start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD'), label: `W${start.isoWeek()}`, completed, created, overdue, remaining, current: i === 0 });
  }
  const excluded = tasks.filter((t) => (t.isCompleted && !t.done?.date && !t.cancelled?.date) || (!t.isCompleted && !t.created?.date)).length;
  return { weeks, excluded, totalOpen: tasks.filter((t) => !t.isCompleted).length, tags, folders };
}
