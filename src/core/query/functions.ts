import type { Dayjs } from '../dates/dayjs';
import { PRIORITY_NAME, type Task, priorityNumber, urgency } from '../task';
import { Query, type InstructionParser } from './Query';
import { fileFolder, fileName, fileRoot } from './filters';
import type { QueryContext } from './types';

/** Total time budget for one query run's custom functions; exceeding it disables them for that run. */
const TIME_BUDGET_MS = 2000;

/**
 * Read-only view of a task handed to `by function` expressions. Mirrors the most-used parts of
 * Obsidian Tasks' scripting API (task.description, task.due.moment → here `.date`, task.tags, …).
 */
export interface ScriptTask {
  description: string;
  descriptionWithoutTags: string;
  status: { symbol: string; name: string; type: string; nextSymbol: string };
  isDone: boolean;
  isCancelled: boolean;
  isCompleted: boolean;
  isRecurring: boolean;
  priorityName: string;
  priorityNumber: number;
  tags: readonly string[];
  id: string;
  dependsOn: readonly string[];
  recurrenceRule: string;
  onCompletion: string;
  urgency: number;
  due: ScriptDate;
  scheduled: ScriptDate;
  start: ScriptDate;
  created: ScriptDate;
  done: ScriptDate;
  cancelled: ScriptDate;
  happens: ScriptDate;
  heading: string | null;
  lineNumber: number;
  file: { path: string; pathWithoutExtension: string; folder: string; filename: string; filenameWithoutExtension: string; root: string; hasProperty(): boolean };
  originalMarkdown: string;
}

export interface ScriptDate {
  /** dayjs instance or null. */
  date: Dayjs | null;
  moment: Dayjs | null; // alias for Obsidian scripts
  isValid: boolean;
  formatAsDate(): string;
  formatAsDateAndTime(): string;
  format(fmt?: string): string;
  category: { name: string; groupText: string };
  fromNow: { name: string; groupText: string };
}

function scriptDate(d: Dayjs | null, invalidRaw: string | undefined, today: Dayjs): ScriptDate {
  const cat = (() => {
    if (!d) return { name: 'Undated', groupText: '%%4%% Undated' };
    if (d.isBefore(today, 'day')) return { name: 'Overdue', groupText: '%%1%% Overdue' };
    if (d.isSame(today, 'day')) return { name: 'Today', groupText: '%%2%% Today' };
    return { name: 'Future', groupText: '%%3%% Future' };
  })();
  const fromNow = (() => {
    if (!d) return { name: '', groupText: '' };
    const diff = d.startOf('day').diff(today.startOf('day'), 'day');
    const name = diff === 0 ? 'today' : diff > 0 ? `in ${diff} days` : `${-diff} days ago`;
    return { name, groupText: name };
  })();
  return {
    date: d,
    moment: d,
    isValid: d !== null,
    formatAsDate: () => (d ? d.format('YYYY-MM-DD') : (invalidRaw ?? '')),
    formatAsDateAndTime: () => (d ? d.format('YYYY-MM-DD HH:mm') : (invalidRaw ?? '')),
    format: (fmt = 'YYYY-MM-DD') => (d ? d.format(fmt) : (invalidRaw ?? '')),
    category: cat,
    fromNow,
  };
}

