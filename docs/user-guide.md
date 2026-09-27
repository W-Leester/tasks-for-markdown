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

**마감일 필수(기본 켜짐).** `tasksmd.requireDueDate`가 켜져 있으면 만들기 대화상자·API·CLI·MCP가 📅 없는 새 태스크를 거부합니다. 에디터에 직접 `- [ ]`를 치는 것까지 막을 수는 없으므로, 대신 마감일 없는 미완료 태스크에 경고 밑줄을 긋고 전구(빠른 수정)에서 `마감일 설정…` 또는 `오늘 날짜 추가`를 고를 수 있게 합니다. Problems 패널에서 한꺼번에 볼 수 있습니다.

**의존성(🆔/⛔)**은 별도 안내 [dependencies-guide.md](dependencies-guide.md)에 예시와 그림으로 정리했습니다.

## 3. 사이드바

액티비티 바의 **Tasks** 아이콘:

- **태스크**: 오늘 / 예정 7일 / 기한 초과 / 진행 중 / 차단됨 / 미완료 전체 / 완료 30일. 툴바에서 그룹(파일·마감·우선순위·태그·헤딩·상태), 필터, 새로 고침.
- **저장된 쿼리**: `.tasks/queries/*.md` 파일과 `tasksmd.savedQueries` 설정. `+`로 새 쿼리 파일 생성, 우클릭으로 설명/편집/삭제/빌더에서 열기.
- **칸반**: 사이드바 안(탭 형태) 또는 `Tasks: 칸반 보드 열기`로 넓게. 컬럼 기준 상태/마감/우선순위/파일, 드래그로 이동하면 해당 필드가 바뀝니다.

상태바의 `☑ 57 · 오늘 4 · 초과 2`를 클릭하면 사이드바가 열립니다.

## 4. 쿼리

