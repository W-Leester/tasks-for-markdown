import { dayjs, type Dayjs, inRange, parseDateRange, parseNaturalDate, type DateRange } from '../dates';
import { isBlocked, isBlocking } from '../index';
import { PRIORITY_NAME, Priority, StatusType, type DateFieldName, type Task, priorityFromName, priorityNumber } from '../task';
import { Query, type InstructionParser } from './Query';
import { parseTextOperator } from './textMatch';
import type { Filter, QueryContext } from './types';

const f = (instruction: string, explain: string, test: Filter['test']): Filter => ({ instruction, explain, test });

// ---- status ----------------------------------------------------------------------------------

export function isDoneType(t: StatusType): boolean {
  return t === StatusType.DONE || t === StatusType.CANCELLED || t === StatusType.NON_TASK;
}

const statusParser: InstructionParser = (line, q) => {
  const l = line.toLowerCase();
  if (l === 'done') { q.filters.push(f(line, 'status type is DONE, CANCELLED or NON_TASK', (t) => isDoneType(t.status.type))); return 'handled'; }
  if (l === 'not done') { q.filters.push(f(line, 'status type is TODO, IN_PROGRESS or ON_HOLD', (t) => !isDoneType(t.status.type))); return 'handled'; }
  let m = /^status\.type (is|is not) ([a-z_]+)$/i.exec(line);
  if (m) {
    const type = m[2]!.toUpperCase();
    if (!(type in StatusType)) throw new Error(`Unknown status type "${m[2]}". Known: ${Object.keys(StatusType).join(', ')}`);
    const neg = m[1]!.toLowerCase() === 'is not';
    q.filters.push(f(line, `status type ${neg ? 'is not' : 'is'} ${type}`, (t) => (t.status.type === type) !== neg));
    return 'handled';
  }
  m = /^status\.(name|symbol) (.+)$/i.exec(line);
  if (m) {
    const which = m[1]!.toLowerCase() as 'name' | 'symbol';
    const tm = parseTextOperator(m[2]!, `status ${which}`, { caseInsensitive: which === 'name' });
    if (!tm) throw new Error(`Unknown status.${which} operator in "${line}"`);
    q.filters.push(f(line, tm.explain, (t) => tm.test(t.status[which])));
    return 'handled';
  }
  return null;
};

// ---- dates -----------------------------------------------------------------------------------

type DateSel = DateFieldName | 'happens';

function dateOf(task: Task, field: DateSel): Dayjs | null {
  if (field === 'happens') return task.happens()?.date ?? null;
  return task[field]?.date ?? null;
}

function fmt(d: Dayjs): string {
  return `${d.format('YYYY-MM-DD')} (${d.format('dddd Do MMMM YYYY')})`;
}

/** Ranges win over single dates so that "this week" / "next month" mean the period, not a day. */
function parseDateOrRange(text: string, today: Dayjs): { date?: Dayjs; range?: DateRange } | null {
  const range = parseDateRange(text, today);
  if (range) return { range };
  const date = parseNaturalDate(text, today);
  if (date) return { date };
  return null;
}

