# @hastycapybara/tasks-cli

Command line for **[Tasks for Markdown](https://github.com/W-Leester/tasks-for-markdown)**: query, add, complete and edit Obsidian Tasks-style task lines in a folder of Markdown notes — no editor required. It uses the same code as the extension (`@hastycapybara/tasks-core`), so done dates, the next occurrence of recurring tasks and field order come out exactly as they do in the editor. (한국어: [docs/api.md §7–8](https://github.com/W-Leester/tasks-for-markdown/blob/main/docs/api.md))

```bash
npx @hastycapybara/tasks-cli query "not done
due before today" --root ~/notes --md

tasksmd add "Monthly close #work ⏫ 📅 2026-10-05" --file notes/inbox.md
tasksmd done notes/todo.md:12 --expect "- [ ] the exact line"   # refused if the line changed (STALE_LINE)
tasksmd set notes/todo.md:12 --due 2026-10-20 --priority 1
tasksmd postpone notes/todo.md:12 "next monday"
tasksmd note notes/todo.md:12 "Reply received"                  # add a note under the task
tasksmd info                                                    # version, features, settings
tasksmd query "not done" --json | jq '.tasks[] | select(.priority == "0") | .description'
```

- Scans `.md`/`.markdown` under `--root` (default: current folder), honouring `.gitignore` and `tasksmd.exclude`. Settings come from `<root>/.vscode/settings.json` (`tasksmd.*`: global filter, done dates, recurrence insert position, custom statuses, due-date requirement…).
- Line numbers are 1-based. Output is Markdown in a terminal and JSON in a pipe; force either with `--json` / `--md`.
- It edits files directly. Save files that have unsaved changes in an editor first. Pass the line text with `--expect` to avoid overwriting a line that changed meanwhile.
- Exit codes: 0 success, 1 runtime error (`NOT_FOUND`, `STALE_LINE`, `INVALID_QUERY`, `IO`), 2 bad arguments.

## MCP server (AI agents)

```bash
claude mcp add tasks -- npx -y @hastycapybara/tasks-cli mcp --root "$PWD"
```

Then ask in plain language, e.g. "show my unfinished work tasks due this week and mark the contract review done" — the agent calls tools such as `tasks_query`, `tasks_set_status` and `tasks_add_note`. Cursor (`.cursor/mcp.json`, key `mcpServers`) and VS Code (`.vscode/mcp.json`, key `servers`) take the same command.

**Using the VS Code / Cursor extension?** You don't need this package: from version 1.1.0 the extension bundles the same server and command, connects VS Code's agent mode and Cursor automatically, and offers **Tasks: Install 'tasksmd' terminal command** and **Tasks: Connect AI agents (MCP)** — no Node.js or npm. This package is for machines without the extension (CI, servers). Tools and arguments: [docs/api.en.md §8](https://github.com/W-Leester/tasks-for-markdown/blob/main/docs/api.en.md).

MIT. The task syntax and parts of the core logic are ported from [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) (MIT); see the bundled NOTICE.md. Not affiliated with Obsidian.
