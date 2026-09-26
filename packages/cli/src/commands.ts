import * as fs from 'node:fs';
import * as path from 'node:path';
import { dayjs, parseNaturalDate, type Dayjs } from '../../../src/core/dates';
import { toGroupDto, toTaskDto, type GroupDto, type TaskDto } from '../../../src/core/dto';
import type { TaskIndex } from '../../../src/core/index';
import { Query } from '../../../src/core/query';
import { DateField, StatusType, Task, applyStatusChange, generateTaskId, parseTaskLine, serializeTask, type StatusRegistry } from '../../../src/core/task';
import { applyFieldValues, type FieldValues } from '../../../src/services/taskFields';
import type { CliConfig } from './config';
import { registryFrom } from './config';
import { buildIndex, indexFile, relPath } from './scan';
import { StaleLineError, deleteLine, insertLine, readLine, replaceLine } from './store';

export class CliError extends Error {
  constructor(readonly code: string, message: string, readonly details?: unknown) {
    super(message);
    this.name = 'CliError';
  }
}

export interface Workspace {
  cfg: CliConfig;
  registry: StatusRegistry;
  index: TaskIndex;
  today: Dayjs;
}

export function openWorkspace(cfg: CliConfig, today?: string): Workspace {
  const registry = registryFrom(cfg);
  const day = today ? DateField.parse(today).date : null;
  if (today && !day) throw new CliError('INVALID_ARGUMENT', `--today must be YYYY-MM-DD, got "${today}"`);
  return { cfg, registry, index: buildIndex(cfg, registry), today: day ?? dayjs().startOf('day') };
}

export interface QueryOutput {
  matched: number;
  shown: number;
  tasks: TaskDto[];
  groups: GroupDto | null;
  runtimeErrors: string[];
}

export function runQuery(ws: Workspace, text: string, source?: string): QueryOutput {
  const q = Query.parse(text, source ? { path: source } : undefined);
  if (q.errors.length) throw new CliError('INVALID_QUERY', q.errors.map((e) => `line ${e.line}: ${e.message} (${e.text})`).join('; '), { errors: q.errors });
  const r = q.run({ index: ws.index, today: ws.today, allowFunctions: ws.cfg.allowFunctions, source: source ? { path: source } : undefined });
  const groups = r.root.children.length ? toGroupDto(r.root, ws.index, ws.today) : null;
  const tasks: TaskDto[] = [];
  const walk = (g: GroupDto) => { tasks.push(...g.tasks); g.children.forEach(walk); };
  if (groups) walk(groups);
  else tasks.push(...r.root.tasks.map((t) => toTaskDto(t, ws.index, ws.today)));
  return { matched: r.matched, shown: r.shown, tasks, groups, runtimeErrors: [...r.runtimeErrors] };
}

export function explainQuery(ws: Workspace, text: string, source?: string): { explain: string; errors: { line: number; text: string; message: string }[] } {
  const q = Query.parse(text, source ? { path: source } : undefined);
  return { explain: q.explain(), errors: q.errors.map((e) => ({ line: e.line, text: e.text, message: e.message })) };
}

/** `path:line` (1-based line as typed by humans) → ref. */
export function parseRef(spec: string): { path: string; line: number } {
  const m = /^(.+):(\d+)$/.exec(spec);
  if (!m) throw new CliError('INVALID_ARGUMENT', `Expected <path>:<line>, got "${spec}"`);
  const line = Number(m[2]) - 1;
  if (line < 0) throw new CliError('INVALID_ARGUMENT', 'Line numbers start at 1');
  return { path: m[1]!.replace(/\\/g, '/'), line };
}

function absOf(ws: Workspace, rel: string): string {
  return path.resolve(ws.cfg.root, rel);
}

/** The task at a ref, re-read from disk so the check is against the current file. */
export function taskAt(ws: Workspace, ref: { path: string; line: number }, expected?: string): Task {
  const abs = absOf(ws, ref.path);
  if (!fs.existsSync(abs)) throw new CliError('NOT_FOUND', `No such file: ${ref.path}`);
  indexFile(ws.index, ws.cfg, ws.registry, abs);
  const rel = relPath(ws.cfg.root, abs);
  const task = ws.index.taskAt(rel, ref.line);
  if (!task) {
    const text = readLine(abs, ref.line);
    throw new CliError('NOT_FOUND', text === undefined ? `${ref.path} has no line ${ref.line + 1}` : `Line ${ref.line + 1} of ${ref.path} is not a task: ${text}`);
  }
  if (expected !== undefined && expected.replace(/\r$/, '') !== task.originalMarkdown) throw new StaleLineError(ref.path, ref.line, expected, task.originalMarkdown);
  return task;
}

function afterWrite(ws: Workspace, abs: string, line: number): TaskDto {
  indexFile(ws.index, ws.cfg, ws.registry, abs);
  const task = ws.index.taskAt(relPath(ws.cfg.root, abs), line);
  if (!task) throw new CliError('IO', `Wrote ${relPath(ws.cfg.root, abs)}:${line + 1} but could not read the task back`);
  return toTaskDto(task, ws.index, ws.today);
}