export function toScriptTask(t: Task, ctx: QueryContext): ScriptTask {
  const today = ctx.today;
  const path = t.location.path;
  return Object.freeze({
    description: t.description,
    descriptionWithoutTags: t.description.replace(/(?<=^|\s)#[^\s]+/g, '').replace(/\s{2,}/g, ' ').trim(),
    status: Object.freeze({ symbol: t.status.symbol, name: t.status.name, type: t.status.type, nextSymbol: t.status.nextSymbol }),
    isDone: t.isDone,
    isCancelled: t.isCancelled,
    isCompleted: t.isCompleted,
    isRecurring: t.isRecurring,
    priorityName: PRIORITY_NAME[t.priority].replace(/^\w/, (c) => c.toUpperCase()),
    priorityNumber: priorityNumber(t.priority),
    tags: Object.freeze([...t.tags]),
    id: t.id ?? '',
    dependsOn: Object.freeze([...t.dependsOn]),
    recurrenceRule: t.recurrenceText ?? '',
    onCompletion: t.onCompletion ?? '',
    urgency: urgency(t, today),
    due: scriptDate(t.due?.date ?? null, t.due?.raw, today),
    scheduled: scriptDate(t.scheduled?.date ?? null, t.scheduled?.raw, today),
    start: scriptDate(t.start?.date ?? null, t.start?.raw, today),
    created: scriptDate(t.created?.date ?? null, t.created?.raw, today),
    done: scriptDate(t.done?.date ?? null, t.done?.raw, today),
    cancelled: scriptDate(t.cancelled?.date ?? null, t.cancelled?.raw, today),
    happens: scriptDate(t.happens()?.date ?? null, undefined, today),
    heading: t.location.heading,
    lineNumber: t.location.line + 1,
    file: Object.freeze({
      path,
      pathWithoutExtension: path.replace(/\.[^.]+$/, ''),
      folder: fileFolder(path),
      filename: fileName(path),
      filenameWithoutExtension: fileName(path).replace(/\.[^.]+$/, ''),
      root: fileRoot(path),
      hasProperty: () => false,
    }),
    originalMarkdown: t.originalMarkdown,
  });
}

type Compiled = (task: ScriptTask, query: { file: ScriptTask['file'] | undefined }) => unknown;

/** Compile once at parse time. Runtime errors are surfaced per query run, not thrown at parse. */
function compile(expression: string): Compiled {
  const body = expression.trim();
  if (!body) throw new Error('Expression is empty');
  // Prefer a single expression; fall back to a statement body that uses `return` itself.
  try {
    return new Function('task', 'query', `return (${body});`) as Compiled;
  } catch {
    try {
      return new Function('task', 'query', body) as Compiled;
    } catch (err) {
      throw new Error(`Cannot compile function: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

class Budget {
  private spent = 0;
  private disabled = false;
  run<T>(fn: () => T, fallback: T): T {
    if (this.disabled) return fallback;
    const t0 = performance.now();
    try {
      return fn();
    } finally {
      this.spent += performance.now() - t0;
      if (this.spent > TIME_BUDGET_MS) {
        this.disabled = true;
        throw new Error(`Custom function exceeded the ${TIME_BUDGET_MS}ms time budget and was disabled for this run`);
      }
    }
  }
}

const gate = (ctx: QueryContext) => {
  if (!ctx.allowFunctions) throw new Error('Custom functions are disabled (enable tasksmd.query.allowFunctions in a trusted workspace)');
};

const functionParser: InstructionParser = (line, q) => {
  let m = /^filter by function (.+)$/is.exec(line);
  if (m) {
    const fn = compile(m[1]!);
    let budget: Budget | null = null;
    let budgetCtx: QueryContext | null = null;
    q.filters.push({
      instruction: line,
      explain: `filter by function ${m[1]!.trim()}`,
      test: (t, ctx) => {
        gate(ctx);
        if (budgetCtx !== ctx) { budget = new Budget(); budgetCtx = ctx; }
        return budget!.run(() => Boolean(fn(toScriptTask(t, ctx), { file: undefined })), false);
      },
    });
    return 'handled';
  }
  m = /^sort by function (.+?)( reverse)?$/is.exec(line);
  if (m) {
    const fn = compile(m[1]!);
    q.sorters.push({
      instruction: `sort by function ${m[1]!.trim()}`,
      reverse: !!m[2],
      compare: (a, b, ctx) => {
        gate(ctx);
        const va = fn(toScriptTask(a, ctx), { file: undefined });
        const vb = fn(toScriptTask(b, ctx), { file: undefined });
        return compareValues(va, vb);
      },
    });
    return 'handled';
  }
  m = /^group by function (.+?)( reverse)?$/is.exec(line);
  if (m) {
    const fn = compile(m[1]!);
    q.groupers.push({
      instruction: `group by function ${m[1]!.trim()}`,
      reverse: !!m[2],
      groups: (t, ctx) => {
        gate(ctx);
        const v = fn(toScriptTask(t, ctx), { file: undefined });
        if (Array.isArray(v)) return v.length ? v.map(String) : [''];
        return [v === null || v === undefined ? '' : String(v)];
      },
    });
    return 'handled';
  }
  return null;
};

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  if (a && typeof a === 'object' && 'valueOf' in a && b && typeof b === 'object' && 'valueOf' in b) {
    const va = (a as { valueOf(): unknown }).valueOf(), vb = (b as { valueOf(): unknown }).valueOf();
    if (typeof va === 'number' && typeof vb === 'number') return va - vb;
  }
  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true });
}

export function registerFunctions(): void {
  Query.parsers.push(functionParser);
}
