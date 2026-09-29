import * as vscode from 'vscode';
import { parseNaturalDate, systemClock, type Clock } from '../core/dates';
import type { TaskIndex } from '../core/index';
import { DateField, StatusType, Task, parseTaskLine, type StatusRegistry } from '../core/task';
import type { IndexService } from '../index/IndexService';
import type { QueryService } from '../services/QueryService';
import type { SavedQueryStore } from '../services/SavedQueryStore';
import { StaleLineError, type TaskEditService } from '../services/TaskEditService';
import { toGroupDto, toTaskDto } from '../services/dto';
import { applyFieldValues, type FieldValues } from '../services/taskFields';
import type { Settings } from '../settings/Settings';
import type { WebviewHost } from '../webviewHost/WebviewHost';
import { t } from '../l10n';
import type { ApiCaller, ApiError, ApiErrorCode, BatchResult, CreateTarget, EditOp, NewTask, TaskDto, TaskFieldChanges, TaskRef, TasksApi } from './types';

export class TasksApiError extends Error implements ApiError {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'TasksApiError';
  }
  toJSON(): ApiError {
    return { code: this.code, message: this.message, ...(this.details === undefined ? {} : { details: this.details }) };
  }
}

/** Normalise anything thrown inside the API into an ApiError-shaped object. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof TasksApiError) return err.toJSON();
  if (err instanceof StaleLineError) return { code: 'STALE_LINE', message: err.message, details: { expected: err.expected, actual: err.actual } };
  return { code: 'IO', message: err instanceof Error ? err.message : String(err) };
}

export interface TasksApiDeps {
  index: TaskIndex;
  indexService: IndexService;
  editService: TaskEditService;
  queries: QueryService;
  savedQueries: SavedQueryStore;
  settings: Settings;
  getStatusRegistry(): StatusRegistry;
  log(message: string): void;
  clock?: Clock;
  ui: {
    openEdit(target: { key: string | null; line: number | null }): WebviewHost;
    openKanban(): WebviewHost;
    openCalendar(): WebviewHost;
    openQueryResults(target: { text: string; source: string; label: string } | null): WebviewHost;
  };
}

const MAX_LINE = Number.MAX_SAFE_INTEGER;

/**
 * The public API (docs/api-plan.md §4). One instance per caller so the write-confirmation
 * policy can name who is asking. Every write goes through TaskEditService, so stale-line
 * detection, recurrence and undo behave exactly like the UI.
 */
