# 변경 이력

## 1.5.1 — 2026-09-27

### 변경
- 렌더 보기에서 태스크 줄 사이에 아주 옅은 구분선을 넣었습니다(본문 목록과 쿼리 결과 모두). 필드가 여러 줄로 넘어가도 어느 태스크의 것인지 구분됩니다.

## 1.5.0 — 2026-09-27

### 변경
- `tasksmd.requireDueDate` 기본값이 **켜짐**입니다. 만들기 대화상자·API·CLI·MCP가 마감일 없는 새 태스크를 거부하고, 에디터는 마감일 없는 미완료 태스크에 경고를 표시합니다. 끄려면 `false`.
- 쿼리 결과 행의 배지 순서: 우선순위 → **백링크(파일 › 제목)** → 반복 → 완료 시 동작 → ID → 의존 → 생성일 → **취소일** → 시작일 → 예정일 → 마감일 → 완료일.

## 1.4.3 — 2026-09-27

### 변경
- 렌더 보기가 기본으로 창 전체 폭을 씁니다(`tasksmd.rendered.maxWidth` 기본값 800 → 0). 가운데 열로 제한하고 싶을 때만 px 값을 줍니다.

## 1.4.2 — 2026-09-27

### 추가
- `tasksmd.rendered.maxWidth`(기본 800px, 0이면 전체 폭): 렌더 보기 본문 열과 쿼리 결과 상자의 최대 폭. 변경 즉시 반영.

## 1.4.1 — 2026-09-27

### 수정
- 렌더 보기에서 완료 태스크의 취소선이 목록 종류(항목 사이 빈 줄 유무)에 따라 있다가 없다가 하던 문제. 이제 완료·취소 태스크는 취소선 없이 흐린 색으로만 표시합니다.
- 보기 툴바의 "오늘(초과 포함)"을 "오늘까지(초과 포함)"로 바꿨습니다.

## 1.4.0 — 2026-09-27

### 추가
- **렌더 보기를 기본 편집기로** (`Tasks: 렌더 보기를 기본 편집기로`): .md 파일이 처음부터 렌더 보기로 열리도록 `workbench.editorAssociations`를 설정·해제합니다. 처음 렌더 보기를 열 때 한 번 제안합니다. Cursor의 "Preview | Markdown" 토글은 Cursor 편집기의 일부라 확장이 바꿀 수 없으므로, 그 편집기를 기본에서 빼서 우리 `렌더 | 소스` 토글만 보이게 하는 방식입니다. 태스크가 없는 노트는 텍스트 편집기로 엽니다(`tasksmd.rendered.sourceWhenNoTasks`).
- **렌더 보기 정렬·보기 툴바**: 마감일·생성일·우선순위·긴급도 정렬과 전체·미완료만·오늘·이번 주·다음 주까지·기한 초과 범위. 화면만 바꾸고 파일은 건드리지 않으며 파일별로 기억합니다.

### 내부
- 미리보기 플러그인이 태스크 줄에 `data-tfm-due/created/happens/priority/urgency/done` 속성을 붙입니다.

## 1.3.3 — 2026-09-26

### 추가
- 설정 `tasksmd.requireDueDate`(기본 꺼짐). 켜면 만들기 대화상자·공개 API·CLI `add`·MCP `tasks_create`가 마감일 없는 새 태스크를 거부하고, 에디터는 마감일 없는 미완료 태스크에 경고와 빠른 수정(`마감일 설정…`, `오늘 날짜 추가`)을 제공합니다.

## 1.3.2 — 2026-09-26

### 변경
- 렌더 보기에서 태스크 줄의 필드(날짜·우선순위·반복 등)를 설명과 분리해 줄의 오른쪽 끝에 정렬합니다. 설명이 길면 필드가 다음 줄 오른쪽으로 내려갑니다. 원문식 배치는 `tasksmd.rendered.fieldsAlign: "inline"`. 쿼리 결과 행에도 같은 배치가 적용됩니다.
- 미리보기 플러그인이 태스크 설명을 `span.tfm-desc`로 감쌉니다(스타일링용, 내용 변화 없음).