const dateParser: InstructionParser = (line, q) => {
  const l = line.toLowerCase();
  let m = /^(has|no) (due|scheduled|start|done|created|cancelled|happens) date$/.exec(l);
  if (m) {
    const field = m[2] as DateSel;
    const has = m[1] === 'has';
    // "has" is about the field being written, so an invalid date still counts (as in Obsidian).
    const present = (t: Task) => (field === 'happens' ? t.happens() !== null : t[field] !== null);
    q.filters.push(f(line, `${has ? 'has' : 'no'} ${field} date`, (t) => present(t) === has));
    return 'handled';
  }
  m = /^(due|scheduled|start|done|created|cancelled) date is invalid$/.exec(l);
  if (m) {
    const field = m[1] as DateFieldName;
    q.filters.push(f(line, `${field} date is invalid`, (t) => !!t[field] && !t[field]!.valid));
    return 'handled';
  }
  m = /^(due|scheduled|start|done|created|cancelled|happens)(?: date)?(?: (on or before|on or after|in or before|in or after|before|after|on|in))? (.+)$/.exec(l);
  if (m) {
    const field = m[1] as DateSel;
    const op = m[2] ?? 'in'; // bare `due this week` / `due 2026-09-25` means "in"/"on"
    const text = m[3]!.trim();
    // Filters are built at parse time against "today"; the query is re-parsed whenever it runs,
    // so a fixed clock is resolved by the caller. We capture the text and resolve lazily per run.
    let cache: { today: number; parsed: ReturnType<typeof parseDateOrRange> } | null = null;
    const resolve = (ctx: QueryContext) => {
      const key = ctx.today.startOf('day').valueOf();
      if (!cache || cache.today !== key) cache = { today: key, parsed: parseDateOrRange(text, ctx.today) };
      return cache.parsed;
    };
    const probe = parseDateOrRange(text, dayjs());
    if (!probe) throw new Error(`do not understand "${text}" as a date or date range`);
    const explain = probe.date
      ? `${field} date is ${op} ${fmt(probe.date)}`.replace(' is on ', ' is on ')
      : `${field} date is ${op} ${probe.range!.start.format('YYYY-MM-DD')} to ${probe.range!.end.format('YYYY-MM-DD')} (inclusive)`;
    q.filters.push(
      f(line, explain, (t, ctx) => {
        const v = dateOf(t, field);
        if (!v) return false;
        const p = resolve(ctx);
        if (!p) return false;
        if (p.date) {
          const d = p.date;
          switch (op) {
            case 'on': case 'in': return v.isSame(d, 'day');
            case 'before': return v.isBefore(d, 'day');
            case 'after': return v.isAfter(d, 'day');
            case 'on or before': case 'in or before': return !v.isAfter(d, 'day');
            case 'on or after': case 'in or after': return !v.isBefore(d, 'day');
          }
        }
        const r = p.range!;
        switch (op) {
          case 'on': case 'in': return inRange(v, r);
          case 'before': return v.isBefore(r.start, 'day');
          case 'after': return v.isAfter(r.end, 'day');
          case 'on or before': case 'in or before': return !v.isAfter(r.end, 'day');
          case 'on or after': case 'in or after': return !v.isBefore(r.start, 'day');
        }
        return false;
      }),
    );
    return 'handled';
  }
  return null;
};

// ---- priority --------------------------------------------------------------------------------

const priorityParser: InstructionParser = (line, q) => {
  const m = /^priority (?:is )?(above|below|not|is not)? ?(highest|high|medium|none|normal|low|lowest)$/i.exec(line.toLowerCase());
  if (!m) return null;
  const target = priorityFromName(m[2] === 'normal' ? 'none' : m[2]!)!;
  const op = (m[1] ?? 'is').replace('is not', 'not');
  const n = priorityNumber(target);
  const test = (t: Task) => {
    const p = priorityNumber(t.priority);
    switch (op) {
      case 'above': return p < n;
      case 'below': return p > n;
      case 'not': return p !== n;
      default: return p === n;
    }
  };
  q.filters.push(f(line, `priority ${op === 'is' ? 'is' : op === 'not' ? 'is not' : `is ${op}`} ${PRIORITY_NAME[target]}`, test));
  return 'handled';
};

// ---- recurrence, dependencies, structure ------------------------------------------------------

