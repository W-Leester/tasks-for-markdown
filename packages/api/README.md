# @hastycapybara/tasks-api

TypeScript types for the public API of **[Tasks for Markdown](https://github.com/W-Leester/tasks-for-markdown)**, the Obsidian Tasks-compatible task manager for VS Code and Cursor. Types only — the API itself is provided by the installed extension.

```bash
npm i -D @hastycapybara/tasks-api
```

```ts
import * as vscode from 'vscode';
import type { TasksExtensionExports, TasksApi } from '@hastycapybara/tasks-api';

const ext = vscode.extensions.getExtension<TasksExtensionExports>('HastyCapybara.tasks-for-markdown');
if (!ext) throw new Error('Tasks for Markdown is not installed');
const tasks: TasksApi = (await ext.activate()).getAPI(1, { extensionId: 'my-publisher.my-extension' });

const due = await tasks.query.run('not done\ndue before tomorrow\nsort by urgency');
if (tasks.features.includes('notes.add')) await tasks.edit.addNote({ path: due.tasks[0].path, line: due.tasks[0].line }, 'Started');
```

Check optional capabilities with `tasks.features` (or `await tasks.info()`), not by version number.

- API reference: [docs/api.en.md](https://github.com/W-Leester/tasks-for-markdown/blob/main/docs/api.en.md) (Korean: [docs/api.md](https://github.com/W-Leester/tasks-for-markdown/blob/main/docs/api.md))
- The same types are in the repository as one self-contained file: [src/api/types.ts](https://github.com/W-Leester/tasks-for-markdown/blob/main/src/api/types.ts)
- Outside the editor, use the CLI / MCP server [`@hastycapybara/tasks-cli`](https://www.npmjs.com/package/@hastycapybara/tasks-cli) or the library [`@hastycapybara/tasks-core`](https://www.npmjs.com/package/@hastycapybara/tasks-core).

MIT. Task syntax and query language come from [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) (MIT); see NOTICE.md.