## 1.3.1 — 2026-09-26

### 변경
- 명령 팔레트·뷰 제목이 편집기 표시 언어가 영어여도 한글로 검색되도록 기본 제목을 "한글 (English)" 형식으로 바꿨습니다(예: `Tasks: 로그 보기 (Show logs)`). 한국어 표시 언어에서는 한글만 보입니다.

## 1.3.0 — 2026-09-26

### API
- **MCP 서버 `tasksmd mcp`** (`@hastycapybara/tasks-cli`): Claude Code·Cursor·Claude Desktop 같은 AI 에이전트가 쓰는 도구 10개(`tasks_query`, `tasks_explain_query`, `tasks_get`, `tasks_list_saved_queries`, `tasks_create`, `tasks_update`, `tasks_set_status`, `tasks_postpone`, `tasks_remove`, `tasks_syntax_reference`)와 문법 리소스 `tasks://syntax`. 등록: `claude mcp add tasks -- npx -y @hastycapybara/tasks-cli mcp --root "$PWD"`.
- CLI에 `saved`(저장된 쿼리 목록) 추가, `tasksmd.savedQueries` 설정 읽기.

## 1.2.0 — 2026-09-26

### API
- **npm 라이브러리 `@hastycapybara/tasks-core`** (packages/core): 확장의 핵심(`src/core`)을 CommonJS + 타입으로 내보냅니다. 파서·직렬화·날짜·반복·쿼리 엔진·인덱스·DTO·HTML 렌더·통계.
- **CLI `tasksmd`** (`@hastycapybara/tasks-cli`, packages/cli): `query`, `explain`, `list`, `add`, `done`, `status`, `set`, `postpone`, `remove`. 폴더를 직접 훑고(.gitignore·exclude 존중) `.vscode/settings.json`의 `tasksmd.*`를 읽습니다. 완료·반복 처리는 확장과 같은 코드. `--expect`로 줄 원문 검사, JSON/마크다운 출력, `--today`.
- 태스크 DTO 타입(`TaskDto`, `GroupDto`, `SavedQueryDto`)이 `src/core/dto.ts`로 옮겨져 라이브러리·확장 API·웹뷰가 같은 정의를 씁니다.

## 1.1.1 — 2026-09-26

### 변경
- 퍼블리셔를 `HMCVECDT`에서 **`hastycapybara`**로 바꿨습니다. 확장 ID가 `hastycapybara.tasks-for-markdown`이 되므로 기존 설치본은 제거하고 새로 설치해야 합니다(설정 키 `tasksmd.*`와 데이터는 그대로). npm 패키지 이름은 `@hastycapybara/tasks-core`, `@hastycapybara/tasks-cli`로 예정.

## 1.1.0 — 2026-09-26

### API
- **공개 API v1** (docs/api.md). 다른 확장은 `getExtension('hastycapybara.tasks-for-markdown').exports.getAPI(1, { extensionId })`로 받습니다. `query.run/explain/get/list/saved`, `edit.create/update/setStatus/toggle/postpone/remove/batch`, `events.onDidChangeTasks/onDidCompleteTask`, `ui.openEdit/openKanban/openCalendar/openQueryResults/reveal`. 값은 모두 JSON, 오류는 `{ code, message, details? }`.
- 명령 표면 `tasksmd.api.<ns>.<method>` 17개(팔레트 숨김). 키바인딩·매크로에서 인자 객체 하나로 호출.
- 쓰기 정책 `tasksmd.api.writePolicy`(기본 `confirm`: 호출자마다 한 번 확인 후 `tasksmd.api.allowedWriters`에 기억), `tasksmd.api.batchLimit`(200). 신뢰되지 않은 워크스페이스에서는 쓰기 거부. 모든 쓰기 로그.
- 타입 선언 `dist/api-types/api/types.d.ts`를 확장에 동봉.

