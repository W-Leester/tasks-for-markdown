import type { Dayjs } from '../dates/dayjs';
import { PRIORITY_NAME, StatusType, type DateFieldName, type Task, priorityNumber, urgency } from '../task';
import { Query, type InstructionParser } from './Query';
import { fileFolder, fileName, fileRoot } from './filters';
import type { Grouper, QueryContext, Sorter } from './types';

/** Obsidian's status-type ordering: in-progress work first, then todo, then the rest. */
const STATUS_TYPE_ORDER: Record<StatusType, number> = {
  [StatusType.IN_PROGRESS]: 1,
  [StatusType.TODO]: 2,
  [StatusType.ON_HOLD]: 3,
  [StatusType.DONE]: 4,
  [StatusType.CANCELLED]: 5,
  [StatusType.NON_TASK]: 6,
};

type DateSel = DateFieldName | 'happens';
const dateOf = (t: Task, field: DateSel): Dayjs | null => (field === 'happens' ? (t.happens()?.date ?? null) : (t[field]?.date ?? null));

function compareDates(a: Dayjs | null, b: Dayjs | null): number {
  if (!a && !b) return 0;
  if (!a) return 1; // missing dates last
  if (!b) return -1;
  return a.valueOf() - b.valueOf();
}
const compareText = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
const stripMarkdown = (s: string) => s.replace(/^[*_`~\s]+/, '').toLowerCase();

const SORT_FIELDS = [
  'status.type', 'status.name', 'status.symbol', 'status', 'urgency', 'due', 'scheduled', 'start', 'done', 'created', 'cancelled', 'happens',
  'priority', 'description', 'tags', 'tag', 'path', 'folder', 'filename', 'heading', 'line', 'id', 'recurring', 'random',
] as const;

function makeSorter(field: string, instruction: string): Sorter['compare'] {
  switch (field) {
    case 'status.type': case 'status': return (a, b) => STATUS_TYPE_ORDER[a.status.type] - STATUS_TYPE_ORDER[b.status.type];
    case 'status.name': return (a, b) => compareText(a.status.name, b.status.name);
    case 'status.symbol': return (a, b) => compareText(a.status.symbol, b.status.symbol);
    case 'urgency': return (a, b, ctx) => urgency(b, ctx.today) - urgency(a, ctx.today); // most urgent first
    case 'due': case 'scheduled': case 'start': case 'done': case 'created': case 'cancelled': case 'happens':
      return (a, b) => compareDates(dateOf(a, field), dateOf(b, field));
    case 'priority': return (a, b) => priorityNumber(a.priority) - priorityNumber(b.priority);
    case 'description': return (a, b) => compareText(stripMarkdown(a.description), stripMarkdown(b.description));
    case 'tags': case 'tag': return (a, b) => compareText(a.tags.join(' '), b.tags.join(' '));
    case 'path': return (a, b) => compareText(a.location.path, b.location.path) || a.location.line - b.location.line;
    case 'folder': return (a, b) => compareText(fileFolder(a.location.path), fileFolder(b.location.path));
    case 'filename': return (a, b) => compareText(fileName(a.location.path), fileName(b.location.path));
    case 'heading': return (a, b) => compareText(a.location.heading ?? '', b.location.heading ?? '');
    case 'line': return (a, b) => a.location.line - b.location.line;
    case 'id': return (a, b) => compareText(a.id ?? '', b.id ?? '');
    case 'recurring': return (a, b) => Number(b.isRecurring) - Number(a.isRecurring);
    case 'random': {
      // Stable per query text and task line so results don't reshuffle on every refresh.
      const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; };
      return (a, b) => hash(instruction + a.originalMarkdown) - hash(instruction + b.originalMarkdown);
    }
    default: throw new Error(`Unknown sort field "${field}". Known: ${SORT_FIELDS.join(', ')}`);
  }
}

const sortParser: InstructionParser = (line, q) => {
  const m = /^sort by ([a-z.]+)( reverse)?$/i.exec(line);
  if (!m) return null;
  const field = m[1]!.toLowerCase();
  q.sorters.push({ instruction: `sort by ${field}`, reverse: !!m[2], compare: makeSorter(field, line) });
  return 'handled';
};

// ---- grouping -----------------------------------------------------------------------------------

const GROUP_FIELDS = [
  'status.type', 'status.name', 'status.symbol', 'status', 'urgency', 'due', 'scheduled', 'start', 'done', 'created', 'cancelled', 'happens',
  'priority', 'tags', 'path', 'folder', 'filename', 'root', 'heading', 'backlink', 'recurring', 'recurrence', 'id', 'depends on',
] as const;

function dateGroup(d: Dayjs | null, what: string): string {
  return d ? `${d.format('YYYY-MM-DD dddd')}` : `No ${what} date`;
}

function makeGrouper(field: string): Grouper['groups'] {
  switch (field) {
    case 'status.type': case 'status': return (t) => [`${STATUS_TYPE_ORDER[t.status.type]} ${t.status.type}`];
    case 'status.name': return (t) => [t.status.name];
    case 'status.symbol': return (t) => [`[${t.status.symbol}]`];
    case 'urgency': return (t, ctx) => [urgency(t, ctx.today).toFixed(2)];
    case 'due': case 'scheduled': case 'start': case 'done': case 'created': case 'cancelled': case 'happens':
      return (t) => [dateGroup(dateOf(t, field), field)];
    case 'priority': return (t) => [`Priority ${priorityNumber(t.priority)}: ${cap(PRIORITY_NAME[t.priority])}`];
    case 'tags': return (t) => (t.tags.length ? [...t.tags] : ['(No tags)']);
    case 'path': return (t) => [t.location.path.replace(/\.md$/, '')];
    case 'folder': return (t) => [fileFolder(t.location.path)];
    case 'filename': return (t) => [fileName(t.location.path).replace(/\.md$/, '')];
    case 'root': return (t) => [fileRoot(t.location.path)];
    case 'heading': return (t) => [t.location.heading ?? '(No heading)'];
    case 'backlink': return (t) => {
      const file = fileName(t.location.path).replace(/\.md$/, '');
      return [t.location.heading && t.location.heading !== file ? `${file} > ${t.location.heading}` : file];
    };
    case 'recurring': return (t) => [t.isRecurring ? 'Recurring' : 'Not Recurring'];
    case 'recurrence': return (t) => [t.recurrenceText ?? 'None'];
    case 'id': return (t) => [t.id ?? '(No id)'];
    case 'depends on': return (t) => (t.dependsOn.length ? [...t.dependsOn] : ['(No dependencies)']);
    default: throw new Error(`Unknown group field "${field}". Known: ${GROUP_FIELDS.join(', ')}`);
  }
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const groupParser: InstructionParser = (line, q) => {
  const m = /^group by ([a-z. ]+?)( reverse)?$/i.exec(line);
  if (!m) return null;
  const field = m[1]!.toLowerCase().trim();
  q.groupers.push({ instruction: `group by ${field}`, reverse: !!m[2], groups: makeGrouper(field) });
  return 'handled';
};

/** Obsidian's default order, appended after the user's sorters: status.type, urgency, due, priority, path. */
export function defaultSorters(): Sorter[] {
  return ['status.type', 'urgency', 'due', 'priority', 'path'].map((f) => ({ instruction: `sort by ${f}`, reverse: false, compare: makeSorter(f, f) }));
}

export function registerSortGroup(): void {
  Query.parsers.push(sortParser, groupParser);
  Query.defaultSorters = defaultSorters;
}

export type { QueryContext };