export function createTasksApi(deps: TasksApiDeps, caller: ApiCaller = {}): TasksApi {
  const callerId = caller.extensionId ?? 'unknown';
  const today = () => (deps.clock ?? systemClock).now().startOf('day');
  const dto = (task: Task) => toTaskDto(task, deps.index, today());
  function fail(code: ApiErrorCode, message: string, details?: unknown): never {
    throw new TasksApiError(code, message, details);
  }
  const strip = (s: string) => (s.endsWith('\r') ? s.slice(0, -1) : s);

  // ---- addressing --------------------------------------------------------------------------
  const keyForPath = (path: string): string | undefined => deps.index.fileKeys().find((k) => deps.index.file(k)?.path === path);
  const uriForPath = (path: string): vscode.Uri => {
    if (typeof path !== 'string' || !path.trim()) return fail('INVALID_ARGUMENT', 'path is required');
    const key = keyForPath(path);
    if (key) return vscode.Uri.parse(key);
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (!folders.length) return fail('IO', 'No workspace folder is open');
    const parts = path.split(/[\\/]/).filter(Boolean);
    // Multi-root paths are prefixed with the folder name (IndexService.displayPath).
    const named = folders.length > 1 ? folders.find((f) => f.name === parts[0]) : undefined;
    return named ? vscode.Uri.joinPath(named.uri, ...parts.slice(1)) : vscode.Uri.joinPath(folders[0]!.uri, ...parts);
  };
  const checkRef = (ref: TaskRef): void => {
    if (!ref || typeof ref !== 'object' || typeof ref.path !== 'string' || !Number.isInteger(ref.line) || ref.line < 0) fail('INVALID_ARGUMENT', 'ref must be { path: string, line: number }');
  };
  const findTask = async (ref: TaskRef): Promise<Task | null> => {
    checkRef(ref);
    const key = keyForPath(ref.path) ?? uriForPath(ref.path).toString();
    let task = deps.index.taskAt(key, ref.line);
    if (!task) {
      // The index is debounced; read the document itself when it is open.
      const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === key);
      if (doc && ref.line < doc.lineCount) {
        task = parseTaskLine(doc.lineAt(ref.line).text, {
          statusRegistry: deps.getStatusRegistry(),
          globalFilter: deps.settings.get('globalFilter') || undefined,
          location: { key, path: deps.indexService.displayPath(doc.uri), line: ref.line, heading: null, frontmatterTags: [], depth: 0, parentLine: null },
        }) ?? undefined;
      }
    }
    if (!task) return null;
    if (ref.expectedText !== undefined && strip(ref.expectedText) !== strip(task.originalMarkdown)) {
      fail('STALE_LINE', `Line ${ref.line + 1} of ${ref.path} is not the expected text`, { expected: ref.expectedText, actual: task.originalMarkdown });
    }
    return task;
  };
  const requireTask = async (ref: TaskRef): Promise<Task> => (await findTask(ref)) ?? fail('NOT_FOUND', `No task at ${ref.path}:${ref.line + 1}`);
  const fresh = (task: Task): Task => deps.index.taskAt(task.location.key, task.location.line) ?? task;

  // ---- write policy ------------------------------------------------------------------------
  const ensureWrite = async (what: string): Promise<void> => {
    if (!vscode.workspace.isTrusted) fail('UNTRUSTED', 'Writes are disabled in untrusted workspaces');
    const policy = deps.settings.get('api.writePolicy');
    if (policy === 'deny') fail('DENIED', 'tasksmd.api.writePolicy is "deny"');
    if (policy === 'allow') return;
    const allowed = deps.settings.get('api.allowedWriters');
    if (allowed.includes(callerId)) return;
    const ext = caller.extensionId ? vscode.extensions.getExtension(caller.extensionId) : undefined;
    const label = (ext?.packageJSON as { displayName?: string } | undefined)?.displayName ?? caller.extensionId ?? t('an unknown caller');
    const allow = t('Allow'), once = t('This time'), deny = t('Deny');
    const choice = await vscode.window.showWarningMessage(t('"{0}" wants to modify tasks in this workspace through the Tasks API ({1}).', label, what), { modal: true }, allow, once, deny);
    if (choice === allow) await deps.settings.update('api.allowedWriters', [...allowed, callerId], vscode.ConfigurationTarget.Global);
    else if (choice !== once) fail('DENIED', `${label} was not allowed to modify tasks`);
  };
  const logWrite = (method: string, where: string) => deps.log(`api ${callerId} ${method} ${where}`);
  const wrap = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof TasksApiError) throw err;
      const e = toApiError(err);
      throw new TasksApiError(e.code, e.message, e.details);
    }
  };

  // ---- field helpers -----------------------------------------------------------------------
  const toFieldValues = (changes: TaskFieldChanges): FieldValues => {
    const { status, notes, ...rest } = changes as TaskFieldChanges & { tags?: unknown };
    void status;
    void notes;
    const out: FieldValues = {};
    for (const [k, v] of Object.entries(rest)) {
      if (k === 'tags') continue;
      if (v === undefined) continue;
      if (k === 'dependsOn') { if (!Array.isArray(v)) fail('INVALID_ARGUMENT', 'dependsOn must be an array of ids'); out.dependsOn = v as string[]; continue; }
      if (v !== null && typeof v !== 'string') fail('INVALID_ARGUMENT', `${k} must be a string or null`);
      if (['due', 'scheduled', 'start', 'created', 'done', 'cancelled'].includes(k) && typeof v === 'string' && !DateField.parse(v).valid) fail('INVALID_ARGUMENT', `${k} must be YYYY-MM-DD`);
      (out as Record<string, unknown>)[k] = v;
    }
    return out;
  };
  const statusFor = (symbol: string) => {
    const registry = deps.getStatusRegistry();
    if (typeof symbol !== 'string' || symbol.length !== 1) fail('INVALID_ARGUMENT', 'status must be a single character');
    return registry.all().find((s) => s.symbol === symbol) ?? fail('INVALID_ARGUMENT', `Unknown status symbol "${symbol}"`);
  };
  const notesOf = (changes: TaskFieldChanges): string[] | undefined => {
    if (changes.notes === undefined) return undefined;
    if (!Array.isArray(changes.notes) || changes.notes.some((n) => typeof n !== 'string')) fail('INVALID_ARGUMENT', 'notes must be an array of strings');
    return changes.notes;
  };
  const applyStatus = async (task: Task, symbol: string): Promise<Task> => {
    const target = statusFor(symbol);
    const current = fresh(task);
    return current.status.symbol === target.symbol ? current : deps.editService.setStatus(current, target);
  };

  // ---- edit operations ---------------------------------------------------------------------
  const create = async (input: NewTask, target?: CreateTarget): Promise<TaskDto> => {
    if (!input || typeof input.description !== 'string' || !input.description.trim()) fail('INVALID_ARGUMENT', 'description is required');
    const registry = deps.getStatusRegistry();
    let task = Task.blank('', registry.firstOfType(StatusType.TODO) ?? registry.bySymbol(' '));
    const tags = (input.tags ?? []).map((x) => (x.startsWith('#') ? x : `#${x}`)).filter((x) => !input.description.includes(x));
    const description = [input.description.trim(), ...tags].join(' ');
    task = applyFieldValues(task, { ...toFieldValues(input), description });
    if (input.status !== undefined) task = task.with({ status: statusFor(input.status) });
    if (deps.settings.get('setCreatedDate') && !task.created) task = task.with({ created: DateField.fromDate(today()) });
    if (deps.settings.get('requireDueDate') && !task.due) fail('INVALID_ARGUMENT', 'A due date is required (tasksmd.requireDueDate)');
    const path = target?.path ?? deps.settings.get('calendar.newTaskFile');
    if (!path) fail('INVALID_ARGUMENT', 'target.path is required (or set tasksmd.calendar.newTaskFile)');
    const uri = uriForPath(path);
    try {
      await vscode.workspace.fs.stat(uri);
    } catch {
      await vscode.workspace.fs.writeFile(uri, Buffer.from('', 'utf8'));
    }
    const line = target?.line ?? MAX_LINE;
    if (!Number.isInteger(line) || line < 0) fail('INVALID_ARGUMENT', 'target.line must be a non-negative integer');
    logWrite('edit.create', `${path}:${line === MAX_LINE ? 'end' : line + 1}`);
    const at = await deps.editService.insertNewTask(uri, line, task, notesOf(input));
    const written = deps.index.taskAt(uri.toString(), at);
    return dto(written ?? task.with({ location: { ...task.location, key: uri.toString(), path: deps.indexService.displayPath(uri), line: at } } as Partial<Task>));
  };
  const update = async (ref: TaskRef, changes: TaskFieldChanges): Promise<TaskDto> => {
    if (!changes || typeof changes !== 'object') fail('INVALID_ARGUMENT', 'changes must be an object');
    let task = await requireTask(ref);
    logWrite('edit.update', `${ref.path}:${ref.line + 1}`);
    const values = toFieldValues(changes);
    const notes = notesOf(changes);
    if (Object.keys(values).length) task = await deps.editService.update(task, applyFieldValues(task, values).toFields(), notes);
    else if (notes) { await deps.editService.setNotes(task, notes); task = fresh(task); }
    if (changes.status !== undefined) task = await applyStatus(task, changes.status);
    return dto(fresh(task));
  };
  const setStatus = async (ref: TaskRef, symbol: string): Promise<TaskDto> => {
    const task = await requireTask(ref);
    logWrite('edit.setStatus', `${ref.path}:${ref.line + 1} -> [${symbol}]`);
    return dto(await applyStatus(task, symbol));
  };
  const toggle = async (ref: TaskRef): Promise<TaskDto> => {
    const task = await requireTask(ref);
    logWrite('edit.toggle', `${ref.path}:${ref.line + 1}`);
    return dto(await deps.editService.toggle(task));
  };
  const postpone = async (ref: TaskRef, to: string): Promise<TaskDto> => {
    if (typeof to !== 'string' || !to.trim()) fail('INVALID_ARGUMENT', 'to is required');
    const task = await requireTask(ref);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(to) ? DateField.parse(to).date : parseNaturalDate(to, today());
    if (!date) fail('INVALID_ARGUMENT', `Cannot understand date "${to}"`);
    const field = task.due ? 'due' : task.scheduled ? 'scheduled' : 'due';
    logWrite('edit.postpone', `${ref.path}:${ref.line + 1} ${field} -> ${date.format('YYYY-MM-DD')}`);
    return dto(await deps.editService.update(task, { [field]: DateField.fromDate(date) }));
  };
  const remove = async (ref: TaskRef): Promise<void> => {
    const task = await requireTask(ref);
    logWrite('edit.remove', `${ref.path}:${ref.line + 1}`);
    await deps.editService.deleteTaskLine(task);
  };

  const api: TasksApi = {
    version: 1,
    query: {
      run: (query, options) => wrap(async () => {
        if (typeof query !== 'string') fail('INVALID_ARGUMENT', 'query must be a string');
        const text = options?.limit !== undefined ? `${query}\nlimit ${Math.max(0, Math.floor(options.limit))}` : query;
        const r = deps.queries.run(text, options?.source ? { path: options.source } : undefined);
        if (r.errors.length) fail('INVALID_QUERY', r.errors.map((e) => `Line ${e.line}: ${e.message}`).join('; '), { errors: r.errors });
        const now = today();
        const groups = r.root.children.length || r.root.tree ? toGroupDto(r.root, deps.index, now) : null;
        const flat: TaskDto[] = [];
        const walk = (g: { tasks: TaskDto[]; children: { tasks: TaskDto[]; children: unknown[] }[] }) => { flat.push(...g.tasks); for (const c of g.children as (typeof g)[]) walk(c); };
        if (groups) walk(groups);
        else flat.push(...r.root.tasks.map((x) => toTaskDto(x, deps.index, now)));
        return { matched: r.matched, shown: r.shown, tasks: flat, groups, runtimeErrors: [...r.runtimeErrors] };
      }),
      explain: (query, source) => wrap(async () => {
        if (typeof query !== 'string') fail('INVALID_ARGUMENT', 'query must be a string');
        const src = source ? { path: source } : undefined;
        const parsed = deps.queries.parse(query, src);
        return { explain: deps.queries.explain(query, src), errors: parsed.errors.map((e) => ({ line: e.line, text: e.text, message: e.message })) };
      }),
      get: (ref) => wrap(async () => { const task = await findTask(ref); return task ? dto(task) : null; }),
      list: (options) => wrap(async () => {
        const paths = options?.paths ? new Set(options.paths) : null;
        const now = today();
        return deps.index.all().filter((x) => !paths || paths.has(x.location.path)).map((x) => toTaskDto(x, deps.index, now));
      }),
      saved: () => wrap(async () => deps.savedQueries.all().map((q) => ({ id: q.id, name: q.name, query: q.query, source: q.source }))),
    },
    edit: {
      create: (input, target) => wrap(async () => { await ensureWrite('create'); return create(input, target); }),
      update: (ref, changes) => wrap(async () => { await ensureWrite('update'); return update(ref, changes); }),
      setStatus: (ref, symbol) => wrap(async () => { await ensureWrite('setStatus'); return setStatus(ref, symbol); }),
      toggle: (ref) => wrap(async () => { await ensureWrite('toggle'); return toggle(ref); }),
      postpone: (ref, to) => wrap(async () => { await ensureWrite('postpone'); return postpone(ref, to); }),
      remove: (ref) => wrap(async () => { await ensureWrite('remove'); return remove(ref); }),
      batch: (ops) => wrap(async () => {
        if (!Array.isArray(ops)) fail('INVALID_ARGUMENT', 'ops must be an array');
        const limit = deps.settings.get('api.batchLimit');
        if (ops.length > limit) fail('INVALID_ARGUMENT', `batch is limited to ${limit} operations (tasksmd.api.batchLimit)`);
        await ensureWrite(`batch of ${ops.length}`);
        const results: BatchResult['results'] = [];
        for (let i = 0; i < ops.length; i++) {
          const op = ops[i]!;
          try {
            switch (op.op) {
              case 'create': results.push(await create(op.input, op.target)); break;
              case 'update': results.push(await update(op.ref, op.changes)); break;
              case 'setStatus': results.push(await setStatus(op.ref, op.symbol)); break;
              case 'toggle': results.push(await toggle(op.ref)); break;
              case 'postpone': results.push(await postpone(op.ref, op.to)); break;
              case 'remove': await remove(op.ref); results.push(null); break;
              default: fail('INVALID_ARGUMENT', `Unknown op "${String((op as EditOp).op)}" at index ${i}`);
            }
          } catch (err) {
            const e = toApiError(err);
            throw new TasksApiError(e.code, `Batch stopped at operation ${i}: ${e.message}`, { index: i, completed: results.length, results, cause: e });
          }
        }
        return { results };
      }),
    },
    events: {
      onDidChangeTasks: (listener) => {
        const sub = deps.index.onDidChange((change) => {
          const paths = [...change.changed, ...change.removed].map((key) => deps.index.file(key)?.path ?? deps.indexService.displayPath(vscode.Uri.parse(key)));
          listener({ paths });
        });
        return { dispose: () => sub.dispose() };
      },
      onDidCompleteTask: (listener) =>
        deps.editService.onDidSetStatus((e) => {
          if (e.after.isCompleted && !e.before.isCompleted) listener({ task: dto(e.after), ...(e.created[0] ? { next: dto(e.created[0]) } : {}) });
        }),
    },
    ui: {
      openEdit: (ref) => wrap(async () => {
        if (ref) { const task = await requireTask(ref); deps.ui.openEdit({ key: task.location.key, line: task.location.line }); }
        else deps.ui.openEdit({ key: null, line: null });
      }),
      openKanban: (options) => wrap(async () => {
        const host = deps.ui.openKanban();
        if (options?.mode || options?.savedQueryId) host.extras = { ...host.extras, ...(options.mode ? { mode: options.mode } : {}), ...(options.savedQueryId ? { source: options.savedQueryId } : {}) };
      }),
      openCalendar: (options) => wrap(async () => {
        const host = deps.ui.openCalendar();
        if (options?.fullScreen) await host.onFullscreen?.(true);
      }),
      openQueryResults: (query, source) => wrap(async () => {
        if (typeof query !== 'string') fail('INVALID_ARGUMENT', 'query must be a string');
        deps.ui.openQueryResults({ text: query, source: source ?? '', label: source ?? t('API query') });
      }),
      reveal: (ref) => wrap(async () => {
        const task = await requireTask(ref);
        await vscode.commands.executeCommand('tasksmd.openTask', { key: task.location.key, line: task.location.line });
      }),
    },
  };
  return api;
}