const miscParser: InstructionParser = (line, q) => {
  const l = line.toLowerCase();
  if (l === 'is recurring') { q.filters.push(f(line, 'is recurring', (t) => t.isRecurring)); return 'handled'; }
  if (l === 'is not recurring') { q.filters.push(f(line, 'is not recurring', (t) => !t.isRecurring)); return 'handled'; }
  let m = /^recurrence (.+)$/i.exec(line);
  if (m) {
    const tm = parseTextOperator(m[1]!, 'recurrence');
    if (!tm) throw new Error(`Unknown recurrence operator in "${line}"`);
    q.filters.push(f(line, tm.explain, (t) => tm.test(t.recurrenceText)));
    return 'handled';
  }
  if (l === 'is blocked') { q.filters.push(f(line, 'is blocked by an unfinished task', (t, c) => isBlocked(t, c.index))); return 'handled'; }
  if (l === 'is not blocked') { q.filters.push(f(line, 'is not blocked', (t, c) => !isBlocked(t, c.index))); return 'handled'; }
  if (l === 'is blocking') { q.filters.push(f(line, 'is blocking an unfinished task', (t, c) => isBlocking(t, c.index))); return 'handled'; }
  if (l === 'is not blocking') { q.filters.push(f(line, 'is not blocking', (t, c) => !isBlocking(t, c.index))); return 'handled'; }
  if (l === 'has id') { q.filters.push(f(line, 'has id', (t) => t.id !== null)); return 'handled'; }
  if (l === 'no id') { q.filters.push(f(line, 'no id', (t) => t.id === null)); return 'handled'; }
  if (l === 'has depends on') { q.filters.push(f(line, 'has depends on', (t) => t.dependsOn.length > 0)); return 'handled'; }
  if (l === 'no depends on') { q.filters.push(f(line, 'no depends on', (t) => t.dependsOn.length === 0)); return 'handled'; }
  m = /^id (.+)$/i.exec(line);
  if (m) {
    const tm = parseTextOperator(m[1]!, 'id', { caseInsensitive: false });
    if (!tm) throw new Error(`Unknown id operator in "${line}"`);
    q.filters.push(f(line, tm.explain, (t) => tm.test(t.id)));
    return 'handled';
  }
  if (l === 'exclude sub-items') { q.filters.push(f(line, 'exclude sub-items (only top-level tasks)', (t) => t.location.depth === 0)); return 'handled'; }
  if (l === 'has tags' || l === 'has tag') { q.filters.push(f(line, 'has tags', (t) => t.tags.length > 0)); return 'handled'; }
  if (l === 'no tags' || l === 'no tag') { q.filters.push(f(line, 'no tags', (t) => t.tags.length === 0)); return 'handled'; }
  return null;
};

// ---- text: description, heading, path, folder, filename, root, tags --------------------------

export function fileFolder(path: string): string {
  const i = path.lastIndexOf('/');
  return i < 0 ? '/' : path.slice(0, i + 1);
}
export function fileRoot(path: string): string {
  const i = path.indexOf('/');
  return i < 0 ? '/' : path.slice(0, i + 1);
}
export function fileName(path: string): string {
  return path.split('/').pop() ?? path;
}

const textParser: InstructionParser = (line, q) => {
  let m = /^(description|heading|path|folder|filename|root) (.+)$/i.exec(line);
  if (m) {
    const what = m[1]!.toLowerCase();
    const tm = parseTextOperator(m[2]!, what);
    if (!tm) throw new Error(`Unknown ${what} operator in "${line}"`);
    const value = (t: Task): string | null => {
      switch (what) {
        case 'description': return t.description;
        case 'heading': return t.location.heading;
        case 'path': return t.location.path;
        case 'folder': return fileFolder(t.location.path);
        case 'filename': return fileName(t.location.path);
        default: return fileRoot(t.location.path);
      }
    };
    q.filters.push(f(line, tm.explain, (t) => tm.test(value(t))));
    return 'handled';
  }
  m = /^tags? (includes?|does not include|do not include|regex matches|regex does not match) (.+)$/i.exec(line);
  if (m) {
    const op = m[1]!.toLowerCase();
    const rest = `${op.startsWith('include') ? 'includes' : op.startsWith('do') ? 'does not include' : op} ${m[2]}`;
    const tm = parseTextOperator(rest, 'tag');
    if (!tm) throw new Error(`Unknown tags operator in "${line}"`);
    const negative = op.startsWith('do') || op.includes('does not');
    // A task matches a positive tag filter when ANY tag matches; a negative one when NO tag matches.
    q.filters.push(f(line, tm.explain.replace(/^tag /, 'tags '), (t) => (negative ? t.tags.every((tag) => tm.test(tag)) : t.tags.some((tag) => tm.test(tag)))));
    return 'handled';
  }
  return null;
};

// ---- boolean combinations ---------------------------------------------------------------------

/**
 * `(a) AND (b)`, `(a) OR NOT (b)`, `NOT (a)`, `(a) XOR (b)`, with nesting. Each operand is a
 * complete single-line filter inside parentheses. Precedence: NOT > AND > XOR > OR.
 */
