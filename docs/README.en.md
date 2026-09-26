# Tasks for Markdown

Obsidian Tasks-compatible task management for Markdown files in **VS Code** and **Cursor**.

Your tasks stay in your notes as plain checklist lines — no database, no lock-in:

```markdown
- [ ] Write the report #work ⏫ 🔁 every week 🛫 2026-09-20 ⏳ 2026-09-22 📅 2026-09-25
- [x] Tidy meeting notes ✅ 2026-09-21
```

The extension indexes every `- [ ]` line in the workspace and lets you see, query and complete tasks wherever you are: the editor, a sidebar, a kanban board, a calendar, the Markdown preview. Completing a task rewrites the line in the file (with a done date, and the next instance for recurring tasks).

## Highlights

- **Same syntax as [Obsidian Tasks](https://publish.obsidian.md/tasks/)** — emoji fields (📅 ⏳ 🛫 ➕ ✅ ❌ 🔁 🏁 🆔 ⛔, priorities 🔺⏫🔼🔽⏬) and Dataview inline fields (`[due:: 2026-09-25]`) are both read; you choose which one is written. Lines are written in Obsidian's exact field order, so files stay interchangeable.
- **Editor assistance** — auto-suggest on task lines (`due`, `priority high`, `every week`, natural-language dates like `next fri` / `3일 후`), CodeLens actions above the current task, hover cards, relative-date hints, overdue highlighting, diagnostics with quick fixes.
- **Sidebar** — Today / Next 7 days / Overdue / In progress / Blocked / All open / Done, grouping, filter, checkboxes; saved queries with grouped results.
- **Query language** — the Obsidian Tasks query language in ` ```tasks ` blocks (rendered in the Markdown preview), in saved queries and in a visual query builder. Filters, boolean logic, sort by, group by, limits, layout options, `explain`, and optional `filter/sort/group by function`.
- **Recurrence, statuses, dependencies** — `🔁 every month on the last`, `when done`, custom checkbox statuses with theme presets (Minimal, ITS, Things), `🆔`/`⛔` dependencies with blocked detection and cycle diagnostics, Obsidian's urgency score.
- **More views** — Create/edit dialog, kanban (drag & drop), calendar (month/week, full screen, drag to reschedule), weekly statistics, archive of completed tasks, daily notifications.
- **Works in Cursor** — only stable VS Code APIs; also published to Open VSX.

## Getting started

1. Install the extension (Marketplace / Open VSX / `.vsix`).
2. Open a folder with Markdown files. The **Tasks** icon appears in the Activity Bar.
3. Put the cursor on a checklist line and press `Cmd/Ctrl+Enter` to toggle it, or `Ctrl+Shift+C` to open the edit dialog.
4. Type ` ```tasks ` in a note and open the Markdown preview:

````markdown
```tasks
not done
due before next week
sort by urgency
group by filename
```
````

## Commands (Command Palette → "Tasks:")

| Command | Default key |
|---|---|
| Toggle task done | `Cmd/Ctrl+Enter` (on a task line) |
| Create or edit task | `Ctrl+Shift+C` |
| Quick search tasks | `Cmd/Ctrl+Shift+;` |
| Set status / priority / due / scheduled / start / recurrence / dependencies, Postpone | — |
| Open rendered view / edit Markdown source (toggle) — interactive preview with live ```tasks results | `Ctrl+Shift+R` |
| Open kanban board / calendar / statistics / query builder / query results (beside the editor, follows the cursor) | — |
| Archive completed tasks… | — |
| Insert query block, Explain query under cursor | — |
| Load status preset…, Convert task format in this file… | — |

## Settings (`tasksmd.*`)

| Setting | Default | What it does |
|---|---|---|
| `taskFormat` | `emoji` | Format used when writing fields (`emoji` or `dataview`) |
| `globalFilter` | `""` | Only lines containing this text (e.g. `#task`) are tasks |
| `include` / `exclude` / `respectGitignore` / `maxFileSizeKB` | | What gets scanned |
| `setDoneDate` / `setCancelledDate` / `setCreatedDate` | `true` / `true` / `false` | Automatic ✅ ❌ ➕ dates |
| `statuses` | 4 core statuses | Custom checkbox symbols, names, next symbol and type |
| `recurrence.insertPosition` / `idHandling` / `copyDependsOn` / `removeScheduledDate` | `above` / `keep` / `true` / `false` | Next-instance behaviour |
| `decorations.*`, `codeLens.mode`, `autoSuggest.*` | | Editor assistance |
| `preview.enabled` / `preview.renderBadges` | `true` | Markdown preview rendering |
| `savedQueries` | `[]` | Saved queries (also `.tasks/queries/*.md`) |
| `query.allowFunctions` | `false` | Allow `by function` JavaScript in queries (trusted workspaces only) |
| `editModal.accessKeys` / `editModal.hiddenFields` | `true` / `[]` | Edit dialog |
| `notifications.*` | on, `09:00`, 1 day | Daily summary and due-soon digest, OS notifications |
| `archive.file` / `afterDays` / `linkStyle` | `Archive.md` / 30 / `wiki` | Archive command |
| `calendar.newTaskFile` | `""` | File that receives tasks created from the calendar |
| `api.writePolicy` | `confirm` | Writes through the public API: confirm once per caller / allow / deny |
| `rendered.fieldsAlign` | `right` | Rendered view: task fields at the right edge (`right`) or after the description (`inline`) |
| `rendered.fontSize` / `rendered.lineHeight` | `14.5` / `1.6` | Rendered view body font size (px) and line height |
| `rendered.fieldStyle` | `plain` | Task-line fields in the rendered view: as in the source (`plain`) or pill badges (`badges`) |
| `calendar.fontSize` | `13` | Font size (px) of tasks in calendar cells |
| `calendar.fullScreen` | `maximize` | Full screen button: maximize the editor group only, or `window` for the whole window |
| `updateCheckUrl` | `""` | `latest.json` location for `.vsix` installs |

## API and automation

Four ways for other programs to read and write tasks. Details in [docs/api.en.md](api.en.md).

| From | How |
|---|---|
| Another VS Code/Cursor extension | `getExtension('hastycapybara.tasks-for-markdown').exports.getAPI(1, { extensionId })` → `query.run(...)`, `edit.setStatus(...)`. Types ship with the extension in `dist/api-types/api/types.d.ts` |
| Keybindings, macros | Commands `tasksmd.api.<ns>.<method>` (e.g. `tasksmd.api.query.run` with `{ "query": "due today" }`) |
| Terminal, scripts, CI | `npx @hastycapybara/tasks-cli query "not done\ndue before today" --root ~/notes` — no editor needed |
| AI agents (Claude Code, Cursor, …) | `claude mcp add tasks -- npx -y @hastycapybara/tasks-cli mcp --root "$PWD"`, then ask in plain language |

```ts
// from another extension
const tasks = (await ext.activate()).getAPI(1, { extensionId: 'my.extension' });
const r = await tasks.query.run('not done\nhappens on or before today');   // same as the sidebar's "Today"
await tasks.edit.setStatus({ path: r.tasks[0].path, line: r.tasks[0].line, expectedText: r.tasks[0].originalMarkdown }, 'x');
```

Writes ask the user once per caller by default (`tasksmd.api.writePolicy`). Everything is plain JSON; errors are `{ code, message }`. Need only the Node library? `@hastycapybara/tasks-core`.

## Notes on the Markdown preview

The built-in preview renders task lines with checkboxes and badges and ` ```tasks ` blocks as live results, refreshed whenever tasks change. The classic preview cannot send clicks back to extensions, so checkboxes there are display-only — toggle tasks from the editor, the sidebar or the kanban board instead.

## Documentation

- [Public API (extension API, commands, library, CLI, MCP server)](api.en.md)

- [User guide (Korean)](user-guide.md)
- [Requirements](requirements.md) · [Design](design.md) · [Development checklist](Tasks.md) · [Performance](perf.md)

## Development

```bash
pnpm install
pnpm build              # extension + webview bundles
pnpm test               # unit tests (vitest)
pnpm test:integration   # runs a VS Code instance
pnpm package            # production build + .vsix + latest.json
```

Press `F5` in VS Code to launch an Extension Development Host.

## Credits

Task syntax, the query language and parts of the core logic (parser, recurrence, urgency) are ported from [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) (MIT). See [NOTICE.md](../NOTICE.md). This project is not affiliated with Obsidian.

## License

MIT
