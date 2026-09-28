import * as path from 'node:path';
import { CliError, addTask, explainQuery, openWorkspace, parseRef, postpone, removeTask, runQuery, setFields, setStatus, type QueryOutput, type Workspace } from './commands';
import { loadConfig } from './config';
import { StaleLineError } from './store';
import { startMcpServer } from './mcp';
import { listSavedQueries } from './savedQueries';
import type { GroupDto, TaskDto, TreeDto } from '../../../src/core/dto';

export interface Io {
  cwd: string;
  out(line: string): void;
  err(line: string): void;
}

const HELP = `tasksmd — Tasks for Markdown from the command line

Usage:
  tasksmd query <query text> [--source <file>]       run a query (same language as \`\`\`tasks blocks)
  tasksmd explain <query text>                        show how the query is understood
  tasksmd add <task line> --file <path> [--line N]    append (or insert after line N) a task
  tasksmd done <path:line> [--expect <text>]          mark done (dates + recurrence like the editor)
  tasksmd status <path:line> <symbol> [--expect]      set the status symbol (x, /, -, space…)
  tasksmd set <path:line> [--due D] [--scheduled D] [--start D] [--priority 0-5]
              [--description T] [--recurrence R] [--status S] [--expect <text>]
  tasksmd postpone <path:line> <date|tomorrow|next monday|in 2 weeks> [--expect]
  tasksmd remove <path:line> [--expect <text>]
  tasksmd list [--file <path>]                        every task (optionally one file)
  tasksmd saved                                       saved queries (settings + .tasks/queries)
  tasksmd mcp                                         start the MCP server (stdio) for AI agents

Options:
  --root <dir>      workspace folder (default: current directory)
  --json            JSON output (default when stdout is not a terminal)
  --md              Markdown output
  --today <date>    pretend today is YYYY-MM-DD
  --expect <text>   refuse the edit when the line no longer equals this text
  -h, --help        this help

Lines are 1-based in <path:line>. Settings are read from <root>/.vscode/settings.json (tasksmd.*).`;

declare const __TASKSMD_VERSION__: string | undefined;
const CLI_VERSION = typeof __TASKSMD_VERSION__ === 'string' ? __TASKSMD_VERSION__ : 'dev';

interface Parsed { positional: string[]; flags: Record<string, string | true> }

function parseArgs(argv: string[]): Parsed {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--') { positional.push(...argv.slice(i + 1)); break; }
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq > 0) { flags[a.slice(2, eq)] = a.slice(eq + 1); continue; }
      const name = a.slice(2);
      const next = argv[i + 1];
      if (BOOLEAN_FLAGS.has(name) || next === undefined || next.startsWith('--')) flags[name] = true;
      else { flags[name] = next; i++; }
    } else if (a === '-h') flags.help = true;
    else positional.push(a);
  }
  return { positional, flags };
}
const BOOLEAN_FLAGS = new Set(['json', 'md', 'help']);

function str(flags: Parsed['flags'], name: string): string | undefined {
  const v = flags[name];
  return typeof v === 'string' ? v : undefined;
}

function fmtTask(t: TaskDto): string {
  return `${t.originalMarkdown.trim()}  (${t.path}:${t.line + 1})`;
}

function renderQuery(r: QueryOutput, json: boolean): string[] {
  if (json) return [JSON.stringify(r, null, 2)];
  const lines: string[] = [];
  const group = (g: GroupDto, depth: number) => {
    if (depth > 0) lines.push(`${'#'.repeat(Math.min(6, depth + 1))} ${g.name} (${g.count})`);
    if (g.tree) {
      const rows = (nodes: TreeDto[], level: number) => { for (const n of nodes) { lines.push(`${'  '.repeat(level)}${fmtTask(n.task)}${n.matched ? '' : '  [context]'}`); rows(n.children, level + 1); } };
      rows(g.tree, 0);
    } else for (const t of g.tasks) lines.push(fmtTask(t));
    for (const c of g.children) group(c, depth + 1);
  };
  if (r.groups) group(r.groups, 0);
  else for (const t of r.tasks) lines.push(fmtTask(t));
  lines.push('', `${r.shown} of ${r.matched} tasks`);
  for (const e of r.runtimeErrors) lines.push(`warning: ${e}`);
  return lines;
}

