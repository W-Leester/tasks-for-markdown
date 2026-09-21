# Tasks for Markdown

Obsidian Tasks-compatible task management for Markdown files in VS Code and Cursor.

- Tasks live in your `.md` files as plain `- [ ]` checklist lines with emoji (📅 ⏳ 🛫 ✅ 🔁 ⏫ …) or Dataview (`[due:: …]`) fields — no database.
- Query them from anywhere with a ` ```tasks ` block, a sidebar dashboard, a kanban board or a calendar, and toggle them done wherever you see them; the source file is updated.

## Documents

- [Requirements](docs/requirements.md)
- [Design](docs/design.md)
- [Development checklist](docs/Tasks.md)

## Development

```bash
pnpm install
pnpm build        # bundle extension to dist/
pnpm test         # unit tests (vitest)
pnpm package      # build .vsix
```

Press `F5` in VS Code to launch an Extension Development Host.

## Credits

Task syntax, query language and parts of the core logic are ported from
[Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) (MIT). See [NOTICE.md](NOTICE.md).

## License

MIT
