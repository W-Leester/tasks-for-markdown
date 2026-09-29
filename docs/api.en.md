# Tasks for Markdown public API (v1)

How other extensions, keybindings, scripts and AI agents read and write tasks. Korean original: [api.md](api.md). Design background: [api-plan.md](api-plan.md). Type definitions ship with the extension as `dist/api-types/api/types.d.ts` (source: [src/api/types.ts](../src/api/types.ts)).

## 1. Getting started (from another extension)

```ts
import * as vscode from 'vscode';
import type { TasksExtensionExports, TasksApi } from './tasks-api';   // copy types.d.ts into your project

const ext = vscode.extensions.getExtension<TasksExtensionExports>('hastycapybara.tasks-for-markdown');
if (!ext) throw new Error('Tasks for Markdown is not installed');
const tasks: TasksApi = (await ext.activate()).getAPI(1, { extensionId: 'my-publisher.my-extension' });

const r = await tasks.query.run('not done\ndue before tomorrow\nsort by urgency');
for (const t of r.tasks) console.log(t.path, t.line + 1, t.description, t.due);
```

- `getAPI(1, caller)`: only version `1` exists; any other value throws `INVALID_ARGUMENT`. `caller.extensionId` is shown in the write-confirmation dialog and in the log.
- Every method returns a `Promise` and rejects with a `TasksApiError` shaped `{ code, message, details? }` (§5).
- Everything is plain JSON: dates are `YYYY-MM-DD`, a task is addressed by `{ path, line }` (workspace-relative path, 0-based line).
- Requirements: the extension is installed and activated in the same VS Code/Cursor window, and a workspace folder is open. Outside the editor use the library, the CLI or the MCP server (§6–8).

## 2. Methods

### query — read (never asks)