### 내부
- `activate()`의 반환이 `{ getAPI, extendMarkdownIt, __internal }`로 바뀌었습니다(내부 객체는 `__internal`).
- `TaskEditService.onDidSetStatus`, `deleteTaskLine`; 웹뷰와 API가 같은 `applyFieldValues` 사용.

## 1.0.13 — 2026-09-24

### 변경
- 렌더 보기 기본 글자 크기 14.5px.

## 1.0.12 — 2026-09-24

### 변경
- 렌더 보기 본문 글자 크기 15px, 줄 간격 1.6이 기본이 되었고, `tasksmd.rendered.fontSize`·`tasksmd.rendered.lineHeight`로 조절할 수 있습니다(변경 즉시 반영).

## 1.0.11 — 2026-09-24

### 수정
- 렌더 보기 글자가 Cursor Preview보다 가늘고 흐리게 보이던 문제. 글자 렌더링을 Cursor와 같은 `subpixel-antialiased`로 바꾸고 자간 `-0.08px`을 맞췄습니다(색·크기·줄 간격은 이미 동일).

## 1.0.10 — 2026-09-24

### 수정
- 렌더 보기: 항목 사이에 빈 줄이 있는 목록(느슨한 목록)에서 체크박스가 브라우저 기본 모양(흰 네모)으로 나오고 글자에 붙어 보이던 문제. markdown-it이 이런 항목을 `<p>`로 감싸는데 스타일과 편집·연기 버튼 삽입이 그 경우를 놓쳤습니다. 줄 간격을 Cursor Preview에 맞춰 조금 줄이고 front matter 블록을 본문 크기로 키웠습니다.

## 1.0.9 — 2026-09-24

### 변경
- 완료·취소 태스크 줄의 취소선 장식(`tasksmd.decorations.strikeDone`) 기본값을 **꺼짐**으로 바꿨습니다. 처음 쓰는 사람이 글씨가 안 보인다고 당황하는 것을 막기 위해서입니다. 원하면 `true`로 켜세요.

## 1.0.8 — 2026-09-23

### 추가
- **키보드·접근성**: 칸반 카드에서 `Alt+←/→`로 옆 컬럼 이동(드래그 대체, 결과를 스크린 리더에 안내), 캘린더 날짜 칸 화살표 이동·`Enter`로 새 태스크, 오류 메시지 `role=alert`, 렌더 보기 줄에 포커스가 있으면 편집·연기 버튼 표시. 사용자 가이드 6장 "키보드로 쓰기".
- **큰 보드 성능**: 칸반 컬럼에 카드가 150장 이상이면 보이는 범위만 렌더링합니다(윈도잉). 결과 패널·렌더 보기의 긴 목록은 화면 밖 렌더를 미룹니다.

### 수정 (Obsidian Tasks 호환)
- `due in two weeks`처럼 숫자를 단어로 쓴 상대 날짜를 해석합니다.
- `id includes …`가 Obsidian처럼 대소문자를 구분하지 않습니다.
- 불리언 필터의 구분자로 `( )` 외에 `[ ]`, `{ }`, `" "`도 받습니다(한 줄에 한 종류).
- Obsidian Tasks 테스트에서 224개 케이스를 이식한 호환성 테스트를 추가했습니다.

### 문서
- 설계 문서 0.5: 모듈 트리 현행화, 렌더 보기 시퀀스 다이어그램, 렌더 보기·쿼리 결과 패널 목업(SVG).

## 1.0.7 — 2026-09-23

### 추가
- 렌더 보기의 태스크 줄(본문·쿼리 결과 모두)에 마우스를 올리면 Obsidian처럼 `✎ 편집`, `⏩ 연기` 버튼이 나타납니다. 연기는 마감·예정일이 있는 태스크에만 보이며 누르면 연기 선택 창이 뜹니다.

## 1.0.6 — 2026-09-23