노트에 ` ```tasks ` 블록을 쓰면 결과를 세 곳에서 볼 수 있습니다.

- **렌더 보기** (`Ctrl+Shift+R`, 에디터 제목 표시줄의 미리보기 아이콘, `Tasks: 렌더 보기로 열기`) — 노트 전체를 미리보기처럼 렌더링하되 **상호작용이 됩니다.** 체크박스를 누르면 완료 전환, 태스크를 더블클릭하거나 줄에 마우스를 올려 나오는 `✎`를 누르면 편집 대화상자, `⏩`는 연기, 링크·백링크는 대상 파일의 해당 줄로 이동합니다. ```tasks 블록 자리에 결과가 표시되고 파일·인덱스가 바뀌면 자동 갱신됩니다. 모양은 Cursor의 Preview와 같은 계열(본문 14px, 800px 중앙 열, 같은 제목·코드 크기, 태스크 줄의 필드는 원문처럼 이모지+값으로 표시하고 지난 마감만 붉게, 상대 날짜는 툴팁)이고, 배지 형태를 원하면 `tasksmd.rendered.fieldStyle`을 `badges`로 바꿉니다. 날짜·우선순위 같은 필드는 기본으로 줄의 **오른쪽 끝**에 모아 보여 주고(`tasksmd.rendered.fieldsAlign: right`), 원문처럼 설명 바로 뒤에 두려면 `inline`. 본문 열은 기본으로 창 전체 폭을 쓰고, 읽기 편한 가운데 열을 원하면 `tasksmd.rendered.maxWidth`에 800 같은 px 값을 주면 됩니다. 쿼리 결과 상자도 이 폭을 따릅니다. 글자 크기와 줄 간격은 `tasksmd.rendered.fontSize`(기본 14.5px), `tasksmd.rendered.lineHeight`(기본 1.6)로 조절하며 바꾸는 즉시 반영됩니다. 쿼리 블록 결과는 항상 배지입니다. 모양은 오른쪽 위의 `렌더 | 소스` 토글(또는 제목 표시줄 아이콘, `Ctrl+Shift+R`)로 같은 탭 자리에서 텍스트 편집기와 오갑니다. 파일 탭에서 우클릭 → `Open With…` → `Tasks: 렌더 보기`로도 엽니다. **Cursor의 "Preview" 토글 대신 이것을 쓰세요.** 항상 이 보기로 열리게 하려면 settings.json에 `"workbench.editorAssociations": { "*.md": "tasksmd.rendered" }`를 넣습니다(본문 편집은 소스 편집으로 전환해야 합니다).
- **쿼리 결과 패널** — 블록 위 CodeLens `▶ 결과 보기`(또는 커서를 블록 안에 두고 `Tasks: 커서 위치 쿼리 결과 보기`)를 누르면 에디터 옆에 결과 목록이 열립니다. "커서 따라가기"가 켜져 있으면 커서를 다른 블록으로 옮기거나 블록을 고칠 때 자동으로 갱신됩니다. 카드 클릭은 편집, 더블클릭은 원본, 체크박스는 완료 전환입니다. 어떤 편집기에서든 동작합니다.
  - **기본 편집기로 쓰기(권장, Cursor)**: `Tasks: 렌더 보기를 기본 편집기로`를 실행하면 .md 파일이 처음부터 렌더 보기로 열립니다. 이렇게 하면 Cursor의 "Preview | Markdown" 토글은 더 이상 나타나지 않고 우리 `렌더 | 소스` 토글만 보입니다(Cursor 토글은 Cursor 자체 편집기의 일부라 확장이 바꿀 수 없어서, 그 편집기를 기본에서 빼는 방식입니다). 태스크가 하나도 없는 노트(README, 문서)는 자동으로 텍스트 편집기로 열립니다(`tasksmd.rendered.sourceWhenNoTasks`). 처음 렌더 보기를 열 때 한 번 물어보고, 같은 명령에서 언제든 되돌립니다. 이 방식에서는 본문 글을 고칠 때 소스로 넘어가야 하며 Cursor의 WYSIWYG 본문 편집은 쓰지 않게 됩니다.
  - **정렬·보기 툴바**: 렌더 보기 위쪽의 `정렬`(문서 순·마감일·생성일·우선순위·긴급도)과 `보기`(전체·미완료만·오늘까지·이번 주·다음 주까지·기한 초과)는 **화면만** 바꿉니다. 파일은 그대로이고, 각 목록 안에서 태스크만 재배열되며 하위 태스크는 부모를 따라갑니다. 범위에 안 맞는 줄은 숨기고 오른쪽에 "n개 숨김"을 표시합니다(하위가 맞으면 부모는 흐리게 남음). 선택은 파일별로 기억합니다. 영구적인 목록이 필요하면 노트에 ```tasks 블록을 쓰세요.
- **VS Code 마크다운 미리보기**(`Markdown: Open Preview to the Side`, 키 `Cmd/Ctrl+K V`) — 블록 자리에 결과가 표시 전용으로 렌더링됩니다. **Cursor의 "Preview" 토글(WYSIWYG 편집기)은 확장 렌더러를 쓰지 않으므로 블록이 코드로만 보입니다.** Cursor에서는 `Cmd+Shift+V`가 이 토글에 묶여 있어 VS Code 미리보기가 열리지 않으니, `Cmd+K V`나 명령 팔레트를 쓰세요. 그래도 안 되면 위 패널을 쓰세요.

`Tasks: 쿼리 블록 삽입`, `Tasks: 커서 위치 쿼리 설명`(CodeLens `? 설명`)도 있습니다.

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

## 6. 키보드로 쓰기

| 화면 | 키 |
|---|---|
| 에디터 | `Cmd/Ctrl+Enter` 완료 토글 · `Ctrl+Shift+C` 만들기/편집 · `Ctrl+Shift+R` 렌더 보기 ↔ 소스 |
| 편집 대화상자 | `Tab`으로 이동, 액세스 키(설정 `editModal.accessKeys`), `Esc` 닫기 |
| 칸반 | 카드에 포커스: `Enter` 편집 · `Space` 완료 전환 · **`Alt+←/→` 옆 컬럼으로 이동**(드래그 대신). 이동 결과는 스크린 리더에 안내 |
| 캘린더 | 날짜 칸: `←/→` 하루, `↑/↓` 한 주(가장자리를 넘으면 월/주 전환) · `Enter` 그 날짜에 새 태스크 · 항목: `Enter` 편집 · `Esc` 전체 화면 해제 |
| 렌더 보기 | `Tab`으로 체크박스·버튼 이동, `Space`로 체크. 줄에 포커스가 있으면 `✎ ⏩` 버튼이 보임 |
| 쿼리 결과 패널 | 카드: `Enter` 편집 · `Space` 완료 전환 |

## 7. 자주 묻는 질문

- **Obsidian과 같은 폴더를 써도 되나요?** 문법이 같고 필드 순서도 동일하게 쓰므로 호환됩니다. 다만 이 확장의 공식 지원 범위는 전용 폴더입니다.
- **미리보기에서 체크가 안 돼요.** 의도된 제한입니다(4장). 에디터에서 `Cmd/Ctrl+Enter`를 쓰거나 쿼리 결과 패널의 체크박스를 쓰세요.
- **Cursor에서 쿼리 블록이 그냥 코드로 보여요.** 오른쪽 위 "Preview | Markdown" 토글의 Preview는 Cursor 자체 WYSIWYG 편집기라 확장이 개입할 수 없고, `Cmd+Shift+V`도 이 토글에 묶여 있습니다. "Markdown"으로 전환한 뒤 블록 위 `▶ 결과 보기` CodeLens로 결과 패널을 열거나, `Cmd+K V`(Markdown: Open Preview to the Side)로 VS Code 미리보기를 여세요.
- **`.vsix`로 설치했는데 업데이트는?** `tasksmd.updateCheckUrl`에 사내 `latest.json` 경로를 넣으면 하루 1회 새 버전을 알려줍니다.
- **로그는 어디에?** `Tasks: 로그 보기` (출력 채널 "Tasks for Markdown").
