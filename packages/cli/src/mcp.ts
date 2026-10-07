import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CliError, addNote, addTask, explainQuery, info, openWorkspace, postpone, removeTask, runQuery, setFields, setNotes, setStatus, taskAt, type Workspace } from './commands';
import { loadConfig } from './config';
import { listSavedQueries } from './savedQueries';
import { StaleLineError } from './store';
import { SYNTAX_REFERENCE } from './syntax';
import { toTaskDto, type GroupDto, type TaskDto } from '../../../src/core/dto';
import type { QueryOutput } from './commands';

export interface McpOptions {
  root: string;
  /** Fixed "today" for tests. */
  today?: string;
  version?: string;
}

const ref = {
  path: z.string().describe('Workspace-relative path of the Markdown file, e.g. notes/todo.md'),
  line: z.number().int().min(0).describe('0-based line of the task (tasks_query returns it as "line")'),
  expectedText: z.string().optional().describe('The exact current line (originalMarkdown from tasks_query). The edit is refused with STALE_LINE if the line changed. Strongly recommended.'),
};
const dateDesc = 'YYYY-MM-DD, or null to remove';
const fields = {
  description: z.string().optional(),
  priority: z.enum(['0', '1', '2', '3', '4', '5']).optional().describe("'0' highest … '3' none … '5' lowest"),
  due: z.string().nullable().optional().describe(dateDesc),
  scheduled: z.string().nullable().optional().describe(dateDesc),
  start: z.string().nullable().optional().describe(dateDesc),
  created: z.string().nullable().optional().describe(dateDesc),
  done: z.string().nullable().optional().describe(`${dateDesc} (normally set by status "x")`),
  cancelled: z.string().nullable().optional().describe(`${dateDesc} (normally set by status "-")`),
  recurrence: z.string().nullable().optional().describe('e.g. "every week on monday", or null to remove'),
  onCompletion: z.enum(['keep', 'delete']).nullable().optional(),
  id: z.string().nullable().optional(),
  dependsOn: z.array(z.string()).optional().describe('ids of tasks that must be done first'),
  status: z.string().length(1).optional().describe('status symbol, applied last (x done, / in progress, - cancelled, " " todo)'),
  notes: z.array(z.string()).optional().describe('Replace ALL notes (indented bullets under the task), one entry per note; [] removes them. To add one note use tasks_add_note.'),
};

/**
 * Results for AI agents, kept small (every token counts in an agent's context): fields without a
 * value (null, empty list, false) and `key` (same as `path`) are left out.
 */
export function compactTask(t: TaskDto): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(t)) {
    if (k === 'key' || v === null || v === false || (Array.isArray(v) && v.length === 0)) continue;
    out[k] = v;
  }
  return out;
}

export interface CompactGroup { name: string; count: number; tasks?: number[]; groups?: CompactGroup[] }

/**
 * A query result with every task once: `tasks` is the flat list, `groups` (only with `group by`)
 * points into it by index, and sub-task nesting is in each task's `parentLine` / `depth` — the
 * full result repeated the same tasks in `tasks`, `groups` and `tree` (10-08).
 */
export function compactQueryOutput(out: QueryOutput): Record<string, unknown> {
  const index = new Map(out.tasks.map((t, i) => [`${t.key}:${t.line}`, i]));
  const group = (g: GroupDto): CompactGroup => ({
    name: g.name, count: g.count,
    ...(g.tasks.length ? { tasks: g.tasks.map((t) => index.get(`${t.key}:${t.line}`) ?? -1) } : {}),
    ...(g.children.length ? { groups: g.children.map(group) } : {}),
  });
  const grouped = !!out.groups && out.groups.children.length > 0;
  return {
    matched: out.matched,
    shown: out.shown,
    tasks: out.tasks.map(compactTask),
    ...(grouped ? { groups: out.groups!.children.map(group) } : {}),
    ...(out.runtimeErrors.length ? { runtimeErrors: out.runtimeErrors } : {}),
  };
}

// Compact JSON: agents parse it fine, and indentation alone was a large share of each result.
const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value) }] });
const failure = (err: unknown) => {
  const e = err instanceof CliError ? { code: err.code, message: err.message, details: err.details }
    : err instanceof StaleLineError ? { code: 'STALE_LINE', message: err.message, details: { expected: err.expected, actual: err.actual } }
    : { code: 'IO', message: err instanceof Error ? err.message : String(err) };
  return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify({ error: e }, null, 2) }] };
};