### 변경
- 렌더 보기의 태스크 줄이 Cursor Preview처럼 보입니다. 필드를 알약 배지 대신 원문 그대로(⏫ 🆔 report1 📅 2026-09-25) 표시하고, 지난 마감·잘못된 날짜만 색으로 구분하며, 상대 날짜("2일 남음")는 툴팁으로 옮겼습니다. `tasksmd.rendered.fieldStyle: "badges"`로 예전 배지 모양을 되돌릴 수 있습니다. 쿼리 블록의 결과는 계속 배지입니다.
- 하위 태스크의 들여쓰기가 렌더 보기에서 사라지던 문제를 고쳤습니다.
- 체크박스를 17px 둥근 사각형으로 키우고 줄 간격을 넓혔습니다. YAML front matter를 위쪽에 흐린 키/값 블록으로 보여줍니다.

## 1.0.5 — 2026-09-23

### 변경
- 렌더 보기의 모양과 동작을 Cursor의 Preview 모드에 맞췄습니다. Cursor 편집기의 디자인 토큰(본문 14px/1.42, 제목 1.75·1.5·1.25em, 코드 0.9em, 800px 중앙 열, 배경·테두리 혼합 비율, 둥근 체크박스)을 VS Code 테마 변수로 옮겨 적용했습니다. 상단 툴바를 없애고 오른쪽 위에 `렌더 | 소스` 토글을 두었습니다.
- `Ctrl+Shift+R`과 제목 표시줄 아이콘이 **같은 탭 자리에서** 렌더 보기와 소스를 오갑니다(반대편 편집기를 닫음. 저장 안 된 문서는 닫지 않음). 렌더 보기 안에서 다시 누르면 소스로 돌아갑니다.

## 1.0.4 — 2026-09-22