export function parseBoolean(line: string): Filter | null {
  if (!/^\s*(NOT\s*)?\(/.test(line) || !/\)\s*$/.test(line)) return null;
  const tokens = tokenizeBoolean(line);
  if (!tokens) return null;
  let pos = 0;
  const peek = () => tokens[pos];
  const next = () => tokens[pos++]!;
  const parseOperand = (): Filter => {
    const t = next();
    if (!t) throw new Error('Unexpected end of boolean expression');
    if (t.type === 'op' && t.value === 'NOT') {
      const inner = parseOperand();
      return f(line, `NOT (${inner.explain})`, (task, ctx) => !inner.test(task, ctx));
    }
    if (t.type === 'group') {
      const sub = new Query();
      let handled = false;
      for (const p of Query.parsers) {
        if (p(t.value, sub) === 'handled') { handled = true; break; }
      }
      if (!handled || sub.filters.length !== 1) throw new Error(`Could not interpret "${t.value}" inside parentheses`);
      return sub.filters[0]!;
    }
    throw new Error(`Unexpected "${t.value}" in boolean expression`);
  };
  const parseLevel = (level: number): Filter => {
    const ops = [['OR'], ['XOR'], ['AND']][level];
    if (!ops) return parseOperand();
    let left = parseLevel(level + 1);
    while (peek()?.type === 'op' && ops.includes(peek()!.value)) {
      const op = next().value;
      let negate = false;
      if (peek()?.type === 'op' && peek()!.value === 'NOT') { next(); negate = true; }
      let right = parseLevel(level + 1);
      if (negate) { const r = right; right = f(line, `NOT (${r.explain})`, (task, ctx) => !r.test(task, ctx)); }
      const l = left, r = right;
      const explain = `(${l.explain}) ${op} (${r.explain})`;
      left = op === 'AND'
        ? f(line, explain, (task, ctx) => l.test(task, ctx) && r.test(task, ctx))
        : op === 'OR'
          ? f(line, explain, (task, ctx) => l.test(task, ctx) || r.test(task, ctx))
          : f(line, explain, (task, ctx) => l.test(task, ctx) !== r.test(task, ctx));
    }
    return left;
  };
  const result = parseLevel(0);
  if (pos !== tokens.length) throw new Error(`Unexpected "${tokens[pos]!.value}" in boolean expression`);
  return { ...result, instruction: line };
}

type BoolToken = { type: 'op'; value: string } | { type: 'group'; value: string };

function tokenizeBoolean(line: string): BoolToken[] | null {
  const out: BoolToken[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '(') {
      let depth = 0, j = i;
      for (; j < line.length; j++) {
        if (line[j] === '(') depth++;
        else if (line[j] === ')') { depth--; if (depth === 0) break; }
      }
      if (depth !== 0) throw new Error('Unbalanced parentheses in boolean expression');
      const inner = line.slice(i + 1, j).trim();
      // Nested boolean inside parentheses: recurse by treating it as a group whose text is boolean.
      out.push({ type: 'group', value: inner });
      i = j + 1;
      continue;
    }
    const m = /^(AND NOT|OR NOT|AND|OR|XOR|NOT)\b/.exec(line.slice(i));
    if (!m) return null;
    const word = m[1]!;
    if (word === 'AND NOT') { out.push({ type: 'op', value: 'AND' }, { type: 'op', value: 'NOT' }); }
    else if (word === 'OR NOT') { out.push({ type: 'op', value: 'OR' }, { type: 'op', value: 'NOT' }); }
    else out.push({ type: 'op', value: word });
    i += word.length;
  }
  return out;
}

const booleanParser: InstructionParser = (line, q) => {
  const filter = parseBoolean(line);
  if (!filter) return null;
  q.filters.push(filter);
  return 'handled';
};

export function registerFilters(): void {
  // Boolean first so "(done) OR (not done)" is not mistaken for a plain instruction.
  Query.parsers.push(booleanParser, statusParser, dateParser, priorityParser, miscParser, textParser);
}

export { Priority };
