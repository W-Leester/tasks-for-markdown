import type { Dayjs } from '../dates/dayjs';
import { PRIORITY_NAME, type Task } from '../task';

export type GroupMode = 'none' | 'file' | 'due' | 'priority' | 'tag' | 'heading' | 'status';
export const GROUP_MODES: readonly GroupMode[] = ['none', 'file', 'due', 'priority', 'tag', 'heading', 'status'];

export interface TaskGroup {
  /** Stable id for tree state. */
  id: string;
  /** l10n key or literal text; `literal` says which. */
  label: string;
  literal: boolean;
  tasks: Task[];
}

/** Due-date buckets used by the sidebar and the kanban's date columns. Weeks are ISO (Mon–Sun). */
export function dueBucket(task: Task, today: Dayjs): string {
  const d = task.due?.date;
  if (!d) return 'No due date';
  const start = today.startOf('day');
  if (d.isBefore(start)) return 'Overdue';
  if (d.isSame(start, 'day')) return 'Today';
  if (d.isSame(start.add(1, 'day'), 'day')) return 'Tomorrow';
  const thisWeekEnd = start.endOf('isoWeek');
  if (!d.isAfter(thisWeekEnd)) return 'This week';
  if (!d.isAfter(thisWeekEnd.add(1, 'week'))) return 'Next week';
  return 'Later';
}

const DUE_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Next week', 'Later', 'No due date'];

/**
 * Group an already-sorted task list. A task may land in several groups when grouping by tag.
 * Groups are returned in a sensible order per mode; task order inside a group is preserved.
 */
export function groupTasks(tasks: readonly Task[], mode: GroupMode, today: Dayjs): TaskGroup[] {
  if (mode === 'none') return [{ id: 'all', label: '', literal: true, tasks: [...tasks] }];

  const groups = new Map<string, TaskGroup>();
  const add = (key: string, label: string, literal: boolean, task: Task) => {
    let g = groups.get(key);
    if (!g) {
      g = { id: key, label, literal, tasks: [] };
      groups.set(key, g);
    }
    g.tasks.push(task);
  };

  for (const t of tasks) {
    switch (mode) {
      case 'file':
        add(t.location.path, t.location.path, true, t);
        break;
      case 'due': {
        const b = dueBucket(t, today);
        add(b, b, false, t);
        break;
      }
      case 'priority': {
        const name = PRIORITY_NAME[t.priority];
        add(t.priority, `Priority: ${name}`, false, t);
        break;
      }
      case 'tag':
        if (t.tags.length === 0) add('(no tag)', '(no tag)', false, t);
        for (const tag of t.tags) add(tag, tag, true, t);
        break;
      case 'heading':
        add(t.location.heading ?? '(no heading)', t.location.heading ?? '(no heading)', t.location.heading !== null, t);
        break;
      case 'status':
        add(t.status.type, t.status.name, true, t);
        break;
    }
  }

  const list = [...groups.values()];
  switch (mode) {
    case 'due':
      list.sort((a, b) => DUE_ORDER.indexOf(a.id) - DUE_ORDER.indexOf(b.id));
      break;
    case 'priority':
      list.sort((a, b) => (a.id < b.id ? -1 : 1));
      break;
    case 'file':
    case 'tag':
    case 'heading':
      list.sort((a, b) => {
        const an = a.id.startsWith('('), bn = b.id.startsWith('(');
        if (an !== bn) return an ? 1 : -1;
        return a.id.localeCompare(b.id);
      });
      break;
  }
  return list;
}
