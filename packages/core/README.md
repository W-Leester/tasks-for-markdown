# @hastycapybara/tasks-core

The core library of **[Tasks for Markdown](https://github.com/W-Leester/tasks-for-markdown)**: parse and write Obsidian Tasks-compatible task lines, compute dates and recurrence, and search with the same query language — in plain Node, without VS Code. It is exactly the code the extension runs. (한국어: [docs/api.md §6](https://github.com/W-Leester/tasks-for-markdown/blob/main/docs/api.md))

```ts
import { TaskIndex, parseFile, Query, StatusRegistry, dayjs, serializeTask, toTaskDto } from '@hastycapybara/tasks-core';

const registry = StatusRegistry.default();
const index = new TaskIndex();
const text = '- [ ] Write the report #work ⏫ 📅 2026-10-01\n- [x] Tidy meeting notes ✅ 2026-09-20\n';
const parsed = parseFile(text, { path: 'notes/todo.md', statusRegistry: registry });
index.setFile({ key: 'notes/todo.md', path: 'notes/todo.md', tasks: parsed.tasks, headings: parsed.headings, frontmatterTags: parsed.frontmatterTags });

const today = dayjs('2026-09-26');
const result = Query.parse('not done\ndue before 2026-10-15\nsort by urgency').run({ index, today, allowFunctions: false });
for (const task of result.root.tasks) console.log(serializeTask(task), toTaskDto(task, index, today).due);
```

Main exports: `parseTaskLine`, `parseFile`, `serializeTask`, `Task`, `DateField`, `StatusRegistry`, `applyStatusChange` (done dates and recurrence), `Recurrence`, `parseNaturalDate`, `Query`, `TaskIndex`, `toTaskDto`, `renderQueryResult`, `computeWeeklyStats`, plus note helpers (`noteBlock`, `addNoteLines`, `setNoteLines`). The query syntax and field emojis match the extension ([user guide, Korean](https://github.com/W-Leester/tasks-for-markdown/blob/main/docs/user-guide.md); [Obsidian Tasks docs](https://publish.obsidian.md/tasks/)).

It does not write files — use [`@hastycapybara/tasks-cli`](https://www.npmjs.com/package/@hastycapybara/tasks-cli) for that. CommonJS, Node 18+. MIT; parts are ported from [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) (MIT), see NOTICE.md.
