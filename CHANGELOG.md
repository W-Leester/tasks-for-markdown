# Changelog

## Unreleased

### M4 — query engine (2026-09-21)
- Obsidian Tasks-compatible query language: status, date (single/range/natural language), priority, recurrence, dependency, text/regex, tag and boolean filters; sort by / group by every field with the plugin's default order; limits, layout instructions, `explain`.
- `filter/sort/group by function` (opt-in, trusted workspaces only, time-budgeted).
- Saved queries from `tasksmd.savedQueries` and `.tasks/queries/*.md`, shown in the sidebar with grouped results.
- Quick search (`Cmd/Ctrl+Shift+;`), insert query block, explain query under cursor.
- 50,000-task benchmark: representative queries under 100 ms.

### M3 — recurrence, statuses, dependencies (2026-09-21)
- Recurring tasks: completing a `🔁 every …` task inserts the next instance (Obsidian rules: reference date priority, relative dates, `when done`, short months, `🏁 delete`), configurable position / id handling / dependsOn copy.
- Custom statuses via `tasksmd.statuses` with theme presets (Core, Minimal, ITS, Things); behaviour follows the status type.
- Dependencies: blocked / blocking detection, cycle diagnostics, "Set dependencies…" picker that mints ids.
- Urgency score (Obsidian formula) drives default ordering; recurrence picker with live validation.

### M2 — editor assistance (2026-09-21)
- Decorations: relative-date hints, overdue / due-today backgrounds, dimmed completed tasks and metadata, gutter status icons.
- CodeLens actions above the current task line (done, priority, due, scheduled, postpone, edit) and a hover card with command links.
- Auto-suggest on task lines: keywords (due, priority, every week, id, depends on…) and natural-language dates ("next fri", "3일 후").
- QuickPick commands for status, priority, dates, postpone; sequential create/edit flow (`Cmd/Ctrl+Alt+T`).
- Diagnostics with quick fixes: invalid dates, unknown dependency ids, recurring tasks without a date.

### M1 — minimum usable (2026-09-21)
- Workspace index of every `- [ ]` line in Markdown files (include/exclude globs, `files.exclude`, root `.gitignore`, size limit), kept live from the file watcher and open editors.
- `Tasks: Toggle task done` (`Cmd/Ctrl+Enter` on a task line), mark done / cancelled / reopen, go to task.
- Sidebar with smart views (Today, Next 7 days, Overdue, In progress, Blocked, All open, Done 30 days), grouping, filter, checkboxes.
- Status bar summary with scan progress and skipped-file warnings.
- Settings under `tasksmd.*` (task format, global filter, scan globs, date behaviour).

### M0 — foundation (2026-09-21)
- Project scaffolding, CI, core task model, emoji/Dataview parser and serializer compatible with Obsidian Tasks (ported test cases).