/** Run the CLI. Returns the process exit code. Exported so tests can drive it without spawning. */
export async function run(argv: string[], io: Io, isTTY = false): Promise<number> {
  const { positional, flags } = parseArgs(argv);
  const [command, ...rest] = positional;
  if (!command || flags.help) { io.out(HELP); return command ? 0 : 2; }
  const json = flags.json === true ? true : flags.md === true ? false : !isTTY;
  const root = path.resolve(io.cwd, str(flags, 'root') ?? '.');
  if (command === 'mcp') {
    // stdout is the protocol channel: never print anything else here.
    await startMcpServer({ root, today: str(flags, 'today'), version: CLI_VERSION });
    return 0;
  }
  const emit = (value: unknown, text: () => string[]) => { if (json) io.out(JSON.stringify(value, null, 2)); else for (const l of text()) io.out(l); };
  try {
    const ws: Workspace = openWorkspace(loadConfig(root), str(flags, 'today'));
    const expected = str(flags, 'expect');
    switch (command) {
      case 'query': {
        const text = rest.join(' ').replace(/\\n/g, '\n');
        if (!text.trim() && !json) io.err('note: empty query matches every task');
        const r = runQuery(ws, text, str(flags, 'source'));
        for (const l of renderQuery(r, json)) io.out(l);
        return 0;
      }
      case 'explain': {
        const r = explainQuery(ws, rest.join(' ').replace(/\\n/g, '\n'), str(flags, 'source'));
        emit(r, () => [r.explain, ...r.errors.map((e) => `error line ${e.line}: ${e.message}`)]);
        return r.errors.length ? 1 : 0;
      }
      case 'list': {
        const file = str(flags, 'file');
        const tasks = ws.index.all().filter((t) => !file || t.location.path === file.replace(/\\/g, '/'));
        const r = runQuery(ws, file ? `path includes ${file}` : '');
        void tasks;
        emit(r.tasks, () => r.tasks.map(fmtTask));
        return 0;
      }
      case 'saved': {
        const list = listSavedQueries(ws.cfg);
        emit(list, () => list.map((q) => `${q.name} [${q.source}]\n${q.query.split('\n').map((l) => '  ' + l).join('\n')}`));
        return 0;
      }
      case 'add': {
        const file = str(flags, 'file');
        if (!file) throw new CliError('INVALID_ARGUMENT', '--file <path> is required');
        const lineFlag = str(flags, 'line');
        const t = addTask(ws, rest.join(' '), file, lineFlag ? Number(lineFlag) - 1 : undefined);
        emit(t, () => [`added ${fmtTask(t)}`]);
        return 0;
      }
      case 'done': {
        const ref = parseRef(rest[0] ?? '');
        const t = setStatus(ws, ref, 'x', expected);
        emit(t, () => [`done ${fmtTask(t)}`]);
        return 0;
      }
      case 'status': {
        const ref = parseRef(rest[0] ?? '');
        const symbol = rest[1] === undefined ? undefined : rest[1] === 'space' ? ' ' : rest[1];
        if (symbol === undefined) throw new CliError('INVALID_ARGUMENT', 'status needs <path:line> <symbol>');
        const t = setStatus(ws, ref, symbol, expected);
        emit(t, () => [`status [${symbol}] ${fmtTask(t)}`]);
        return 0;
      }
      case 'set': {
        const ref = parseRef(rest[0] ?? '');
        const fields: Record<string, string | null> = {};
        for (const k of ['due', 'scheduled', 'start', 'created', 'done', 'cancelled', 'priority', 'description', 'recurrence', 'onCompletion', 'id', 'dependsOn', 'status']) {
          const v = str(flags, k);
          if (v !== undefined) fields[k] = v === 'none' ? null : v;
        }
        if (!Object.keys(fields).length) throw new CliError('INVALID_ARGUMENT', 'set needs at least one --field value (use "none" to clear a field)');
        const { status, ...values } = fields;
        const t = setFields(ws, ref, { ...(values as Record<string, string | null>), ...(typeof status === 'string' ? { status } : {}) }, expected);
        emit(t, () => [`set ${fmtTask(t)}`]);
        return 0;
      }
      case 'postpone': {
        const ref = parseRef(rest[0] ?? '');
        const to = rest.slice(1).join(' ');
        if (!to) throw new CliError('INVALID_ARGUMENT', 'postpone needs <path:line> <date>');
        const t = postpone(ws, ref, to, expected);
        emit(t, () => [`postponed ${fmtTask(t)}`]);
        return 0;
      }
      case 'remove': {
        const ref = parseRef(rest[0] ?? '');
        removeTask(ws, ref, expected);
        emit({ ok: true }, () => [`removed ${ref.path}:${ref.line + 1}`]);
        return 0;
      }
      default:
        throw new CliError('INVALID_ARGUMENT', `Unknown command "${command}". Try --help.`);
    }
  } catch (err) {
    const e = err instanceof CliError ? { code: err.code, message: err.message, details: err.details }
      : err instanceof StaleLineError ? { code: 'STALE_LINE', message: err.message, details: { expected: err.expected, actual: err.actual } }
      : { code: 'IO', message: err instanceof Error ? err.message : String(err) };
    if (json) io.out(JSON.stringify({ error: e }, null, 2));
    else io.err(`error (${e.code}): ${e.message}`);
    return e.code === 'INVALID_ARGUMENT' ? 2 : 1;
  }
}

/* c8 ignore start */
if (require.main === module) {
  // `tasksmd … | head` closes the pipe early; that is not an error worth a stack trace.
  process.stdout.on('error', (e: NodeJS.ErrnoException) => { if (e.code === 'EPIPE') process.exit(0); });
  void run(process.argv.slice(2), { cwd: process.cwd(), out: (l) => process.stdout.write(l + '\n'), err: (l) => process.stderr.write(l + '\n') }, process.stdout.isTTY === true).then((code) => { process.exitCode = code; });
}
/* c8 ignore end */
