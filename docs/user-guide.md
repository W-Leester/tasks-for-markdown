# Tasks for Markdown 사용자 가이드

Obsidian Tasks 플러그인과 같은 문법으로 VS Code / Cursor 안에서 마크다운 할 일을 관리합니다. 별도 저장소 없이 노트의 `- [ ]` 줄이 곧 데이터입니다.

## 1. 태스크 쓰기

```markdown
- [ ] 보고서 작성 #업무 ⏫ 🔁 every week 🛫 2026-09-20 ⏳ 2026-09-22 📅 2026-09-25
- [x] 회의록 정리 ✅ 2026-09-21
- [-] 취소된 일 ❌ 2026-09-20
```

| 필드 | 이모지 | Dataview |
|---|---|---|
| 생성 / 시작 / 예정 / 마감 | ➕ 🛫 ⏳ 📅 `YYYY-MM-DD` | `[created:: ]` `[start:: ]` `[scheduled:: ]` `[due:: ]` |
| 완료 / 취소 | ✅ ❌ (자동) | `[completion:: ]` `[cancelled:: ]` |
| 우선순위 | 🔺 ⏫ 🔼 🔽 ⏬ | `[priority:: highest…lowest]` |
| 반복 | 🔁 every day / every week on monday / every month on the 15th / every month on the last / every year … `when done` | `[repeat:: ]` |
| 의존성 | 🆔 abc123 / ⛔ abc123,def456 | `[id:: ]` `[dependsOn:: ]` |
| 완료 시 | 🏁 delete | `[onCompletion:: delete]` |

두 포맷 모두 읽으며, 쓸 때는 `tasksmd.taskFormat` 설정을 따릅니다. 필드 순서는 Obsidian과 동일하게 정규화됩니다.

**자동완성**: 태스크 줄에서 스페이스를 치면 제안이 뜹니다. `due` → 📅 뒤에 `tomorrow`, `next fri`, `3일 후`, `10월 6일` 같은 자연어를 치면 날짜로 바뀝니다. `pri` → 우선순위, `every` → 반복, `id` → 자동 발급 ID.

## 2. 편집

| 동작 | 방법 |
|---|---|
| 완료/다시 열기 | 태스크 줄에서 `Cmd/Ctrl+Enter`, 사이드바 체크박스, CodeLens `✔ Done`, 호버 카드 |
| 상태 순환 | 토글은 상태의 "다음 심볼"로 이동합니다 (`[ ]`→`[x]`→`[ ]`, `[/]`→`[x]`). 완료 타입이 되면 ✅ 날짜가 붙고, 벗어나면 제거됩니다 |
| 편집 대화상자 | `Ctrl+Shift+C` — 설명·우선순위·반복·날짜(자연어)·상태·의존성·완료 시 동작, 아래에 결과 줄 미리보기 |
| 개별 필드 | 우클릭 › Tasks › 우선순위/마감일/예정일/시작일/반복/의존성/미루기, 또는 CodeLens 클릭 |
| 여러 줄 | 여러 줄을 선택하고 `Cmd/Ctrl+Enter` |

반복 태스크를 완료하면 다음 회차가 **위 줄**에 생깁니다 (`tasksmd.recurrence.insertPosition`). 마감일 → 예정일 → 시작일 순으로 기준을 잡고 나머지 날짜는 간격을 유지합니다. `when done`이면 완료한 날짜 기준입니다.

## 3. 사이드바

액티비티 바의 **Tasks** 아이콘:

- **태스크**: 오늘 / 예정 7일 / 기한 초과 / 진행 중 / 차단됨 / 미완료 전체 / 완료 30일. 툴바에서 그룹(파일·마감·우선순위·태그·헤딩·상태), 필터, 새로 고침.
- **저장된 쿼리**: `.tasks/queries/*.md` 파일과 `tasksmd.savedQueries` 설정. `+`로 새 쿼리 파일 생성, 우클릭으로 설명/편집/삭제/빌더에서 열기.
- **칸반**: 사이드바 안(탭 형태) 또는 `Tasks: 칸반 보드 열기`로 넓게. 컬럼 기준 상태/마감/우선순위/파일, 드래그로 이동하면 해당 필드가 바뀝니다.

상태바의 `☑ 57 · 오늘 4 · 초과 2`를 클릭하면 사이드바가 열립니다.

## 4. 쿼리