/** Build the server; `startMcpServer` wires it to stdio, tests use an in-memory transport. */
export function createMcpServer(opts: McpOptions): McpServer {
  const server = new McpServer({ name: 'tasks-for-markdown', version: opts.version ?? '0.0.0' }, {
    instructions: 'Tools for Obsidian Tasks-style task lines in the Markdown notes under the configured root. Read the tasks://syntax resource (or call tasks_syntax_reference) before composing queries or task lines. Every write re-scans the file; pass expectedText from a fresh tasks_query result to avoid overwriting a line that changed. Files open with unsaved changes in an editor may conflict: ask the user to save first.',
  });
  // A fresh workspace per call keeps results consistent with files edited between calls (cheap for note folders).
  const ws = (): Workspace => openWorkspace(loadConfig(opts.root), opts.today);
  // MCP tool annotations: hints for the client's permission prompt (it decides what to do with them).
  const READ = { readOnlyHint: true, openWorldHint: false } as const;
  const EDIT = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
  const DELETE = { readOnlyHint: false, destructiveHint: true, openWorldHint: false } as const;
  const guard = <T>(fn: () => T) => { try { return text(fn()); } catch (err) { return failure(err); } };

  server.registerResource('syntax', 'tasks://syntax', { title: 'Task line and query syntax', description: 'Field emojis, order and the query language', mimeType: 'text/markdown' }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: SYNTAX_REFERENCE }] }));

  server.registerTool('tasks_syntax_reference', { annotations: READ, title: 'Syntax reference', description: 'Returns the task line format (fields, emojis, order) and the query language cheat sheet.' }, async () => text(SYNTAX_REFERENCE));

  server.registerTool('tasks_query', {
    annotations: READ,
    title: 'Query tasks',
    description: 'Run a Tasks query (one instruction per line, e.g. "not done\\ndue before tomorrow\\nsort by urgency"). Returns matched/shown counts and the tasks (each once) with path, 0-based line, description, dates, priority, tags, originalMarkdown; fields without a value are omitted. With group by, groups lists group names and the indexes of their tasks. An empty query returns every task.',
    inputSchema: { query: z.string(), source: z.string().optional().describe('Path of the note the query "lives in" for {{query.file.*}} placeholders'), limit: z.number().int().min(0).optional() },
  }, async ({ query, source, limit }) => guard(() => compactQueryOutput(runQuery(ws(), limit !== undefined ? `${query}\nlimit ${limit}` : query, source))));

  server.registerTool('tasks_explain_query', {
    annotations: READ,
    title: 'Explain a query',
    description: 'Parse a query without running it: a human-readable explanation and any syntax errors. Use it to validate a query you composed.',
    inputSchema: { query: z.string() },
  }, async ({ query }) => guard(() => explainQuery(ws(), query)));

  server.registerTool('tasks_get', {
    annotations: READ,
    title: 'Get one task',
    description: 'The task at path:line, or an error if there is none.',
    inputSchema: { path: ref.path, line: ref.line },
  }, async ({ path, line }) => guard(() => { const w = ws(); return compactTask(toTaskDto(taskAt(w, { path, line }), w.index, w.today)); }));

  server.registerTool('tasks_list_saved_queries', {
    annotations: READ,
    title: 'List saved queries',
    description: 'Saved queries from tasksmd.savedQueries and .tasks/queries/*.md (name, query text). Run one with tasks_query.',
  }, async () => guard(() => listSavedQueries(loadConfig(opts.root))));

  server.registerTool('tasks_create', {
    annotations: EDIT,
    title: 'Create a task',
    description: 'Append a task to a file (or insert after a 0-based line). Give the description without field emojis and use the typed fields; the line is written in canonical field order. The file is created if missing.',
    inputSchema: { ...fields, description: z.string().describe('Task text, may contain #tags'), tags: z.array(z.string()).optional().describe('Tags to append to the description, with or without #'), file: z.string().describe('Workspace-relative Markdown file'), afterLine: z.number().int().min(0).optional() },
  }, async ({ file, afterLine, description, tags, notes, status, ...rest }) => guard(() => {
    const w = ws();
    if (w.cfg.requireDueDate && !rest.due) throw new CliError('INVALID_ARGUMENT', 'A due date is required (tasksmd.requireDueDate): pass "due"');
    const tagText = (tags ?? []).map((x) => (x.startsWith('#') ? x : `#${x}`)).filter((x) => !description.includes(x));
    // The due date arrives as a typed field and is applied right after; it was checked above.
    const created = addTask(w, [description.trim(), ...tagText].join(' '), file, afterLine, { dueChecked: true, notes });
    const values: Record<string, string | string[] | null> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) values[k] = v as string | string[] | null;
    if (!Object.keys(values).length && status === undefined) return created;
    return setFields(w, { path: created.path, line: created.line }, { ...values, ...(status !== undefined ? { status } : {}) });
  }));

  server.registerTool('tasks_update', {
    annotations: EDIT,
    title: 'Update task fields',
    description: 'Change fields of an existing task; null removes a date/recurrence. Status (if given) is applied last with done/cancelled dates and recurrence handling.',
    inputSchema: { ...ref, ...fields },
  }, async ({ path, line, expectedText, notes, ...changes }) => guard(() => {
    const values: Record<string, string | string[] | null> = {};
    let status: string | undefined;
    for (const [k, v] of Object.entries(changes)) { if (v === undefined) continue; if (k === 'status') status = v as string; else values[k] = v as string | string[] | null; }
    if (!Object.keys(values).length && status === undefined && notes === undefined) throw new CliError('INVALID_ARGUMENT', 'Nothing to change');
    const w = ws();
    // Notes first: they leave the task line as it is, so expectedText stays valid for the field edit.
    let result = notes === undefined ? null : setNotes(w, { path, line }, notes, expectedText);
    if (Object.keys(values).length || status !== undefined) result = setFields(w, { path, line }, { ...values, ...(status !== undefined ? { status } : {}) }, result ? undefined : expectedText);
    return result;
  }));

  server.registerTool('tasks_add_note', {
    annotations: EDIT,
    title: 'Add a note to a task',
    description: 'Add one note under the task: an indented plain bullet after its existing notes (or right below the task). Notes are never written on the task line itself.',
    inputSchema: { ...ref, text: z.string().min(1).describe('The note text (one line)') },
  }, async ({ path, line, expectedText, text: note }) => guard(() => addNote(ws(), { path, line }, note, expectedText)));

  server.registerTool('tasks_info', {
    annotations: READ,
    title: 'Version, features and settings',
    description: 'Server version, supported features (e.g. "notes") and the workspace settings that change what edits are accepted — notably requireDueDate (tasks_create needs "due" when true).',
  }, async () => guard(() => info(ws(), opts.version ?? '0.0.0')));

  server.registerTool('tasks_set_status', {
    annotations: EDIT,
    title: 'Set task status',
    description: 'Set the status symbol: "x" done (adds ✅ date and, for recurring tasks, writes the next occurrence), " " todo, "/" in progress, "-" cancelled, or a custom symbol.',
    inputSchema: { ...ref, symbol: z.string().length(1) },
  }, async ({ path, line, expectedText, symbol }) => guard(() => setStatus(ws(), { path, line }, symbol, expectedText)));

  server.registerTool('tasks_postpone', {
    annotations: EDIT,
    title: 'Postpone a task',
    description: 'Move the due date (or scheduled date when there is no due date) to a date: YYYY-MM-DD or natural language such as "tomorrow", "next monday", "in 2 weeks".',
    inputSchema: { ...ref, to: z.string() },
  }, async ({ path, line, expectedText, to }) => guard(() => postpone(ws(), { path, line }, to, expectedText)));

  server.registerTool('tasks_remove', {
    annotations: DELETE,
    title: 'Delete a task line',
    description: 'Delete the task line from the file. Prefer tasks_set_status with "-" (cancelled) unless the user asked to delete.',
    inputSchema: { ...ref },
  }, async ({ path, line, expectedText }) => guard(() => { removeTask(ws(), { path, line }, expectedText); return { ok: true }; }));

  return server;
}

export async function startMcpServer(opts: McpOptions): Promise<void> {
  const server = createMcpServer(opts);
  await server.connect(new StdioServerTransport());
  // Keep the process alive until the client closes the pipe.
  await new Promise<void>((resolve) => { process.stdin.on('close', resolve); process.stdin.on('end', resolve); });
}
