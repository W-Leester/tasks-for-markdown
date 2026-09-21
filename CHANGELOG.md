# Changelog

## Unreleased

### M7 — extras (2026-09-21)
- Daily summary and due-soon notifications (VS Code toasts + native OS notifications, snooze).
- "Archive completed tasks…" moves old completed tasks into `Archive.md` with links back, after a preview.
- Weekly statistics panel (completed / created / overdue / remaining per ISO week, tag and folder filters).
- Calendar panel (month / week) with drag-to-reschedule and inline task creation.
- Optional update check for `.vsix` installs via `tasksmd.updateCheckUrl` (`latest.json`).

### M6 — webviews (2026-09-21)
- Create or edit task dialog (`Cmd/Ctrl+Alt+T`): all fields, natural-language dates, recurrence validation, dependency picker, live preview line, access keys.
- Kanban board in the sidebar and as an editor panel: columns by status / due date / priority / file, drag & drop edits, any saved query as data source.
- Query builder: assemble filters, sorting, grouping and layout with dropdowns, see the explanation and match count live, save to `.tasks/queries/` or settings, insert into a note.

### M5 — Markdown preview (2026-09-21)
- Built-in preview renders checklist items with checkboxes and metadata badges, and ```tasks blocks as live query results (groups, counts, explain, errors); previews refresh when tasks change anywhere.
- Preview is render-only (the classic preview offers no channel back to extensions); toggling/editing stays in the sidebar, kanban and editor.

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
