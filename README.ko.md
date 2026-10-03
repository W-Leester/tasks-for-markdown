# Tasks for Markdown

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code%20Marketplace-install-007ACC)](https://marketplace.visualstudio.com/items?itemName=HastyCapybara.tasks-for-markdown)
[![Open VSX](https://img.shields.io/open-vsx/v/HastyCapybara/tasks-for-markdown?label=Open%20VSX)](https://open-vsx.org/extension/HastyCapybara/tasks-for-markdown)
[![npm: tasks-cli](https://img.shields.io/npm/v/@hastycapybara/tasks-cli?label=npm%20tasks-cli)](https://www.npmjs.com/package/@hastycapybara/tasks-cli)
[![npm: tasks-api](https://img.shields.io/npm/v/@hastycapybara/tasks-api?label=npm%20tasks-api)](https://www.npmjs.com/package/@hastycapybara/tasks-api)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**VS Code**와 **Cursor**에서 쓰는 Obsidian Tasks 호환 할 일 관리 확장입니다.

[웹사이트](https://hastycapybara.com/ko/apps/tasksmd/) · [English website](https://hastycapybara.com/en/apps/tasksmd/) · [English README](README.md)

> 이 확장은 Obsidian의 [Tasks 플러그인](https://github.com/obsidian-tasks-group/obsidian-tasks)에서 출발했습니다. 태스크 문법과 쿼리 언어, 그리고 그 프로젝트가 오랫동안 다듬어 온 설계 위에 VS Code·Cursor용으로 다시 만든 것입니다. 좋은 도구를 공개해 준 원작자와 기여자들께 감사드립니다. 아래 [감사의 말](#감사의-말)을 참고하세요.

## 왜 Tasks for Markdown인가

| | |
|---|---|
| **노트는 그냥 마크다운으로 남습니다** | 할 일은 [Obsidian Tasks](https://publish.obsidian.md/tasks/) 문법의 평범한 체크리스트 줄입니다. 별도 데이터베이스도, 종속도 없습니다. 같은 파일을 Obsidian, GitHub, 어떤 편집기에서도 씁니다. |
| **AI 에이전트가 관리해 줍니다** | 내장 [MCP](https://modelcontextprotocol.io) 서버로 Claude Code, Cursor 에이전트, Claude Desktop, VS Code 에이전트 모드가 말로 시킨 대로 태스크를 찾고, 만들고, 완료하고, 메모를 남깁니다. |
| **공개 API로 무엇이든 덧붙일 수 있습니다** | 버전이 정해진 공개 API, 명령, 타입 npm 패키지, CLI, Node 라이브러리를 제공합니다. 다른 확장·스크립트·CI가 같은 태스크를 안전하게 읽고 씁니다. |

```markdown
- [ ] 보고서 작성 #업무 ⏫ 🔁 every week 🛫 2026-09-20 ⏳ 2026-09-22 📅 2026-09-25
  - 재무팀에 3분기 수치 요청
- [x] 회의록 정리 ✅ 2026-09-21
```

확장은 워크스페이스의 모든 `- [ ]` 줄을 인덱싱합니다. 에디터, 사이드바, 칸반 보드, 캘린더, 마크다운 미리보기 어디서든 태스크를 보고, 검색하고, 완료할 수 있습니다. 완료하면 파일의 그 줄이 수정됩니다. 완료일이 붙고, 반복 태스크는 다음 회차가 생깁니다.

## 움직이는 예시

**도움을 받으며 입력.** 입력하는 동안 자동완성이 필드를 제안하고, `next fri` 같은 자연어 날짜가 실제 날짜로 바뀝니다.

![태스크 입력: 마감일 자동완성, "next fri"가 2026-10-09로](docs/images/demo-editing.gif)

**키 하나로 완료.** `Ctrl+Shift+Enter`로 완료합니다. 반복 태스크는 다음 회차가 자동으로 생깁니다.

![Ctrl+Shift+Enter로 매주 반복 태스크를 완료하자 다음 회차가 추가됨](docs/images/demo-recurring.gif)

**렌더 보기에서 작업.** 체크박스를 누르고, 💬로 메모를 남기고, 열을 숨기거나 다시 보입니다. 쿼리 블록이 바로 갱신됩니다.

![렌더 보기: 메모 추가, 태스크 완료, 열 숨기기와 복원](docs/images/demo-rendered.gif)

**보드와 달력으로 계획.** 카드를 상태 열 사이로 끌어 옮기고, 태스크를 다른 날로 끌어 일정을 바꿉니다.

![칸반: 카드를 진행 중·완료로 이동, 캘린더: 태스크를 다른 날짜로 끌기](docs/images/demo-kanban-calendar.gif)

## AI와 함께 쓰기

AI 에이전트를 한 번 연결하면 말로 시킬 수 있습니다. 아래 화면은 실제 Claude Code 실행 장면입니다. 에이전트가 일하는 동안 에디터의 노트가 바로 바뀝니다.

![Claude Code가 "What is overdue?"에 답하고, 태스크를 완료하고 메모를 추가 — 파일이 실시간으로 바뀜](docs/images/demo-ai.gif)

**연결** (서버를 npm에서 `npx`로 실행하므로 Node.js 18 이상이 필요합니다):

```bash
# Claude Code, 노트 폴더에서
claude mcp add tasks -- npx -y @hastycapybara/tasks-cli mcp --root "$PWD"
```

Cursor — `.cursor/mcp.json`:
```json
{ "mcpServers": { "tasks": { "command": "npx", "args": ["-y", "@hastycapybara/tasks-cli", "mcp", "--root", "${workspaceFolder}"] } } }
```

VS Code(에이전트 모드) — `.vscode/mcp.json`:
```json
{ "servers": { "tasks": { "type": "stdio", "command": "npx", "args": ["-y", "@hastycapybara/tasks-cli", "mcp", "--root", "${workspaceFolder}"] } } }
```

Claude Desktop — `claude_desktop_config.json`, 노트 폴더의 절대 경로로:
```json
{ "mcpServers": { "tasks": { "command": "npx", "args": ["-y", "@hastycapybara/tasks-cli", "mcp", "--root", "/path/to/notes"] } } }
```

**이렇게 말해 보세요:**
- "기한 지난 거 뭐 있어? 거래처 계약 검토는 완료로 하고 '법무팀이 3조 승인'이라고 메모 남겨 줘."
- "이번 주 계획 세워 줘. 일요일 전에 마감인 것을 긴급한 순서로."
- "오늘 마감인 #home 태스크를 전부 토요일로 미뤄 줘."
- "여권 갱신 태스크 만들어 줘. 우선순위 높음, 마감 다음 주 금요일."

**에이전트가 할 수 있는 일:** 쿼리 언어 전체로 검색, 태스크 조회·생성, 필드 변경, 상태 변경, 미루기, 메모 추가, 삭제, 쿼리 설명. 에이전트는 먼저 문법 안내를 읽으므로 올바른 Obsidian Tasks 문법으로 씁니다. 모든 쓰기에는 읽어 간 줄의 내용이 함께 실리고, 그 사이 줄이 바뀌었으면 쓰기를 거절합니다. 그래서 옛 내용을 보고 일하는 에이전트가 사용자의 수정을 덮어쓰지 않습니다. 전체 도구 목록: [MCP 서버](docs/api.md).

## 확장하기

Tasks for Markdown은 그 위에 무언가를 만들 수 있게 설계했습니다. 다른 확장, 단축키, 스크립트, CI가 **버전이 정해진 안정적인 공개 API**로 같은 태스크를 다룹니다. 마크다운을 직접 파싱할 필요가 없습니다.

**만들 수 있는 것:**
- 태스크가 *진행 중*으로 바뀌면 타이머를 켜는 시간 기록기 (`events.onDidChangeStatus`)
- 기한 지난 일을 보여 주는 상태 표시줄 카운터나 대시보드 (`query.run` + `events.onDidChangeTasks`)
- 완료한 태스크를 팀 채팅에 올리거나 이슈를 닫는 연결 (`events.onDidCompleteTask`)
- 출시 태스크가 기한을 넘기면 빌드를 실패시키는 CI 일일 보고 (CLI)
- 같은 인덱스 위에 올린 나만의 화면: 타임라인, 집중 목록, 회고

```ts
import type { TasksExtensionExports } from '@hastycapybara/tasks-api';

const ext = vscode.extensions.getExtension<TasksExtensionExports>('HastyCapybara.tasks-for-markdown');
const tasks = (await ext!.activate()).getAPI(1, { extensionId: 'me.my-extension' });

const r = await tasks.query.run('not done\ndue before tomorrow\nsort by urgency');
tasks.events.onDidChangeStatus(({ before, after }) => console.log(after.description, before.status.name, '→', after.status.name));
if (tasks.features?.includes('notes.add')) await tasks.edit.addNote(r.tasks[0], 'Started');
```

| 제공 방식 | 대상 | |
|---|---|---|
| 확장 API `getAPI(1)` | 다른 VS Code/Cursor 확장 | `query`, `edit`(create, update, setStatus, postpone, addNote, batch…), `events`, `ui`, `features` / `info()`로 기능 확인 |
| 명령 `tasksmd.api.*` | 단축키, 매크로, 다른 언어로 만든 확장 | API의 모든 메서드를 JSON 인자를 받는 명령으로 |
| [`@hastycapybara/tasks-api`](https://www.npmjs.com/package/@hastycapybara/tasks-api) | TypeScript | 타입 정의만(실행 코드 없음) |
| [`@hastycapybara/tasks-cli`](https://www.npmjs.com/package/@hastycapybara/tasks-cli) | 터미널, 스크립트, CI, AI 에이전트 | `tasksmd query`, `add`, `done`, `note`, `info` … 와 MCP 서버 — 에디터 없이 |
| [`@hastycapybara/tasks-core`](https://www.npmjs.com/package/@hastycapybara/tasks-core) | Node 프로그램 | 파서, 쿼리 엔진, 반복 계산을 라이브러리로 |

기능은 추가만 되고 API 버전은 `1`로 유지되므로, 만든 확장은 업데이트 후에도 그대로 동작합니다. 쓰기는 기본적으로 호출자마다 한 번 확인받고(`tasksmd.api.writePolicy`), 오류는 `{ code, message }` 형태이며, 옛 내용으로 쓰려 하면 거절됩니다. [공개 API 문서](docs/api.md)를 참고하세요.

## 주요 기능

- **[Obsidian Tasks](https://publish.obsidian.md/tasks/)와 같은 문법** — 이모지 필드(📅 ⏳ 🛫 ➕ ✅ ❌ 🔁 🏁 🆔 ⛔, 우선순위 🔺⏫🔼🔽⏬)와 Dataview 인라인 필드(`[due:: 2026-09-25]`)를 모두 읽고, 쓸 포맷은 설정으로 고릅니다. 필드 순서까지 Obsidian과 동일하게 써서 파일을 서로 바꿔 써도 됩니다.
- **에디터 보조** — 태스크 줄 자동완성(`due`, `priority high`, `every week`, `next fri` / `3일 후` 같은 자연어 날짜), 커서 줄 위 CodeLens 액션, 호버 카드, 상대 날짜 힌트, 기한 초과 강조, Quick Fix가 있는 진단.
- **사이드바** — 오늘 / 예정 7일 / 기한 초과 / 진행 중 / 차단됨 / 미완료 전체 / 완료, 그룹·필터·체크박스, 저장된 쿼리와 그룹별 결과.
- **쿼리 언어** — ` ```tasks ` 블록(미리보기에서 렌더링), 저장된 쿼리, 시각적 쿼리 빌더에서 Obsidian Tasks 쿼리 언어를 그대로 사용. 필터, 불리언, 정렬, 그룹, 제한, 레이아웃, `explain`, 선택적으로 `filter/sort/group by function`.
- **반복·상태·의존성** — `🔁 every month on the last`, `when done`, 커스텀 체크박스 상태와 테마 프리셋(Minimal, ITS, Things), `🆔`/`⛔` 의존성과 차단 감지·순환 진단, Obsidian 긴급도 점수.
- **렌더 보기** — 노트를 미리보기처럼 렌더링하면서 체크박스 클릭·더블클릭 편집·링크 이동이 되는 상호작용 뷰. ```tasks 블록 결과가 그 자리에 표시되고, 상단 툴바로 마감일·생성일·긴급도 정렬과 오늘·이번 주·다음 주까지 범위, 그리고 `열 ▾`로 보일 열(마감일·생성일·나머지 필드)을 화면에서만 바꿀 수 있습니다(`Ctrl+Shift+R`). `Tasks: 렌더 보기를 기본 편집기로`로 .md의 기본 편집기로 삼으면 Cursor의 Preview 토글 대신 이 화면이 열립니다.
- **메모** — 태스크 아래 들여쓴 일반 글머리표가 메모입니다(Obsidian 호환). 렌더 보기에서 `💬`로 바로 남기고, 쿼리 결과·카드에는 `💬 2`로 표시되며, 편집 대화상자 더보기에서 고칠 수 있습니다.
- **추가 뷰** — 만들기/편집 대화상자, 칸반(드래그앤드롭), 캘린더(월간/주간, 전체 화면, 드래그로 일정 변경), 주간 통계, 완료 태스크 아카이브, 일일 알림.
- **AI와 자동화** — AI 에이전트용 MCP 서버, 공개 확장 API, 명령, CLI, 라이브러리([AI와 함께 쓰기](#ai와-함께-쓰기), [확장하기](#확장하기) 참고).
- **Cursor에서도 동작** — 안정 VS Code API만 사용, Open VSX에도 게시.

## 시작하기

1. 확장을 설치합니다 (Marketplace / Open VSX / `.vsix`).
2. 마크다운 파일이 있는 폴더를 엽니다. 액티비티 바에 **Tasks** 아이콘이 생깁니다.
3. 체크리스트 줄에 커서를 두고 `Ctrl+Shift+Enter`(macOS에서도 Ctrl 키)로 토글하거나, `Ctrl+Shift+C`로 편집 대화상자를 엽니다.
4. 노트에 ` ```tasks ` 블록을 쓰고 마크다운 미리보기를 엽니다:

````markdown
```tasks
not done
due before next week
sort by urgency
group by filename
```
````

## 명령 (명령 팔레트 → "Tasks:")

| 명령 | 기본 키 |
|---|---|
| 태스크 완료 토글 | `Ctrl+Shift+Enter` (태스크 줄에서, macOS에서도 Ctrl) |
| 태스크 만들기 / 편집 | `Ctrl+Shift+C` |
| 렌더 보기로 열기 / 마크다운 소스 편집 (전환) | `Ctrl+Shift+R` |
| 렌더 보기를 기본 편집기로 (설정/해제) | — |
| 태스크 빠른 검색 | `Cmd/Ctrl+Shift+;` |
| 상태 / 우선순위 / 마감일 / 예정일 / 시작일 / 반복 / 의존성 설정, 미루기 | — |
| 칸반 보드 / 캘린더 / 통계 / 쿼리 빌더 열기 | — |
| 완료 태스크 아카이브… | — |
| 쿼리 블록 삽입, 커서 위치 쿼리 결과 보기(에디터 옆 패널, 커서 따라가기), 커서 위치 쿼리 설명 | — |
| 상태 프리셋 불러오기…, 이 파일의 태스크 포맷 변환… | — |

## 설정 (`tasksmd.*`)

| 설정 | 기본값 | 설명 |
|---|---|---|
| `taskFormat` | `emoji` | 필드를 쓸 때 사용할 포맷 (`emoji` / `dataview`) |
| `globalFilter` | `""` | 이 문자열(예: `#task`)이 있는 줄만 태스크로 취급 |
| `include` / `exclude` / `respectGitignore` / `maxFileSizeKB` | | 스캔 범위 |
| `setDoneDate` / `setCancelledDate` / `setCreatedDate` | `true` / `true` / `false` | ✅ ❌ ➕ 자동 날짜 |
| `statuses` | 기본 4종 | 커스텀 체크박스 심볼·이름·다음 심볼·타입 |
| `recurrence.insertPosition` / `idHandling` / `copyDependsOn` / `removeScheduledDate` | `above` / `keep` / `true` / `false` | 다음 회차 생성 규칙 |
| `decorations.*`, `codeLens.mode`, `autoSuggest.*` | | 에디터 보조 |
| `preview.enabled` / `preview.renderBadges` | `true` | 마크다운 미리보기 렌더링 |
| `savedQueries` | `[]` | 저장된 쿼리 (`.tasks/queries/*.md`도 함께 읽음) |
| `query.allowFunctions` | `false` | 쿼리의 `by function` JavaScript 허용 (신뢰된 워크스페이스만) |
| `editModal.accessKeys` / `editModal.hiddenFields` | `true` / `[]` | 편집 대화상자 |
| `notifications.*` | 켜짐, `09:00`, 1일 | 일일 요약·마감 임박 알림, OS 알림 |
| `archive.file` / `afterDays` / `linkStyle` | `Archive.md` / 30 / `wiki` | 아카이브 명령 |
| `calendar.newTaskFile` | `""` | 캘린더에서 만든 태스크를 넣을 파일 |
| `query.showTree` | `true` | 쿼리 결과를 트리로(하위 태스크를 부모 밑에). 블록별 `show tree` / `hide tree` |
| `decorations.strikeCancelled` | `true` | 취소된 태스크(`[-]`)에 에디터 취소선. 완료(`[x]`)는 `decorations.strikeDone`(기본 꺼짐) |
| `requireDueDate` | `true` | 마감일 없는 새 태스크 거부(대화상자·API·CLI·MCP) + 에디터 경고 |
| `api.writePolicy` | `confirm` | 다른 확장이 API로 쓸 때: 확인(`confirm`) / 허용 / 거부 |
| `rendered.maxWidth` | `0` | 렌더 보기 본문 열 최대 폭(px). 0 = 창 전체 폭(기본). 800 등을 주면 가운데 열로 제한 |
| `rendered.sourceWhenNoTasks` | `true` | 렌더 보기가 기본 편집기일 때 태스크 없는 노트는 텍스트 편집기로 |
| `rendered.fieldsAlign` | `columns` | 렌더 보기 태스크 줄의 필드 배치: 열(`columns`: 상태·설명+우선순위+태그·마감·작성일·나머지) / 오른쪽 끝(`right`) / 설명 뒤(`inline`) |
| `rendered.fontSize` / `rendered.lineHeight` | `14.5` / `1.6` | 렌더 보기 본문 글자 크기(px)와 줄 간격 |
| `rendered.fieldStyle` | `plain` | 렌더 보기 태스크 줄의 필드 표시: 원문처럼(`plain`) / 배지(`badges`) |
| `calendar.fontSize` | `13` | 캘린더 칸의 태스크 글자 크기(px) |
| `calendar.fullScreen` | `maximize` | 전체 화면 버튼: 에디터 그룹 최대화만(`maximize`) / 창도 전체 화면(`window`) |
| `updateCheckUrl` | `""` | `.vsix` 설치본용 `latest.json` 위치 |

## 마크다운 미리보기에 관해

내장 미리보기는 태스크 줄을 체크박스와 뱃지로, ` ```tasks ` 블록을 실시간 결과로 렌더링하고 태스크가 바뀌면 자동 갱신됩니다. 다만 클래식 미리보기는 클릭을 확장으로 전달할 수 없어서 체크박스는 표시 전용입니다 — 토글은 에디터, 사이드바, 칸반에서 하세요.

## 문서

- [사용자 가이드](docs/user-guide.md) · [의존성(🆔/⛔) 이해하기](docs/dependencies-guide.md) · 편집기 밖에서는 [npm 라이브러리 `@hastycapybara/tasks-core`](packages/core/README.md)와 [CLI `tasksmd`](packages/cli/README.md)(MCP 서버 포함, Claude Code 연동은 docs/api.md 8절)
- [요구사항](docs/requirements.md) · [설계](docs/design.md) · [개발 체크리스트](docs/Tasks.md) · [성능](docs/perf.md) · [릴리스 절차](docs/release.md) · [배포 가이드라인](docs/publishing-guide.md) · [실패 기록(포스트모템)](docs/postmortems/README.md) · [공개 전 내부 개발 이력](docs/history-internal.md) · [수동 점검·사용자 작업 안내](docs/manual-checklist.md) · [공개 API](docs/api.md) · [API 계획](docs/api-plan.md)

## 개발

```bash
pnpm install
pnpm build              # 확장 + 웹뷰 번들
pnpm test               # 단위 테스트 (vitest)
pnpm test:integration   # VS Code를 띄워 통합 테스트
pnpm package            # production 빌드 + .vsix + latest.json
```

VS Code/Cursor에서 `F5`를 누르면 확장이 로드된 개발용 창이 열립니다.

## 감사의 말

이 확장은 [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks)가 없었다면 존재하지 않았습니다. 태스크 문법, 쿼리 언어, 핵심 로직 일부(파서, 반복, 긴급도)를 그 프로젝트에서 이식했고(MIT 라이선스), 기능 하나하나의 동작도 그 문서를 기준으로 맞췄습니다. 플러그인을 처음 만든 Martin Schenck, 오랫동안 이끌어 온 Clare Macrae, 그리고 모든 기여자께 깊이 감사드립니다.

- Obsidian을 쓰신다면 원본 플러그인을 써 보세요: [Tasks 문서](https://publish.obsidian.md/tasks/) · [저장소](https://github.com/obsidian-tasks-group/obsidian-tasks)
- 원본 프로젝트를 후원할 수 있습니다: [GitHub Sponsors (Clare Macrae)](https://github.com/sponsors/claremacrae)
- 이식한 코드와 라이선스 고지는 [NOTICE.md](NOTICE.md)에 있습니다.

이 프로젝트는 Obsidian Tasks 프로젝트나 Obsidian(Dynalist Inc.)과 관련이 없으며, 그들의 보증을 받지 않았습니다.

## 라이선스

MIT
