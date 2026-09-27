import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { CliError, addTask, explainQuery, openWorkspace, postpone, removeTask, runQuery, setFields, setStatus, taskAt, type Workspace } from './commands';
import { loadConfig } from './config';
import { listSavedQueries } from './savedQueries';
import { StaleLineError } from './store';
import { SYNTAX_REFERENCE } from './syntax';
import { toTaskDto } from '../../../src/core/dto';

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
  recurrence: z.string().nullable().optional().describe('e.g. "every week on monday", or null to remove'),
  onCompletion: z.enum(['keep', 'delete']).nullable().optional(),
  id: z.string().nullable().optional(),
  dependsOn: z.array(z.string()).optional().describe('ids of tasks that must be done first'),
  status: z.string().length(1).optional().describe('status symbol, applied last (x done, / in progress, - cancelled, " " todo)'),
};

const text = (value: unknown) => ({ content: [{ type: 'text' as const, text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) }] });
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
  const guard = <T>(fn: () => T) => { try { return text(fn()); } catch (err) { return failure(err); } };

  server.registerResource('syntax', 'tasks://syntax', { title: 'Task line and query syntax', description: 'Field emojis, order and the query language', mimeType: 'text/markdown' }, async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: SYNTAX_REFERENCE }] }));

  server.registerTool('tasks_syntax_reference', { title: 'Syntax reference', description: 'Returns the task line format (fields, emojis, order) and the query language cheat sheet.' }, async () => text(SYNTAX_REFERENCE));

  server.registerTool('tasks_query', {
    title: 'Query tasks',
    description: 'Run a Tasks query (one instruction per line, e.g. "not done\\ndue before tomorrow\\nsort by urgency"). Returns matched/shown counts and the tasks with path, 0-based line, description, dates, priority, tags, originalMarkdown. An empty query returns every task.',
    inputSchema: { query: z.string(), source: z.string().optional().describe('Path of the note the query "lives in" for {{query.file.*}} placeholders'), limit: z.number().int().min(0).optional() },
  }, async ({ query, source, limit }) => guard(() => runQuery(ws(), limit !== undefined ? `${query}\nlimit ${limit}` : query, source)));

  server.registerTool('tasks_explain_query', {
    title: 'Explain a query',
    description: 'Parse a query without running it: a human-readable explanation and any syntax errors. Use it to validate a query you composed.',
    inputSchema: { query: z.string() },
  }, async ({ query }) => guard(() => explainQuery(ws(), query)));

  server.registerTool('tasks_get', {
    title: 'Get one task',
    description: 'The task at path:line, or an error if there is none.',
    inputSchema: { path: ref.path, line: ref.line },
  }, async ({ path, line }) => guard(() => { const w = ws(); return toTaskDto(taskAt(w, { path, line }), w.index, w.today); }));

  server.registerTool('tasks_list_saved_queries', {
    title: 'List saved queries',
    description: 'Saved queries from tasksmd.savedQueries and .tasks/queries/*.md (name, query text). Run one with tasks_query.',
  }, async () => guard(() => listSavedQueries(loadConfig(opts.root))));

  server.registerTool('tasks_create', {
    title: 'Create a task',
    description: 'Append a task to a file (or insert after a 0-based line). Give the description without field emojis and use the typed fields; the line is written in canonical field order. The file is created if missing.',
    inputSchema: { ...fields, description: z.string().describe('Task text, may contain #tags'), file: z.string().describe('Workspace-relative Markdown file'), afterLine: z.number().int().min(0).optional() },
  }, async ({ file, afterLine, description, priority, due, scheduled, start, recurrence, onCompletion, id, dependsOn, status }) => guard(() => {
    const w = ws();
    if (w.cfg.requireDueDate && !due) throw new CliError('INVALID_ARGUMENT', 'A due date is required (tasksmd.requireDueDate): pass "due"');
    // The due date arrives as a typed field and is applied right after; it was checked above.
    const created = addTask(w, description, file, afterLine, { dueChecked: true });
    const values: Record<string, string | string[] | null> = {};
    for (const [k, v] of Object.entries({ priority, due, scheduled, start, recurrence, onCompletion, id, dependsOn })) if (v !== undefined) values[k] = v as string | string[] | null;
    if (!Object.keys(values).length && status === undefined) return created;
    return setFields(w, { path: created.path, line: created.line }, { ...values, ...(status !== undefined ? { status } : {}) });
  }));

  server.registerTool('tasks_update', {
    title: 'Update task fields',
    description: 'Change fields of an existing task; null removes a date/recurrence. Status (if given) is applied last with done/cancelled dates and recurrence handling.',
    inputSchema: { ...ref, ...fields },
  }, async ({ path, line, expectedText, ...changes }) => guard(() => {
    const values: Record<string, string | string[] | null> = {};
    let status: string | undefined;
    for (const [k, v] of Object.entries(changes)) { if (v === undefined) continue; if (k === 'status') status = v as string; else values[k] = v as string | string[] | null; }
    if (!Object.keys(values).length && status === undefined) throw new CliError('INVALID_ARGUMENT', 'Nothing to change');
    return setFields(ws(), { path, line }, { ...values, ...(status !== undefined ? { status } : {}) }, expectedText);
  }));

  server.registerTool('tasks_set_status', {
    title: 'Set task status',
    description: 'Set the status symbol: "x" done (adds ✅ date and, for recurring tasks, writes the next occurrence), " " todo, "/" in progress, "-" cancelled, or a custom symbol.',
    inputSchema: { ...ref, symbol: z.string().length(1) },
  }, async ({ path, line, expectedText, symbol }) => guard(() => setStatus(ws(), { path, line }, symbol, expectedText)));

  server.registerTool('tasks_postpone', {
    title: 'Postpone a task',
    description: 'Move the due date (or scheduled date when there is no due date) to a date: YYYY-MM-DD or natural language such as "tomorrow", "next monday", "in 2 weeks".',
    inputSchema: { ...ref, to: z.string() },
  }, async ({ path, line, expectedText, to }) => guard(() => postpone(ws(), { path, line }, to, expectedText)));

  server.registerTool('tasks_remove', {
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
