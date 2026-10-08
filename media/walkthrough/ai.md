# Connect AI agents

Tasks for Markdown includes an MCP server, so AI agents can read and change your tasks when you ask in plain language:

> What is overdue? Mark the vendor contract review done and add a note: Legal approved clause 3.

## How to connect

- **This editor's agent** (VS Code agent mode, Cursor) is connected automatically.
- **Claude Code** and **Claude Desktop**: if they are installed, a prompt offers to connect them — or run **Tasks: Connect AI agents (MCP)** any time.

It runs on the editor's own Node — nothing to install. Claude Desktop asks before each tool call; to skip that for lookups, set the read-only tools to *Always allow* under `+` → Connectors → Manage connectors → tasks.

## Why MCP, not just pasting the note

- **Exact answers** — the agent asks the same query engine as your sidebar and `tasks` blocks, so overdue counts and date math are computed, not guessed.
- **Every note, only what matters** — it searches the whole folder and gets back only the matching lines, however many notes you have.
- **Changes like the editor makes them** — "mark it done" adds the done date and the next occurrence of a recurring task, in Obsidian's field order.
- **Never overwrites your edits** — every change carries the exact line it read; if you changed that line meanwhile, the change is refused.
- **Your settings apply** — global filter, custom statuses, "new tasks need a due date", Dataview format.
- **One set of tools everywhere** — the same tools in VS Code, Cursor, Claude Code and Claude Desktop.