/** `add`: a task line (with or without the `- [ ] ` prefix) appended to a file or inserted after a line. */
export function addTask(ws: Workspace, lineText: string, file: string, line?: number): TaskDto {
  const raw = /^\s*[-*+]\s+\[.\]/.test(lineText) ? lineText : `- [ ] ${lineText.trim()}`;
  let task = parseTaskLine(raw, { statusRegistry: ws.registry, globalFilter: ws.cfg.globalFilter || undefined });
  if (!task) throw new CliError('INVALID_ARGUMENT', `Not a task line: ${raw}`);
  if (ws.cfg.setCreatedDate && !task.created) task = task.with({ created: DateField.fromDate(ws.today) });
  if (ws.cfg.requireDueDate && !task.due) throw new CliError('INVALID_ARGUMENT', 'A due date is required (tasksmd.requireDueDate)');
  const abs = absOf(ws, file);
  const at = insertLine(abs, line ?? Number.POSITIVE_INFINITY, serializeTask(task.with({ indentation: '' }), ws.cfg.taskFormat));
  return afterWrite(ws, abs, at);
}

/** `done` / `status`: status transition with done/cancelled dates and recurrence, like the extension. */
export function setStatus(ws: Workspace, ref: { path: string; line: number }, symbol: string, expected?: string): TaskDto {
  const status = ws.registry.all().find((s) => s.symbol === symbol);
  if (!status) throw new CliError('INVALID_ARGUMENT', `Unknown status symbol "${symbol}"`);
  const task = taskAt(ws, ref, expected);
  if (task.status.symbol === status.symbol) return toTaskDto(task, ws.index, ws.today);
  const result = applyStatusChange(task, status, {
    today: ws.today,
    setDoneDate: ws.cfg.setDoneDate,
    setCancelledDate: ws.cfg.setCancelledDate,
    recurrence: {
      todoStatus: ws.registry.firstOfType(StatusType.TODO) ?? ws.registry.bySymbol(' '),
      setCreatedDate: ws.cfg.setCreatedDate,
      idHandling: ws.cfg.recurrence.idHandling,
      copyDependsOn: ws.cfg.recurrence.copyDependsOn,
      removeScheduledDateOnRecurrence: ws.cfg.recurrence.removeScheduledDate,
      generateId: () => generateTaskId((id) => ws.index.byId(id).length > 0),
    },
  });
  const abs = absOf(ws, ref.path);
  const insert = result.newTasks.length ? { position: ws.cfg.recurrence.insertPosition, lines: result.newTasks.map((t) => serializeTask(t, ws.cfg.taskFormat)) } : undefined;
  const at = replaceLine(abs, ref.line, task.originalMarkdown, serializeTask(result.task, ws.cfg.taskFormat), insert, result.deleteOriginal);
  return afterWrite(ws, abs, at);
}

/** `set`: field changes (`status` last). */
export function setFields(ws: Workspace, ref: { path: string; line: number }, fields: FieldValues & { status?: string }, expected?: string): TaskDto {
  const { status, ...rest } = fields;
  let task = taskAt(ws, ref, expected);
  const abs = absOf(ws, ref.path);
  const line = ref.line;
  if (Object.keys(rest).length) {
    for (const [k, v] of Object.entries(rest)) {
      if (['due', 'scheduled', 'start', 'created', 'done', 'cancelled'].includes(k) && typeof v === 'string' && v && !DateField.parse(v).valid) throw new CliError('INVALID_ARGUMENT', `--${k} must be YYYY-MM-DD`);
    }
    const updated = applyFieldValues(task, rest);
    replaceLine(abs, line, task.originalMarkdown, serializeTask(updated, ws.cfg.taskFormat));
    task = ws.index.taskAt(relPath(ws.cfg.root, abs), line) ?? updated;
    afterWrite(ws, abs, line);
  }
  if (status !== undefined) return setStatus(ws, { path: ref.path, line }, status);
  return afterWrite(ws, abs, line);
}

export function postpone(ws: Workspace, ref: { path: string; line: number }, to: string, expected?: string): TaskDto {
  const task = taskAt(ws, ref, expected);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(to) ? DateField.parse(to).date : parseNaturalDate(to, ws.today);
  if (!date) throw new CliError('INVALID_ARGUMENT', `Cannot understand date "${to}"`);
  const field = task.due ? 'due' : task.scheduled ? 'scheduled' : 'due';
  return setFields(ws, ref, { [field]: date.format('YYYY-MM-DD') });
}

export function removeTask(ws: Workspace, ref: { path: string; line: number }, expected?: string): void {
  const task = taskAt(ws, ref, expected);
  const abs = absOf(ws, ref.path);
  deleteLine(abs, ref.line, task.originalMarkdown);
  indexFile(ws.index, ws.cfg, ws.registry, abs);
}
