# @hastycapybara/tasks-core

Tasks for Markdown 확장의 핵심 라이브러리입니다. VS Code 없이 Node에서 Obsidian Tasks 호환 태스크 줄을 파싱·직렬화하고, 날짜·반복 규칙을 계산하고, 같은 쿼리 언어로 검색합니다. 확장이 실제로 쓰는 코드 그대로입니다.

```ts
import { TaskIndex, parseFile, Query, StatusRegistry, dayjs, serializeTask, toTaskDto } from '@hastycapybara/tasks-core';

const registry = StatusRegistry.default();
const index = new TaskIndex();
const text = '- [ ] 보고서 작성 #업무 ⏫ 📅 2026-10-01\n- [x] 회의록 정리 ✅ 2026-09-20\n';
const parsed = parseFile(text, { path: 'notes/todo.md', statusRegistry: registry });
index.setFile({ key: 'notes/todo.md', path: 'notes/todo.md', tasks: parsed.tasks, headings: parsed.headings, frontmatterTags: parsed.frontmatterTags });

const today = dayjs('2026-09-26');
const result = Query.parse('not done\ndue before 2026-10-15\nsort by urgency').run({ index, today, allowFunctions: false });
for (const task of result.root.tasks) console.log(serializeTask(task), toTaskDto(task, index, today).due);
```

주요 export: `parseTaskLine`, `parseFile`, `serializeTask`, `Task`, `DateField`, `StatusRegistry`, `applyStatusChange`(완료·반복 처리), `Recurrence`, `parseNaturalDate`, `Query`, `TaskIndex`, `toTaskDto`, `renderQueryResult`, `computeWeeklyStats`. 쿼리 문법과 필드 이모지는 확장 문서(docs/user-guide.md)와 같습니다.

CommonJS로 배포되며 Node 18 이상에서 동작합니다. 라이선스 MIT. 일부 코드는 Obsidian Tasks(MIT)에서 이식했습니다(저장소의 NOTICE.md).
