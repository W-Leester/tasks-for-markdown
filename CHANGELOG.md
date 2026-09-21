# Changelog

## Unreleased

### M1 — minimum usable (2026-09-21)
- Workspace index of every `- [ ]` line in Markdown files (include/exclude globs, `files.exclude`, root `.gitignore`, size limit), kept live from the file watcher and open editors.
- `Tasks: Toggle task done` (`Cmd/Ctrl+Enter` on a task line), mark done / cancelled / reopen, go to task.
- Sidebar with smart views (Today, Next 7 days, Overdue, In progress, Blocked, All open, Done 30 days), grouping, filter, checkboxes.
- Status bar summary with scan progress and skipped-file warnings.
- Settings under `tasksmd.*` (task format, global filter, scan globs, date behaviour).

### M0 — foundation (2026-09-21)
- Project scaffolding, CI, core task model, emoji/Dataview parser and serializer compatible with Obsidian Tasks (ported test cases).
