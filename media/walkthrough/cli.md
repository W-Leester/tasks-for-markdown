# Use your tasks from the terminal

**Tasks: Install 'tasksmd' terminal command** adds a `tasksmd` command to every terminal. It reads and writes the same Markdown files, with the same rules as the editor.

## Why install it

- **Check without opening the editor** — what is due today, what is overdue, what is next.
- **Quick changes from anywhere** — add a task, mark it done, postpone it, add a note.
- **Scripts and automation** — a morning summary, a git hook that warns about overdue release tasks, a Raycast / Alfred / Shortcuts action.
- **Terminal AI agents** — Claude Code, Codex and other tools that run shell commands can use `tasksmd` directly.
- **Exactly like the editor** — Obsidian Tasks syntax, done dates, the next occurrence of recurring tasks, your settings (global filter, statuses, due-date rule). `--expect` refuses to change a line that was edited meanwhile.
- **Nothing else to install** — it runs on the editor's own Node (no Node.js or npm) and updates with the extension.

## Examples

Run them in your notes folder (or add `--root <folder>`):

```bash
# What is overdue?
tasksmd query "not done
due before today
sort by due"

# Add a task (the file is created if needed)
tasksmd add "- [ ] Call the bank 📅 2026-10-08" --file inbox.md

# Postpone, add a note, mark done (lines are 1-based)
tasksmd postpone inbox.md:1 "next monday"
tasksmd note inbox.md:1 "Ask about the fee"
tasksmd done inbox.md:1

# JSON for scripts
tasksmd query "due today" --json | jq '.matched'
```

`tasksmd --help` lists every command. Remove it with **Tasks: Uninstall 'tasksmd' terminal command**.