노트에 ` ```tasks ` 블록을 쓰면 **마크다운 미리보기**에서 결과가 렌더링됩니다. `Tasks: 쿼리 블록 삽입`, `Tasks: 커서 위치 쿼리 설명`도 있습니다.

````markdown
```tasks
not done
due before next week
(priority is high) OR (tags include #급함)
path does not include Archive
sort by urgency
group by filename
limit 50
short mode
```
````

- 필터: `done` / `not done`, `status.type is IN_PROGRESS`, `due|scheduled|start|done|created|cancelled|happens (on|before|after|on or before|on or after) <날짜>`, `due this week` / `in 2026-W40` / `2026-10` / `2026-Q4`, `has due date`, `due date is invalid`, `priority is above medium`, `is recurring`, `is blocked`, `is blocking`, `has id`, `tags include #x`, `description includes …`, `… regex matches /…/i`, `heading|path|folder|filename|root includes …`, `exclude sub-items`
- 불리언: `(a) AND (b)`, `OR`, `NOT`, `AND NOT`, `OR NOT`, `XOR`, 괄호 중첩
- `sort by <필드> [reverse]`, `group by <필드> [reverse]`, `limit N`, `limit groups N`
- 레이아웃: `hide|show priority|due date|…|backlink|task count`, `short mode`, `explain`
- `{{query.file.path}}` 등 플레이스홀더, `#` 주석, 줄 끝 `\`로 이어쓰기
- `filter/sort/group by function <JS>`: `tasksmd.query.allowFunctions`를 켜고 신뢰된 워크스페이스에서만

미리보기는 표시 전용입니다(클래식 미리보기는 확장으로 클릭을 보낼 수 없음). 체크는 에디터·사이드바·칸반에서 하세요.

**쿼리 빌더**(`Tasks: 쿼리 빌더 열기`): 드롭다운으로 필터·정렬·그룹을 조립하면 텍스트가 생성되고, 설명과 일치 수가 실시간으로 보입니다. 파일 또는 설정에 저장하거나 노트에 삽입할 수 있습니다.

## 5. 그 밖의 뷰와 기능

- **캘린더** (`Tasks: 캘린더 열기`): 월간/주간, 📅⏳🛫 표시 토글, 다른 날짜로 드래그하면 날짜 변경, 빈 칸 더블클릭으로 새 태스크(`tasksmd.calendar.newTaskFile`).
  - **글자 크기**: 칸 안의 태스크 글자는 `tasksmd.calendar.fontSize`(기본 13px, 9~24)로 조절합니다.
  - **전체 화면**: 툴바 오른쪽의 `⤢ 전체 화면` 버튼(또는 `Tasks: 캘린더 열기(전체 화면)`, `Tasks: 캘린더: 전체 화면 전환` 명령)을 누르면 사이드바·하단 패널이 숨고 캘린더의 에디터 그룹이 최대화됩니다. 셀이 커지는 만큼 하루에 더 많은 태스크가 보입니다. `Esc` 또는 같은 버튼으로 되돌립니다(사이드바는 다시 열립니다). `tasksmd.calendar.fullScreen`을 `window`로 두면 창 자체도 전체 화면으로 전환됩니다.
- **통계** (`Tasks: 통계 열기`): 최근 N주 완료/생성/기한 초과/잔량, 태그·폴더 필터.
- **아카이브** (`Tasks: 완료 태스크 아카이브…`): N일 이상 지난 완료 태스크를 미리보기에서 고른 뒤 `Archive.md`로 이동(원본 링크 포함).
- **알림**: 시작 시·지정 시각에 오늘/초과 요약, 마감 임박 묶음 알림(스누즈), OS 알림.
- **빠른 검색** `Cmd/Ctrl+Shift+;`.
- **커스텀 상태**: `tasksmd.statuses` 또는 `Tasks: 상태 프리셋 불러오기…`(Minimal / ITS / Things). 동작은 심볼이 아니라 타입(TODO / IN_PROGRESS / ON_HOLD / DONE / CANCELLED / NON_TASK)을 따릅니다.
- **진단**: 잘못된 날짜, 없는 ID, 순환 의존성, 잘못된 반복 규칙, 날짜 없는 반복 → Problems 패널 + Quick Fix.
- **포맷 변환**: `Tasks: 이 파일의 태스크 포맷 변환…`.

## 6. 자주 묻는 질문

- **Obsidian과 같은 폴더를 써도 되나요?** 문법이 같고 필드 순서도 동일하게 쓰므로 호환됩니다. 다만 이 확장의 공식 지원 범위는 전용 폴더입니다.
- **미리보기에서 체크가 안 돼요.** 의도된 제한입니다(4장). 에디터에서 `Cmd/Ctrl+Enter`를 쓰세요.
- **`.vsix`로 설치했는데 업데이트는?** `tasksmd.updateCheckUrl`에 사내 `latest.json` 경로를 넣으면 하루 1회 새 버전을 알려줍니다.
- **로그는 어디에?** `Tasks: 로그 보기` (출력 채널 "Tasks for Markdown").