### 추가
- **렌더 보기** (`Ctrl+Shift+R`, `Tasks: 렌더 보기로 열기`, 에디터 제목 표시줄 아이콘, `Open With… → Tasks: 렌더 보기`): 마크다운 노트를 여는 커스텀 에디터. 미리보기와 같은 렌더링(태스크 뱃지, ```tasks 블록 결과)에 상호작용을 더했습니다. 체크박스 클릭 = 완료 전환, 태스크 더블클릭 = 편집 대화상자, 링크·백링크 = 대상 줄로 이동, 파일·인덱스 변경 시 자동 갱신, 상대 경로 이미지 표시, front matter 숨김. `소스 편집`으로 텍스트 편집기로 돌아갑니다(`Tasks: 마크다운 소스 편집`). Cursor의 "Preview" 토글(자체 WYSIWYG 편집기)이 확장 렌더러를 쓰지 않기 때문에 그 대안으로 만들었습니다. `workbench.editorAssociations`로 기본 에디터로 지정할 수 있습니다.

### 내부
- `markdown-it`이 런타임 의존성이 되었습니다(렌더 보기가 자체 인스턴스를 만듭니다). `PreviewIntegration.pluginDeps()`로 미리보기 플러그인 훅을 공유합니다.

## 1.0.3 — 2026-09-22

### 추가
- **쿼리 결과 패널** (`Tasks: 커서 위치 쿼리 결과 보기`, 블록 위 CodeLens `▶ 결과 보기`): ```tasks 블록의 결과를 에디터 옆 패널에 실시간으로 표시합니다. 커서를 다른 블록으로 옮기거나 블록을 편집하면 따라가고(끌 수 있음), 카드에서 편집·열기·완료 전환이 됩니다. Cursor의 WYSIWYG "Preview"처럼 확장 렌더러가 동작하지 않는 편집기에서도 쿼리 결과를 볼 수 있습니다.
- 모든 ```tasks 블록 위에 CodeLens `▶ 결과 보기 · ? 설명`. `Tasks: 커서 위치 쿼리 설명`도 CodeLens에서 호출할 수 있습니다.
- 웹뷰 `query/run`이 문서 경로를 함께 보내 `{{query.file.folder}}` 같은 자리표시자가 패널에서도 동작합니다.

## 1.0.2 — 2026-09-22

### 추가
- 캘린더 칸의 태스크 글자 크기를 `tasksmd.calendar.fontSize`(기본 13px)로 조절합니다. 이전에는 약 10.7px 고정이었습니다.
- 캘린더 **전체 화면**: 툴바의 `⤢ 전체 화면` 버튼, `Tasks: 캘린더 열기(전체 화면)` / `Tasks: 캘린더: 전체 화면 전환` 명령. 사이드바·하단 패널을 숨기고 에디터 그룹을 최대화합니다. `Esc`로 되돌립니다. `tasksmd.calendar.fullScreen: "window"`면 창도 전체 화면으로 전환합니다.
- 캘린더 월간 보기가 패널 높이에 맞춰 하루에 보이는 태스크 수를 늘립니다(이전에는 3개 고정). 요일 헤더 행이 더 이상 날짜 행만큼 높지 않습니다. 주간 보기의 셀은 스크롤됩니다.

## 1.0.1 — 2026-09-22

### 수정
- 만들기/편집 대화상자에서 **적용**을 눌러도 아무 일도 일어나지 않던 문제. 웹뷰가 호스트로 보내는 메시지에 Svelte 상태 프록시(태그 배열)가 섞여 있어 `postMessage`가 `DataCloneError`로 실패했습니다. 이제 모든 메시지를 스냅샷 후 전송합니다.
- 편집 대화상자가 에디터 옆 열에 열립니다. 패널(칸반·캘린더 등)에서 새 태스크를 만들 때 마지막으로 본 Markdown 문서로 대상이 결정됩니다.
- Markdown All in One(markdown-it-task-lists)과 미리보기 플러그인이 공존합니다. 상태 기호를 복구하고 미리보기가 비는 일이 없도록 예외를 격리했습니다.
- 렌더(WYSIWYG) 모드에서 `Ctrl+Shift+C`를 누르면 해당 파일의 태스크 목록에서 골라 편집할 수 있습니다.
- `tasksmd.language` 설정으로 UI 언어를 강제할 수 있습니다. `tasksmd.setCreatedDate`로 ➕ 생성일을 자동 기록합니다.

### 내부
- 웹뷰 컴포넌트 테스트(`pnpm test:webviews`, jsdom + @testing-library/svelte). 가짜 `postMessage`가 실제처럼 structured clone을 수행해 위 회귀를 잡습니다.

## 1.0.0 — 2026-09-21

첫 릴리스. 마일스톤 M0–M8로 개발했습니다 (docs/Tasks.md 참고).

### M8 — 마감
- 한국어/영어 i18n 검사 테스트, 성능 측정(docs/perf.md), 포맷 변환 명령, 릴리스 워크플로.

### M7 — 부가 기능
- 일일 요약과 마감 임박 알림 (VS Code 토스트 + OS 네이티브 알림, 스누즈).
- "완료 태스크 아카이브…" — 오래된 완료 태스크를 미리보기 후 `Archive.md`로 이동(원본 링크 포함).
- 주간 통계 패널 (ISO 주 단위 완료/생성/기한 초과/잔량, 태그·폴더 필터).
- 캘린더 패널 (월간/주간), 드래그로 일정 변경, 셀에서 바로 태스크 생성.
- `.vsix` 설치본용 업데이트 확인 (`tasksmd.updateCheckUrl`, `latest.json`).

### M6 — 웹뷰
- 태스크 만들기/편집 대화상자 (`Ctrl+Shift+C`): 모든 필드, 자연어 날짜, 반복 규칙 검증, 의존성 선택, 결과 줄 미리보기, 액세스 키.
- 칸반 보드 (사이드바 + 에디터 패널): 상태 / 마감일 / 우선순위 / 파일 컬럼, 드래그앤드롭 편집, 저장된 쿼리를 데이터 소스로.
- 쿼리 빌더: 드롭다운으로 필터·정렬·그룹·레이아웃 조립, 설명과 일치 수 실시간 표시, `.tasks/queries/` 또는 설정에 저장, 노트에 삽입.

### M5 — 마크다운 미리보기
- 내장 미리보기가 체크리스트를 체크박스와 뱃지로, ` ```tasks ` 블록을 실시간 쿼리 결과(그룹, 카운트, explain, 오류)로 렌더링. 태스크가 바뀌면 자동 갱신.
- 미리보기는 표시 전용 (클래식 미리보기는 확장으로 클릭을 전달할 수 없음); 토글·편집은 사이드바, 칸반, 에디터에서.

### M4 — 쿼리 엔진
- Obsidian Tasks 호환 쿼리 언어: 상태, 날짜(단일/범위/자연어), 우선순위, 반복, 의존성, 텍스트/정규식, 태그, 불리언 필터; 모든 필드의 sort by / group by와 Obsidian 기본 정렬; 제한, 레이아웃, `explain`.
- `filter/sort/group by function` (opt-in, 신뢰된 워크스페이스만, 시간 예산 제한).
- `tasksmd.savedQueries`와 `.tasks/queries/*.md`의 저장된 쿼리를 사이드바에 그룹 결과로 표시.
- 빠른 검색 (`Cmd/Ctrl+Shift+;`), 쿼리 블록 삽입, 커서 위치 쿼리 설명.
- 50,000 태스크 벤치마크: 대표 쿼리 100ms 이내.

### M3 — 반복, 상태, 의존성
- 반복 태스크: `🔁 every …` 태스크를 완료하면 다음 회차 삽입 (Obsidian 규칙: 기준 날짜 우선순위, 상대 날짜, `when done`, 짧은 달 보정, `🏁 delete`), 삽입 위치·id 처리·dependsOn 복사 설정.
- `tasksmd.statuses`로 커스텀 상태와 테마 프리셋 (Core, Minimal, ITS, Things); 동작은 상태 타입을 따름.
- 의존성: 차단/차단 중 감지, 순환 진단, id를 자동 발급하는 "의존성 설정…" 선택기.
- 긴급도 점수(Obsidian 공식)로 기본 정렬; 실시간 검증이 있는 반복 선택기.

### M2 — 에디터 보조
- 장식: 상대 날짜 힌트, 기한 초과/오늘 마감 배경, 완료 태스크·메타데이터 흐리게, 거터 상태 아이콘.
- 현재 태스크 줄 위의 CodeLens 액션(완료, 우선순위, 마감, 예정, 미루기, 편집)과 명령 링크가 있는 호버 카드.
- 태스크 줄 자동완성: 키워드(due, priority, every week, id, depends on…)와 자연어 날짜("next fri", "3일 후").
- 상태·우선순위·날짜·미루기 QuickPick 명령.
- Quick Fix가 있는 진단: 잘못된 날짜, 없는 의존성 id, 날짜 없는 반복 태스크.

### M1 — 최소 사용 가능
- 워크스페이스의 모든 `- [ ]` 줄 인덱스 (include/exclude glob, `files.exclude`, 루트 `.gitignore`, 크기 제한), 파일 워처와 열린 편집기로 실시간 갱신.
- `Tasks: 태스크 완료 토글` (`Cmd/Ctrl+Enter`), 완료/취소/다시 열기, 태스크로 이동.
- 스마트 뷰 사이드바 (오늘, 예정 7일, 기한 초과, 진행 중, 차단됨, 미완료 전체, 완료 30일), 그룹, 필터, 체크박스.
- 스캔 진행률과 건너뛴 파일 경고를 보여주는 상태바 요약.
- `tasksmd.*` 설정 (태스크 포맷, 글로벌 필터, 스캔 glob, 날짜 동작).

### M0 — 기반
- 프로젝트 스캐폴딩, CI, 코어 태스크 모델, Obsidian Tasks와 호환되는 이모지/Dataview 파서·직렬화기 (원본 테스트 케이스 이식).
