# Tasks for Markdown

**VS Code**와 **Cursor**에서 쓰는 Obsidian Tasks 호환 할 일 관리 확장입니다. (English: [docs/README.en.md](docs/README.en.md))

할 일은 노트 안의 체크리스트 줄 그대로 남습니다 — 별도 데이터베이스도, 종속도 없습니다:

```markdown
- [ ] 보고서 작성 #업무 ⏫ 🔁 every week 🛫 2026-09-20 ⏳ 2026-09-22 📅 2026-09-25
- [x] 회의록 정리 ✅ 2026-09-21
```

확장은 워크스페이스의 모든 `- [ ]` 줄을 인덱싱해서 에디터, 사이드바, 칸반 보드, 캘린더, 마크다운 미리보기 어디서든 보고·검색하고·완료할 수 있게 합니다. 완료하면 파일의 그 줄이 수정됩니다(완료일 추가, 반복 태스크는 다음 회차 생성).

## 주요 기능

- **[Obsidian Tasks](https://publish.obsidian.md/tasks/)와 같은 문법** — 이모지 필드(📅 ⏳ 🛫 ➕ ✅ ❌ 🔁 🏁 🆔 ⛔, 우선순위 🔺⏫🔼🔽⏬)와 Dataview 인라인 필드(`[due:: 2026-09-25]`)를 모두 읽고, 쓸 포맷은 설정으로 고릅니다. 필드 순서까지 Obsidian과 동일하게 써서 파일을 서로 바꿔 써도 됩니다.
- **에디터 보조** — 태스크 줄 자동완성(`due`, `priority high`, `every week`, `next fri` / `3일 후` 같은 자연어 날짜), 커서 줄 위 CodeLens 액션, 호버 카드, 상대 날짜 힌트, 기한 초과 강조, Quick Fix가 있는 진단.
- **사이드바** — 오늘 / 예정 7일 / 기한 초과 / 진행 중 / 차단됨 / 미완료 전체 / 완료, 그룹·필터·체크박스, 저장된 쿼리와 그룹별 결과.
- **쿼리 언어** — ` ```tasks ` 블록(미리보기에서 렌더링), 저장된 쿼리, 시각적 쿼리 빌더에서 Obsidian Tasks 쿼리 언어를 그대로 사용. 필터, 불리언, 정렬, 그룹, 제한, 레이아웃, `explain`, 선택적으로 `filter/sort/group by function`.
- **반복·상태·의존성** — `🔁 every month on the last`, `when done`, 커스텀 체크박스 상태와 테마 프리셋(Minimal, ITS, Things), `🆔`/`⛔` 의존성과 차단 감지·순환 진단, Obsidian 긴급도 점수.
- **렌더 보기** — 노트를 미리보기처럼 렌더링하면서 체크박스 클릭·더블클릭 편집·링크 이동이 되는 상호작용 뷰. ```tasks 블록 결과가 그 자리에 표시됩니다(`Ctrl+Shift+R`). Cursor의 Preview 토글이 확장 렌더러를 쓰지 않는 문제를 대신합니다.
- **추가 뷰** — 만들기/편집 대화상자, 칸반(드래그앤드롭), 캘린더(월간/주간, 전체 화면, 드래그로 일정 변경), 주간 통계, 완료 태스크 아카이브, 일일 알림.
- **Cursor에서도 동작** — 안정 VS Code API만 사용, Open VSX에도 게시.

## 시작하기

1. 확장을 설치합니다 (Marketplace / Open VSX / `.vsix`).
2. 마크다운 파일이 있는 폴더를 엽니다. 액티비티 바에 **Tasks** 아이콘이 생깁니다.
3. 체크리스트 줄에 커서를 두고 `Cmd/Ctrl+Enter`로 토글하거나, `Ctrl+Shift+C`로 편집 대화상자를 엽니다.
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
| 태스크 완료 토글 | `Cmd/Ctrl+Enter` (태스크 줄에서) |
| 태스크 만들기 / 편집 | `Ctrl+Shift+C` |
| 렌더 보기로 열기 / 마크다운 소스 편집 (전환) | `Ctrl+Shift+R` |
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
| `api.writePolicy` | `confirm` | 다른 확장이 API로 쓸 때: 확인(`confirm`) / 허용 / 거부 |
| `rendered.fontSize` / `rendered.lineHeight` | `14.5` / `1.6` | 렌더 보기 본문 글자 크기(px)와 줄 간격 |
| `rendered.fieldStyle` | `plain` | 렌더 보기 태스크 줄의 필드 표시: 원문처럼(`plain`) / 배지(`badges`) |
| `calendar.fontSize` | `13` | 캘린더 칸의 태스크 글자 크기(px) |
| `calendar.fullScreen` | `maximize` | 전체 화면 버튼: 에디터 그룹 최대화만(`maximize`) / 창도 전체 화면(`window`) |
| `updateCheckUrl` | `""` | `.vsix` 설치본용 `latest.json` 위치 |

## API와 자동화

다른 프로그램에서 태스크를 읽고 쓰는 통로가 네 가지 있습니다. 상세는 [docs/api.md](docs/api.md).

| 어디서 | 방법 |
|---|---|
| 다른 VS Code/Cursor 확장 | `getExtension('hastycapybara.tasks-for-markdown').exports.getAPI(1, { extensionId })` → `query.run(...)`, `edit.setStatus(...)` 등. 타입은 확장에 동봉된 `dist/api-types/api/types.d.ts` |
| 키바인딩·매크로 | 명령 `tasksmd.api.<ns>.<method>` (예: `tasksmd.api.query.run` + `{ "query": "due today" }`) |
| 터미널·스크립트·CI | `npx @hastycapybara/tasks-cli query "not done\ndue before today" --root ~/notes` — 편집기 없이 동작 |
| AI 에이전트 (Claude Code 등) | `claude mcp add tasks -- npx -y @hastycapybara/tasks-cli mcp --root "$PWD"` 후 말로 지시 |

```ts
// 다른 확장에서
const tasks = (await ext.activate()).getAPI(1, { extensionId: 'my.extension' });
const r = await tasks.query.run('not done\nhappens on or before today');   // 사이드바 "오늘"과 같은 결과
await tasks.edit.setStatus({ path: r.tasks[0].path, line: r.tasks[0].line, expectedText: r.tasks[0].originalMarkdown }, 'x');
```

쓰기는 기본 설정에서 호출자마다 한 번 확인창이 뜹니다(`tasksmd.api.writePolicy`). 값은 전부 JSON이고 오류는 `{ code, message }`입니다. Node 라이브러리만 필요하면 `@hastycapybara/tasks-core`.

## 마크다운 미리보기에 관해

내장 미리보기는 태스크 줄을 체크박스와 뱃지로, ` ```tasks ` 블록을 실시간 결과로 렌더링하고 태스크가 바뀌면 자동 갱신됩니다. 다만 클래식 미리보기는 클릭을 확장으로 전달할 수 없어서 체크박스는 표시 전용입니다 — 토글은 에디터, 사이드바, 칸반에서 하세요.

## 문서

- [사용자 가이드](docs/user-guide.md) · 편집기 밖에서는 [npm 라이브러리 `@hastycapybara/tasks-core`](packages/core/README.md)와 [CLI `tasksmd`](packages/cli/README.md)(MCP 서버 포함, Claude Code 연동은 docs/api.md 8절)
- [요구사항](docs/requirements.md) · [설계](docs/design.md) · [개발 체크리스트](docs/Tasks.md) · [성능](docs/perf.md) · [릴리스 절차](docs/release.md) · [1.0 이후 변경 기록](docs/post-release-changes.md) · [수동 점검·사용자 작업 안내](docs/manual-checklist.md) · [공개 API](docs/api.md) · [API 계획](docs/api-plan.md)

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

태스크 문법, 쿼리 언어, 핵심 로직 일부(파서, 반복, 긴급도)는 [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks)(MIT)에서 이식했습니다. [NOTICE.md](NOTICE.md)를 참고하세요. 이 프로젝트는 Obsidian과 관련이 없습니다.

## 라이선스

MIT
