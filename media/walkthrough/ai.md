# Connect AI agents

Tasks for Markdown includes an MCP server, so AI agents can read and change your tasks when you ask in plain language:

> What is overdue? Mark the vendor contract review done and add a note: Legal approved clause 3.

- **This editor's agent** (VS Code agent mode, Cursor) is connected automatically.
- **Claude Code** and **Claude Desktop**: run **Tasks: Connect AI agents (MCP)**.

It runs on the editor's own Node — nothing to install. Every change an agent makes is checked against the line it read, so your edits are never overwritten.