| Method | What it does |
|---|---|
| `run(query, { source?, limit? })` | The same language as ```tasks blocks. Returns `tasks` (flat list), `groups` (tree when the query has `group by`), `matched`, `shown`. Parse errors reject with `INVALID_QUERY` |
| `explain(query, source?)` | Explanation text and errors, without running |
| `get(ref)` | The task at that line, or `null` |
| `list({ paths? })` | Every indexed task in file order, optionally only from these files |
| `saved()` | Saved queries (settings + `.tasks/queries/*.md`) |

### edit — write (subject to the write policy, §4)

| Method | What it does |
|---|---|
| `create(input, target?)` | New task. `input`: `description` (required), `tags`, `priority` ('0'–'5'), dates, `recurrence`, `onCompletion`, `id`, `dependsOn`, `status`. `target.path` (defaults to `tasksmd.calendar.newTaskFile`), `target.line` (defaults to end of file). The file is created if missing |
| `update(ref, changes)` | Change fields; `null` removes a field. `status`, if present, is applied last |
| `setStatus(ref, symbol)` | Status symbol (`x`, `/`, `-` …). Done/cancelled dates and the next recurrence behave exactly like a click in the UI |
| `toggle(ref)` | Move to the status' next symbol |
| `postpone(ref, to)` | Move the due date (or scheduled date when there is no due date) to `YYYY-MM-DD` or natural language (`tomorrow`, `next monday`, `in 2 weeks`) |
| `remove(ref)` | Delete the line |
| `batch(ops)` | Run in order; stops at the first failure with `details.completed` and `details.results`. Limit `tasksmd.api.batchLimit` (200). **Not atomic** — earlier operations are not rolled back |

Put the exact line (`TaskDto.originalMarkdown`) in `ref.expectedText` and the write is refused with `STALE_LINE` if the line changed meanwhile. Always doing so prevents overwriting with stale data.

**Tree (added in 1.6.0, compatible with v1).** When tree display is on (`tasksmd.query.showTree` or `show tree`), `query.run` always fills `groups`, and leaf groups carry `tree: { task, matched, children }[]`. `matched: false` marks context rows (children shown with their parent although they did not match). The flat `tasks` list still holds only matching tasks. `TaskDto` gains `parentLine` (line of the parent list item, or null) and `depth`.

**Notes (added in 1.8.0, compatible with v1).** `TaskDto.notes: { line, text }[]` — the task's direct child bullets without a checkbox. `changes.notes: string[]` on `edit.create` and `edit.update` replaces all notes (`[]` removes them). Existing note lines are rewritten in place, extra ones added or removed; sub-tasks are never touched.

### events

| Method | What it does |
|---|---|
| `onDidChangeTasks(listener)` | Paths of files whose tasks changed or were removed (debounced index event) |
| `onDidCompleteTask(listener)` | Fires when a task goes from open to completed; `next` holds the new occurrence of a recurring task |

Both return `{ dispose() }`.

### ui

| Method | What it does |
|---|---|
| `openEdit(ref?)` | The create/edit dialog |
| `openKanban({ savedQueryId?, mode? })` | Kanban; options are ignored if it is already open |
| `openCalendar({ fullScreen? })` | Calendar |
| `openQueryResults(query, source?)` | The query results panel beside the editor |
| `reveal(ref)` | Open the file in the text editor at that line |

## 3. Command surface (keybindings, macros, other languages)

Each method has a command `tasksmd.api.<namespace>.<method>`. It takes one object with named parameters and resolves to the method's JSON result; on failure it returns `{ error: { code, message } }` instead of rejecting. The commands are hidden from the palette.

```ts
const r = await vscode.commands.executeCommand('tasksmd.api.query.run', { query: 'due today', limit: 20 });
await vscode.commands.executeCommand('tasksmd.api.edit.setStatus', { ref: { path: 'notes/todo.md', line: 12 }, symbol: 'x' });
```

keybindings.json:
```json
{ "key": "ctrl+alt+k", "command": "tasksmd.api.ui.openKanban", "args": { "savedQueryId": "this-week", "mode": "due" } }
```

| Command | Argument |
|---|---|
| `tasksmd.api.query.run` | `{ query, source?, limit? }` |
| `tasksmd.api.query.explain` | `{ query, source? }` |
| `tasksmd.api.query.get` | `{ ref }` |
| `tasksmd.api.query.list` | `{ paths? }` |
| `tasksmd.api.query.saved` | none |
| `tasksmd.api.edit.create` | `{ input, target? }` |
| `tasksmd.api.edit.update` | `{ ref, changes }` |
| `tasksmd.api.edit.setStatus` | `{ ref, symbol }` |
| `tasksmd.api.edit.toggle` / `remove` | `{ ref }` |
| `tasksmd.api.edit.postpone` | `{ ref, to }` |
| `tasksmd.api.edit.batch` | `{ ops }` |
| `tasksmd.api.ui.openEdit` / `reveal` | `{ ref? }` |
| `tasksmd.api.ui.openKanban` | `{ savedQueryId?, mode? }` |
| `tasksmd.api.ui.openCalendar` | `{ fullScreen? }` |
| `tasksmd.api.ui.openQueryResults` | `{ query, source? }` |

The caller id of the command surface is `command` (one caller for the write policy).

## 4. Write policy and safeguards

- Setting `tasksmd.api.writePolicy`: `confirm` (default) — asks once per caller ("Allow / This time / Deny") and remembers allowed callers in `tasksmd.api.allowedWriters` (user settings). `allow` — never asks. `deny` — every write fails with `DENIED`.
- In untrusted workspaces writes fail with `UNTRUSTED`; reads still work.
- Every write is logged to the "Tasks for Markdown" output channel as `api <caller> <method> <path>:<line>`.
- The caller id is self-declared. The dialog shows the installed extension's display name, but this does not prevent impersonation; use `deny` in sensitive workspaces.

## 5. Error codes

| Code | Meaning |
|---|---|
| `STALE_LINE` | `expectedText` differs from the actual line, or the index and file disagree. `details.expected/actual` |
| `NOT_FOUND` | No task at that location |
| `INVALID_QUERY` | Query parse error; `details.errors` |
| `INVALID_ARGUMENT` | Bad argument (date format, unknown status symbol, unsupported version, …) |
| `UNTRUSTED` | Write in an untrusted workspace |
| `DENIED` | Refused by the policy or the user |
| `IO` | File read/write failed, or no workspace folder |

## 6. Outside the editor: npm library `@hastycapybara/tasks-core`

The extension's core (`src/core/`) published as a CommonJS package with types. Node 18+, no VS Code.

```ts
import { TaskIndex, parseFile, Query, StatusRegistry, dayjs, serializeTask, toTaskDto, applyStatusChange } from '@hastycapybara/tasks-core';

const registry = StatusRegistry.default();
const index = new TaskIndex();
const text = fs.readFileSync('notes/todo.md', 'utf8');
const r = parseFile(text, { path: 'notes/todo.md', statusRegistry: registry });
index.setFile({ key: 'notes/todo.md', path: 'notes/todo.md', tasks: r.tasks, headings: r.headings, frontmatterTags: r.frontmatterTags });

const today = dayjs().startOf('day');
const result = Query.parse('not done\ndue before today').run({ index, today, allowFunctions: false });
result.root.tasks.forEach((t) => console.log(serializeTask(t), toTaskDto(t, index, today).due));
```

| Area | Main exports |
|---|---|
| Parsing and serialising | `parseTaskLine`, `parseFile`, `serializeTask`, `Task`, `DateField`, `Priority`, `StatusRegistry`, `DEFAULT_STATUSES` |
| Completion and recurrence | `applyStatusChange` (done/cancelled dates, next occurrence), `Recurrence`, `nextInstance` |
| Dates | `dayjs`, `parseNaturalDate` (English and Korean), `parseDateRange`, `describeRelative` |
| Queries | `Query.parse(text).run({ index, today, allowFunctions })`, `Query.explain` |
| Index and dependencies | `TaskIndex`, `isBlocked`, `dependants` |
| Output | `toTaskDto` (JSON), `renderQueryResult` (HTML), `computeWeeklyStats` |

The library does not write files (pure computation). For writes use the CLI or copy its `store.ts` pattern (check the line's current text, then replace).

## 7. Outside the editor: CLI `tasksmd` (`@hastycapybara/tasks-cli`)

```bash
npx @hastycapybara/tasks-cli query "not done\ndue before today" --root ~/notes --md
tasksmd add "Monthly close #work ⏫ 📅 2026-10-05" --file notes/inbox.md
tasksmd done notes/todo.md:12 --expect "- [ ] the exact line"
tasksmd status notes/todo.md:12 /                 # in progress
tasksmd set notes/todo.md:12 --due 2026-10-20 --priority 1 --description "new text"
tasksmd postpone notes/todo.md:12 "next monday"
tasksmd remove notes/todo.md:12
tasksmd list --file notes/todo.md --json
tasksmd saved
tasksmd explain "priority is above none"
```

- Target folder: `--root` (default: current directory). `.gitignore`, `tasksmd.exclude`, `node_modules` and `.git` are skipped.
- Settings come from `<root>/.vscode/settings.json` (`tasksmd.*`): `globalFilter`, `taskFormat`, `setDoneDate`, `setCancelledDate`, `setCreatedDate`, `recurrence.*`, `statuses`, `savedQueries`, `include`, `exclude`, `query.allowFunctions`. Comments and trailing commas are fine.
- Line numbers are 1-based on the command line. `--today YYYY-MM-DD` changes the reference date (tests, reports).
- Output: Markdown (`line  (path:line)`) on a terminal, JSON when piped; force with `--json` / `--md`. Errors in JSON mode are `{ "error": { code, message } }`; exit code 1 (runtime error) or 2 (usage error).
- Files are edited directly. Save files that are open in an editor first. `--expect` with the exact line refuses to overwrite a changed line (`STALE_LINE`). Completion uses the same code as the extension, so done dates, next occurrences and field order are identical.

## 8. MCP server for AI agents (`tasksmd mcp`)

A Model Context Protocol server built into the CLI. Claude Code, Cursor Agent, Claude Desktop and similar agents use the tasks as tools over stdio.

**Registration**

```bash
# Claude Code, in the project folder
claude mcp add tasks -- npx -y @hastycapybara/tasks-cli mcp --root "$PWD"
# built from the repository instead of npm
claude mcp add tasks -- node /path/to/packages/cli/dist/tasksmd.cjs mcp --root "$PWD"
```
Cursor: `.cursor/mcp.json`; VS Code: `.vscode/mcp.json`:
```json
{ "mcpServers": { "tasks": { "command": "npx", "args": ["-y", "@hastycapybara/tasks-cli", "mcp", "--root", "${workspaceFolder}"] } } }
```

**Tools**

| Tool | Purpose |
|---|---|
| `tasks_query { query, source?, limit? }` | Run a query: `matched`, `shown`, `tasks[]` (path, 0-based line, description, dates, priority, tags, originalMarkdown) |
| `tasks_explain_query { query }` | Explanation and syntax errors, without running |
| `tasks_get { path, line }` | One task |
| `tasks_list_saved_queries` | Saved queries |
| `tasks_create { file, description, afterLine?, due?, priority?, … }` | Create (end of file, or after a line) |
| `tasks_update { path, line, expectedText?, …fields }` | Change fields (`null` removes); `status` last |
| `tasks_set_status { path, line, expectedText?, symbol }` | Set status; `x` adds the done date and the next occurrence |
| `tasks_postpone { path, line, expectedText?, to }` | Move the due (or scheduled) date; natural language allowed |
| `tasks_remove { path, line, expectedText? }` | Delete the line |
| `tasks_syntax_reference` / resource `tasks://syntax` | Task line format and query cheat sheet, including the sidebar's smart-view queries. The server instructions tell the agent to read it first |

- Write tools accept `expectedText` (the line's `originalMarkdown`) and refuse changed lines with `STALE_LINE`; the server instructions ask the agent to always pass it.
- Every call re-scans the folder, so files changed between calls are seen. Settings are read like the CLI.
- Files with unsaved editor changes may conflict; the instructions tell the agent to have the user save first.
- Errors come back with `isError` and a `{ error: { code, message } }` body.

## 9. Compatibility

- `version: 1`. Adding fields or methods keeps version 1. Removing or changing meaning adds `getAPI(2)` and keeps 1 for at least one release.
- Changes are listed in the "API" section of the CHANGELOG.
- `__internal` (test-only internals) and `extendMarkdownIt` (for the Markdown extension) are not public API.
