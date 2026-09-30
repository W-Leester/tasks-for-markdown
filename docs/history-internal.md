# 내부 개발 이력 (공개 전)

Tasks for Markdown은 2026-09-30 마켓플레이스·Open VSX·npm에 **1.0.0**으로 처음 공개되었습니다. 그 전에는 사내 `.vsix`로 배포하며 1.0.0부터 1.13.0까지 내부 버전을 올렸습니다. 공개 버전 번호는 이 내부 번호와 무관하게 1.0.0에서 다시 시작합니다(결정 2026-09-30, docs/release.md).

이 문서는 그 내부 이력을 보관합니다. 공개 이후의 변경은 [CHANGELOG.md](../CHANGELOG.md)에 적습니다.

- [1부. 내부 변경 이력 (내부 1.0.0 ~ 1.13.0)](#1부-내부-변경-이력-내부-100--1130)
- [2부. 내부 1.0 완료 직후 상세 변경 기록 (내부 1.0.0 ~ 1.0.4)](#2부-내부-10-완료-직후-상세-변경-기록-내부-100--104)

---

## 1부. 내부 변경 이력 (내부 1.0.0 ~ 1.13.0)

### 1.13.0 — 2026-09-30

#### API (외부 연동, 모두 추가만 — API 버전 1 유지)
- **기능 확인**: `api.extensionVersion`, `api.features`(기능 이름 목록), `api.info()`(버전·기능·`requireDueDate` 등 설정). CLI `tasksmd info`, MCP `tasks_info`.
- **메모 쓰기를 세 곳 모두에**: 확장 API `edit.addNote`(한 줄 추가, batch·명령 포함), CLI `tasksmd note`, `add --note`, `set --notes`, MCP `tasks_add_note`와 `tasks_create`·`tasks_update`의 `notes`. CLI 마크다운 출력에 메모 표시.
- **상태 변경 알림**: `events.onDidChangeStatus({ before, after, next?, deleted })` — 완료뿐 아니라 진행 중·취소·다시 열기 등 모든 상태 변경.
- **`TaskDto.isBlocking`**: 다른 미완료 태스크가 이 태스크를 기다리는지(확장·CLI·MCP 공통).
- **MCP**: `tasks_create`·`tasks_update`에 `created`·`done`·`cancelled` 날짜, `tasks_create`에 `tags`. AI용 문법 설명서에 메모 형식과 마감일 필수 규칙.
- **타입 정의 한 파일**: `src/api/types.ts`가 import 없는 독립 파일이 되어 그대로 복사해 쓸 수 있습니다(내부 데이터 모양과 일치하는지 테스트로 확인).
- 문서: API 문서에 마감일 필수, 기능 목록 표, 세 가지 연동 경로 정리. 배포 체크리스트(docs/release.md "빠뜨리지 말 것").

#### 변경
- README와 마켓플레이스 소개에 Obsidian Tasks 플러그인에서 출발했음을 밝히고, 감사의 말을 보강했습니다(원작자·기여자, 원본 문서·저장소, 후원 링크).

### 1.12.0 — 2026-09-30

#### 추가
- **렌더 보기 열 너비 조절.** 열 제목 줄에서 마감일·생성일·나머지 필드 열의 왼쪽 경계를 끌어 너비를 바꿉니다. 더블클릭하면 기본값, 키보드는 `←`/`→`/`Home`. 모든 노트·표에 공통으로 기억되고 열려 있는 다른 렌더 보기에도 반영됩니다(3~40em, em 단위라 글자 크기를 바꿔도 비율 유지).

### 1.11.0 — 2026-09-30

#### 변경
- 렌더 보기 **열 제목 줄**의 `✕`와 `+ 열 이름` 칩이 이제 툴바 `열 ▾`와 같은 설정을 바꿉니다(모든 표·노트에 한 번에 적용, 툴바 체크 표시 연동). 1.10.0의 쿼리 블록별 설정은 없앴습니다.
- 노트 본문의 태스크 목록(맨 위 단계)에도 열 제목 줄이 붙습니다. 정렬해도 목록 맨 위에 남습니다.

### 1.10.0 — 2026-09-30

#### 추가
- **쿼리 결과 열 제목 줄(렌더 보기).** ```tasks 결과 상자 위의 가는 선에 마우스를 올리면 열 제목과 `✕`가 나타납니다. `✕`로 그 블록에서만 열을 숨기고, `+ 열 이름` 칩으로 되살립니다. 블록마다 따로(쿼리 내용 기준) 기억하며, 툴바 `열 ▾`에서 숨긴 열은 모든 블록에 함께 적용됩니다. 파일은 바뀌지 않습니다.

### 1.9.0 — 2026-09-30

#### 추가
- **렌더 보기 열 숨기기.** 툴바 `열 ▾` 메뉴에서 마감일·생성일·나머지 필드 열을 켜고 끕니다. 노트 본문과 ```tasks 결과에 함께 적용되고, 숨긴 열 자리는 남은 열이 당겨 채웁니다. 파일은 바뀌지 않고, 선택은 모든 노트에 공통으로 기억됩니다(열려 있는 다른 렌더 보기에도 바로 반영). 열 배치에서만 보이며 상태·설명 열은 고정입니다.

### 1.8.1 — 2026-09-29

#### 수정
- 렌더 보기에서 태스크 줄에 마우스를 올려도 `✎ ⏩ 💬` 버튼이 나타나지 않던 문제. 1.7.0에서 열 배치가 기본이 되면서 버튼이 설명 칸 안으로 들어갔는데, 버튼을 보이게 하는 스타일은 줄 바로 아래 자리만 찾고 있었습니다(빈 줄로 띄운 목록도 같은 문제). 이제 어느 배치에서든 보입니다.

### 1.8.0 — 2026-09-29

#### 추가
- **태스크 메모.** 태스크 아래 한 단계 들여쓴 일반 글머리표(체크박스 없음)를 메모로 다룹니다. Obsidian과 같은 표준 마크다운이라 파일 형식은 그대로입니다.
  - 렌더 보기: 태스크 줄 hover 버튼 `💬` → 줄 아래 입력칸, `Enter`로 저장(`Esc` 취소). 기존 메모 뒤(없으면 태스크 바로 아래)에 한 줄만 끼워 넣어 되돌리기가 됩니다. 본문의 메모 줄은 `💬`와 흐린 글씨로 구분됩니다.
  - 쿼리 결과(렌더 보기·기본 미리보기): 메모가 있는 행에 `💬 N`, 누르면 메모 목록이 펼쳐집니다. 쿼리 결과 패널·칸반 카드에는 `💬 N` 칩(툴팁에 내용).
  - 편집 대화상자: 더보기 안에 **메모** 칸(한 줄 = 메모 하나). 메모가 있으면 더보기가 자동으로 펼쳐지고 개수가 보입니다. 새 태스크도 메모와 함께 만들 수 있습니다. `tasksmd.editModal.hiddenFields`에 `notes`로 숨김.
  - 공개 API: `TaskDto.notes`, `edit.create`/`edit.update`의 `notes` (v1 호환 추가).

### 1.7.2 — 2026-09-29

#### 변경
- 렌더 보기 열 배치를 5열로: 상태 | 설명+우선순위+태그 | 마감일 | 작성일 | 나머지 필드 전부(반복 포함). 나머지 열이 넓어져 줄바꿈이 줄었습니다.

### 1.7.1 — 2026-09-29

#### 변경
- 렌더 보기 열 배치: 태그를 2열(설명 + 우선순위 + 태그)로 옮기고, 그 자리에 **작성일(➕) 열**을 두었습니다. 상태 | 설명+우선순위+태그 | 마감일 | 반복 | 작성일 | 나머지 필드.

### 1.7.0 — 2026-09-29

#### 변경
- **만들기/편집 대화상자** 필드 순서: 상태 → 설명 → 우선순위 → 마감일 → 태그 → 반복. 예정일·시작일·의존·생성일·완료 시 동작은 **더보기**로 접었고(값이 있으면 자동으로 펼침), 완료일·취소일은 편집할 때만 나옵니다. **태그 칸** 신설: 설명 끝의 태그를 따로 보여 주고 적용할 때 다시 붙입니다(문장 중간 태그는 설명에 그대로).
- **렌더 보기 열 배치**(새 기본값 `tasksmd.rendered.fieldsAlign: "columns"`): 상태 | 설명+우선순위 | 마감일 | 태그 | 반복 | 나머지 필드. 줄마다 같은 폭이라 위아래로 정렬됩니다. 태그는 열로 옮겨 설명에서는 빠지고(표시만), 쿼리 결과도 날짜만 표시해 칸에 맞춥니다(상대 날짜는 툴팁). 좁은 창에서는 열이 접힙니다. 이전 배치는 `right`, `inline`.

### 1.6.3 — 2026-09-29

#### 수정
- 첫 줄이 `---`인데 닫는 `---`가 없는 노트는 VS Code 마크다운 미리보기가 문서 전체를 front matter로 보고 빈 화면을 띄웁니다. 에디터가 이제 이 경우를 경고하고 빠른 수정(맨 위 `---` 삭제)을 제안합니다.
- 예시 노트 `샘플-태스크.md`의 front matter 복구(Cursor Preview 편집 중 닫는 `---`가 사라져 있었음).

### 1.6.2 — 2026-09-29

#### 추가
- 마크다운 파일 탭 줄 오른쪽(편집기 제목 표시줄)에 **`Preview 렌더`** 글자 버튼. 누르면 렌더 보기(`Ctrl+Shift+R`)로 엽니다. Cursor의 "Preview | Markdown" 토글 바로 옆은 Cursor 편집기 내부라 확장이 버튼을 넣을 수 없어, 확장이 쓸 수 있는 가장 가까운 자리인 제목 표시줄에 두었습니다. 기존 미리보기 아이콘 버튼을 대체합니다.

### 1.6.1 — 2026-09-29

#### 변경
- 완료와 취소를 구분해 표시합니다. **완료(`[x]`)는 흐리게만, 취소(`[-]`)는 취소선.** 에디터(새 설정 `tasksmd.decorations.strikeCancelled`, 기본 켜짐), 렌더 보기, 클래식 미리보기, 칸반·쿼리 결과 패널 카드, 캘린더에 모두 적용. 클래식 미리보기에서 빈 줄 있는 목록의 취소선이 빠지던 문제도 함께 고쳤습니다.

### 1.6.0 — 2026-09-28

#### 추가
- **쿼리 결과 트리 표시.** 하위 태스크가 부모 태스크 밑에 들여써 나옵니다. 결과에 든 태스크의 하위 태스크는 필터에 안 맞아도 흐린 맥락 행으로 함께 보이고, 개수와 `limit`에는 들어가지 않습니다. 기본 켜짐(`tasksmd.query.showTree`), 블록별 `show tree` / `hide tree`. 렌더 보기·클래식 미리보기·쿼리 결과 패널·CLI 마크다운 출력에 적용.

#### API
- `GroupDto.tree`(`{ task, matched, children }[]`), `TaskDto.parentLine`, `TaskDto.depth` 추가(v1 호환). 트리가 켜지면 `groups`가 항상 채워집니다.

### 1.5.1 — 2026-09-27

#### 변경
- 렌더 보기에서 태스크 줄 사이에 아주 옅은 구분선을 넣었습니다(본문 목록과 쿼리 결과 모두). 필드가 여러 줄로 넘어가도 어느 태스크의 것인지 구분됩니다.

### 1.5.0 — 2026-09-27

#### 변경
- `tasksmd.requireDueDate` 기본값이 **켜짐**입니다. 만들기 대화상자·API·CLI·MCP가 마감일 없는 새 태스크를 거부하고, 에디터는 마감일 없는 미완료 태스크에 경고를 표시합니다. 끄려면 `false`.
- 쿼리 결과 행의 배지 순서: 우선순위 → **백링크(파일 › 제목)** → 반복 → 완료 시 동작 → ID → 의존 → 생성일 → **취소일** → 시작일 → 예정일 → 마감일 → 완료일.

### 1.4.3 — 2026-09-27

#### 변경
- 렌더 보기가 기본으로 창 전체 폭을 씁니다(`tasksmd.rendered.maxWidth` 기본값 800 → 0). 가운데 열로 제한하고 싶을 때만 px 값을 줍니다.

### 1.4.2 — 2026-09-27

#### 추가
- `tasksmd.rendered.maxWidth`(기본 800px, 0이면 전체 폭): 렌더 보기 본문 열과 쿼리 결과 상자의 최대 폭. 변경 즉시 반영.

### 1.4.1 — 2026-09-27

#### 수정
- 렌더 보기에서 완료 태스크의 취소선이 목록 종류(항목 사이 빈 줄 유무)에 따라 있다가 없다가 하던 문제. 이제 완료·취소 태스크는 취소선 없이 흐린 색으로만 표시합니다.
- 보기 툴바의 "오늘(초과 포함)"을 "오늘까지(초과 포함)"로 바꿨습니다.

### 1.4.0 — 2026-09-27

#### 추가
- **렌더 보기를 기본 편집기로** (`Tasks: 렌더 보기를 기본 편집기로`): .md 파일이 처음부터 렌더 보기로 열리도록 `workbench.editorAssociations`를 설정·해제합니다. 처음 렌더 보기를 열 때 한 번 제안합니다. Cursor의 "Preview | Markdown" 토글은 Cursor 편집기의 일부라 확장이 바꿀 수 없으므로, 그 편집기를 기본에서 빼서 우리 `렌더 | 소스` 토글만 보이게 하는 방식입니다. 태스크가 없는 노트는 텍스트 편집기로 엽니다(`tasksmd.rendered.sourceWhenNoTasks`).
- **렌더 보기 정렬·보기 툴바**: 마감일·생성일·우선순위·긴급도 정렬과 전체·미완료만·오늘·이번 주·다음 주까지·기한 초과 범위. 화면만 바꾸고 파일은 건드리지 않으며 파일별로 기억합니다.

#### 내부
- 미리보기 플러그인이 태스크 줄에 `data-tfm-due/created/happens/priority/urgency/done` 속성을 붙입니다.

### 1.3.3 — 2026-09-26

#### 추가
- 설정 `tasksmd.requireDueDate`(기본 꺼짐). 켜면 만들기 대화상자·공개 API·CLI `add`·MCP `tasks_create`가 마감일 없는 새 태스크를 거부하고, 에디터는 마감일 없는 미완료 태스크에 경고와 빠른 수정(`마감일 설정…`, `오늘 날짜 추가`)을 제공합니다.

### 1.3.2 — 2026-09-26

#### 변경
- 렌더 보기에서 태스크 줄의 필드(날짜·우선순위·반복 등)를 설명과 분리해 줄의 오른쪽 끝에 정렬합니다. 설명이 길면 필드가 다음 줄 오른쪽으로 내려갑니다. 원문식 배치는 `tasksmd.rendered.fieldsAlign: "inline"`. 쿼리 결과 행에도 같은 배치가 적용됩니다.
- 미리보기 플러그인이 태스크 설명을 `span.tfm-desc`로 감쌉니다(스타일링용, 내용 변화 없음).

### 1.3.1 — 2026-09-26

#### 변경
- 명령 팔레트·뷰 제목이 편집기 표시 언어가 영어여도 한글로 검색되도록 기본 제목을 "한글 (English)" 형식으로 바꿨습니다(예: `Tasks: 로그 보기 (Show logs)`). 한국어 표시 언어에서는 한글만 보입니다.

### 1.3.0 — 2026-09-26

#### API
- **MCP 서버 `tasksmd mcp`** (`@hastycapybara/tasks-cli`): Claude Code·Cursor·Claude Desktop 같은 AI 에이전트가 쓰는 도구 10개(`tasks_query`, `tasks_explain_query`, `tasks_get`, `tasks_list_saved_queries`, `tasks_create`, `tasks_update`, `tasks_set_status`, `tasks_postpone`, `tasks_remove`, `tasks_syntax_reference`)와 문법 리소스 `tasks://syntax`. 등록: `claude mcp add tasks -- npx -y @hastycapybara/tasks-cli mcp --root "$PWD"`.
- CLI에 `saved`(저장된 쿼리 목록) 추가, `tasksmd.savedQueries` 설정 읽기.

### 1.2.0 — 2026-09-26

#### API
- **npm 라이브러리 `@hastycapybara/tasks-core`** (packages/core): 확장의 핵심(`src/core`)을 CommonJS + 타입으로 내보냅니다. 파서·직렬화·날짜·반복·쿼리 엔진·인덱스·DTO·HTML 렌더·통계.
- **CLI `tasksmd`** (`@hastycapybara/tasks-cli`, packages/cli): `query`, `explain`, `list`, `add`, `done`, `status`, `set`, `postpone`, `remove`. 폴더를 직접 훑고(.gitignore·exclude 존중) `.vscode/settings.json`의 `tasksmd.*`를 읽습니다. 완료·반복 처리는 확장과 같은 코드. `--expect`로 줄 원문 검사, JSON/마크다운 출력, `--today`.
- 태스크 DTO 타입(`TaskDto`, `GroupDto`, `SavedQueryDto`)이 `src/core/dto.ts`로 옮겨져 라이브러리·확장 API·웹뷰가 같은 정의를 씁니다.

### 1.1.1 — 2026-09-26

#### 변경
- 퍼블리셔를 `HMCVECDT`에서 **`hastycapybara`**로 바꿨습니다. 확장 ID가 `hastycapybara.tasks-for-markdown`이 되므로 기존 설치본은 제거하고 새로 설치해야 합니다(설정 키 `tasksmd.*`와 데이터는 그대로). npm 패키지 이름은 `@hastycapybara/tasks-core`, `@hastycapybara/tasks-cli`로 예정.

### 1.1.0 — 2026-09-26

#### API
- **공개 API v1** (docs/api.md). 다른 확장은 `getExtension('hastycapybara.tasks-for-markdown').exports.getAPI(1, { extensionId })`로 받습니다. `query.run/explain/get/list/saved`, `edit.create/update/setStatus/toggle/postpone/remove/batch`, `events.onDidChangeTasks/onDidCompleteTask`, `ui.openEdit/openKanban/openCalendar/openQueryResults/reveal`. 값은 모두 JSON, 오류는 `{ code, message, details? }`.
- 명령 표면 `tasksmd.api.<ns>.<method>` 17개(팔레트 숨김). 키바인딩·매크로에서 인자 객체 하나로 호출.
- 쓰기 정책 `tasksmd.api.writePolicy`(기본 `confirm`: 호출자마다 한 번 확인 후 `tasksmd.api.allowedWriters`에 기억), `tasksmd.api.batchLimit`(200). 신뢰되지 않은 워크스페이스에서는 쓰기 거부. 모든 쓰기 로그.
- 타입 선언 `dist/api-types/api/types.d.ts`를 확장에 동봉.

#### 내부
- `activate()`의 반환이 `{ getAPI, extendMarkdownIt, __internal }`로 바뀌었습니다(내부 객체는 `__internal`).
- `TaskEditService.onDidSetStatus`, `deleteTaskLine`; 웹뷰와 API가 같은 `applyFieldValues` 사용.

### 1.0.13 — 2026-09-24

#### 변경
- 렌더 보기 기본 글자 크기 14.5px.

### 1.0.12 — 2026-09-24

#### 변경
- 렌더 보기 본문 글자 크기 15px, 줄 간격 1.6이 기본이 되었고, `tasksmd.rendered.fontSize`·`tasksmd.rendered.lineHeight`로 조절할 수 있습니다(변경 즉시 반영).

### 1.0.11 — 2026-09-24

#### 수정
- 렌더 보기 글자가 Cursor Preview보다 가늘고 흐리게 보이던 문제. 글자 렌더링을 Cursor와 같은 `subpixel-antialiased`로 바꾸고 자간 `-0.08px`을 맞췄습니다(색·크기·줄 간격은 이미 동일).

### 1.0.10 — 2026-09-24

#### 수정
- 렌더 보기: 항목 사이에 빈 줄이 있는 목록(느슨한 목록)에서 체크박스가 브라우저 기본 모양(흰 네모)으로 나오고 글자에 붙어 보이던 문제. markdown-it이 이런 항목을 `<p>`로 감싸는데 스타일과 편집·연기 버튼 삽입이 그 경우를 놓쳤습니다. 줄 간격을 Cursor Preview에 맞춰 조금 줄이고 front matter 블록을 본문 크기로 키웠습니다.

### 1.0.9 — 2026-09-24

#### 변경
- 완료·취소 태스크 줄의 취소선 장식(`tasksmd.decorations.strikeDone`) 기본값을 **꺼짐**으로 바꿨습니다. 처음 쓰는 사람이 글씨가 안 보인다고 당황하는 것을 막기 위해서입니다. 원하면 `true`로 켜세요.

### 1.0.8 — 2026-09-23

#### 추가
- **키보드·접근성**: 칸반 카드에서 `Alt+←/→`로 옆 컬럼 이동(드래그 대체, 결과를 스크린 리더에 안내), 캘린더 날짜 칸 화살표 이동·`Enter`로 새 태스크, 오류 메시지 `role=alert`, 렌더 보기 줄에 포커스가 있으면 편집·연기 버튼 표시. 사용자 가이드 6장 "키보드로 쓰기".
- **큰 보드 성능**: 칸반 컬럼에 카드가 150장 이상이면 보이는 범위만 렌더링합니다(윈도잉). 결과 패널·렌더 보기의 긴 목록은 화면 밖 렌더를 미룹니다.

#### 수정 (Obsidian Tasks 호환)
- `due in two weeks`처럼 숫자를 단어로 쓴 상대 날짜를 해석합니다.
- `id includes …`가 Obsidian처럼 대소문자를 구분하지 않습니다.
- 불리언 필터의 구분자로 `( )` 외에 `[ ]`, `{ }`, `" "`도 받습니다(한 줄에 한 종류).
- Obsidian Tasks 테스트에서 224개 케이스를 이식한 호환성 테스트를 추가했습니다.

#### 문서
- 설계 문서 0.5: 모듈 트리 현행화, 렌더 보기 시퀀스 다이어그램, 렌더 보기·쿼리 결과 패널 목업(SVG).

### 1.0.7 — 2026-09-23

#### 추가
- 렌더 보기의 태스크 줄(본문·쿼리 결과 모두)에 마우스를 올리면 Obsidian처럼 `✎ 편집`, `⏩ 연기` 버튼이 나타납니다. 연기는 마감·예정일이 있는 태스크에만 보이며 누르면 연기 선택 창이 뜹니다.

### 1.0.6 — 2026-09-23

#### 변경
- 렌더 보기의 태스크 줄이 Cursor Preview처럼 보입니다. 필드를 알약 배지 대신 원문 그대로(⏫ 🆔 report1 📅 2026-09-25) 표시하고, 지난 마감·잘못된 날짜만 색으로 구분하며, 상대 날짜("2일 남음")는 툴팁으로 옮겼습니다. `tasksmd.rendered.fieldStyle: "badges"`로 예전 배지 모양을 되돌릴 수 있습니다. 쿼리 블록의 결과는 계속 배지입니다.
- 하위 태스크의 들여쓰기가 렌더 보기에서 사라지던 문제를 고쳤습니다.
- 체크박스를 17px 둥근 사각형으로 키우고 줄 간격을 넓혔습니다. YAML front matter를 위쪽에 흐린 키/값 블록으로 보여줍니다.

### 1.0.5 — 2026-09-23

#### 변경
- 렌더 보기의 모양과 동작을 Cursor의 Preview 모드에 맞췄습니다. Cursor 편집기의 디자인 토큰(본문 14px/1.42, 제목 1.75·1.5·1.25em, 코드 0.9em, 800px 중앙 열, 배경·테두리 혼합 비율, 둥근 체크박스)을 VS Code 테마 변수로 옮겨 적용했습니다. 상단 툴바를 없애고 오른쪽 위에 `렌더 | 소스` 토글을 두었습니다.
- `Ctrl+Shift+R`과 제목 표시줄 아이콘이 **같은 탭 자리에서** 렌더 보기와 소스를 오갑니다(반대편 편집기를 닫음. 저장 안 된 문서는 닫지 않음). 렌더 보기 안에서 다시 누르면 소스로 돌아갑니다.

### 1.0.4 — 2026-09-22

#### 추가
- **렌더 보기** (`Ctrl+Shift+R`, `Tasks: 렌더 보기로 열기`, 에디터 제목 표시줄 아이콘, `Open With… → Tasks: 렌더 보기`): 마크다운 노트를 여는 커스텀 에디터. 미리보기와 같은 렌더링(태스크 뱃지, ```tasks 블록 결과)에 상호작용을 더했습니다. 체크박스 클릭 = 완료 전환, 태스크 더블클릭 = 편집 대화상자, 링크·백링크 = 대상 줄로 이동, 파일·인덱스 변경 시 자동 갱신, 상대 경로 이미지 표시, front matter 숨김. `소스 편집`으로 텍스트 편집기로 돌아갑니다(`Tasks: 마크다운 소스 편집`). Cursor의 "Preview" 토글(자체 WYSIWYG 편집기)이 확장 렌더러를 쓰지 않기 때문에 그 대안으로 만들었습니다. `workbench.editorAssociations`로 기본 에디터로 지정할 수 있습니다.

#### 내부
- `markdown-it`이 런타임 의존성이 되었습니다(렌더 보기가 자체 인스턴스를 만듭니다). `PreviewIntegration.pluginDeps()`로 미리보기 플러그인 훅을 공유합니다.

### 1.0.3 — 2026-09-22

#### 추가
- **쿼리 결과 패널** (`Tasks: 커서 위치 쿼리 결과 보기`, 블록 위 CodeLens `▶ 결과 보기`): ```tasks 블록의 결과를 에디터 옆 패널에 실시간으로 표시합니다. 커서를 다른 블록으로 옮기거나 블록을 편집하면 따라가고(끌 수 있음), 카드에서 편집·열기·완료 전환이 됩니다. Cursor의 WYSIWYG "Preview"처럼 확장 렌더러가 동작하지 않는 편집기에서도 쿼리 결과를 볼 수 있습니다.
- 모든 ```tasks 블록 위에 CodeLens `▶ 결과 보기 · ? 설명`. `Tasks: 커서 위치 쿼리 설명`도 CodeLens에서 호출할 수 있습니다.
- 웹뷰 `query/run`이 문서 경로를 함께 보내 `{{query.file.folder}}` 같은 자리표시자가 패널에서도 동작합니다.

### 1.0.2 — 2026-09-22

#### 추가
- 캘린더 칸의 태스크 글자 크기를 `tasksmd.calendar.fontSize`(기본 13px)로 조절합니다. 이전에는 약 10.7px 고정이었습니다.
- 캘린더 **전체 화면**: 툴바의 `⤢ 전체 화면` 버튼, `Tasks: 캘린더 열기(전체 화면)` / `Tasks: 캘린더: 전체 화면 전환` 명령. 사이드바·하단 패널을 숨기고 에디터 그룹을 최대화합니다. `Esc`로 되돌립니다. `tasksmd.calendar.fullScreen: "window"`면 창도 전체 화면으로 전환합니다.
- 캘린더 월간 보기가 패널 높이에 맞춰 하루에 보이는 태스크 수를 늘립니다(이전에는 3개 고정). 요일 헤더 행이 더 이상 날짜 행만큼 높지 않습니다. 주간 보기의 셀은 스크롤됩니다.

### 1.0.1 — 2026-09-22

#### 수정
- 만들기/편집 대화상자에서 **적용**을 눌러도 아무 일도 일어나지 않던 문제. 웹뷰가 호스트로 보내는 메시지에 Svelte 상태 프록시(태그 배열)가 섞여 있어 `postMessage`가 `DataCloneError`로 실패했습니다. 이제 모든 메시지를 스냅샷 후 전송합니다.
- 편집 대화상자가 에디터 옆 열에 열립니다. 패널(칸반·캘린더 등)에서 새 태스크를 만들 때 마지막으로 본 Markdown 문서로 대상이 결정됩니다.
- Markdown All in One(markdown-it-task-lists)과 미리보기 플러그인이 공존합니다. 상태 기호를 복구하고 미리보기가 비는 일이 없도록 예외를 격리했습니다.
- 렌더(WYSIWYG) 모드에서 `Ctrl+Shift+C`를 누르면 해당 파일의 태스크 목록에서 골라 편집할 수 있습니다.
- `tasksmd.language` 설정으로 UI 언어를 강제할 수 있습니다. `tasksmd.setCreatedDate`로 ➕ 생성일을 자동 기록합니다.

#### 내부
- 웹뷰 컴포넌트 테스트(`pnpm test:webviews`, jsdom + @testing-library/svelte). 가짜 `postMessage`가 실제처럼 structured clone을 수행해 위 회귀를 잡습니다.

### 1.0.0 — 2026-09-21

첫 릴리스. 마일스톤 M0–M8로 개발했습니다 (docs/Tasks.md 참고).

#### M8 — 마감
- 한국어/영어 i18n 검사 테스트, 성능 측정(docs/perf.md), 포맷 변환 명령, 릴리스 워크플로.

#### M7 — 부가 기능
- 일일 요약과 마감 임박 알림 (VS Code 토스트 + OS 네이티브 알림, 스누즈).
- "완료 태스크 아카이브…" — 오래된 완료 태스크를 미리보기 후 `Archive.md`로 이동(원본 링크 포함).
- 주간 통계 패널 (ISO 주 단위 완료/생성/기한 초과/잔량, 태그·폴더 필터).
- 캘린더 패널 (월간/주간), 드래그로 일정 변경, 셀에서 바로 태스크 생성.
- `.vsix` 설치본용 업데이트 확인 (`tasksmd.updateCheckUrl`, `latest.json`).

#### M6 — 웹뷰
- 태스크 만들기/편집 대화상자 (`Ctrl+Shift+C`): 모든 필드, 자연어 날짜, 반복 규칙 검증, 의존성 선택, 결과 줄 미리보기, 액세스 키.
- 칸반 보드 (사이드바 + 에디터 패널): 상태 / 마감일 / 우선순위 / 파일 컬럼, 드래그앤드롭 편집, 저장된 쿼리를 데이터 소스로.
- 쿼리 빌더: 드롭다운으로 필터·정렬·그룹·레이아웃 조립, 설명과 일치 수 실시간 표시, `.tasks/queries/` 또는 설정에 저장, 노트에 삽입.

#### M5 — 마크다운 미리보기
- 내장 미리보기가 체크리스트를 체크박스와 뱃지로, ` ```tasks ` 블록을 실시간 쿼리 결과(그룹, 카운트, explain, 오류)로 렌더링. 태스크가 바뀌면 자동 갱신.
- 미리보기는 표시 전용 (클래식 미리보기는 확장으로 클릭을 전달할 수 없음); 토글·편집은 사이드바, 칸반, 에디터에서.

#### M4 — 쿼리 엔진
- Obsidian Tasks 호환 쿼리 언어: 상태, 날짜(단일/범위/자연어), 우선순위, 반복, 의존성, 텍스트/정규식, 태그, 불리언 필터; 모든 필드의 sort by / group by와 Obsidian 기본 정렬; 제한, 레이아웃, `explain`.
- `filter/sort/group by function` (opt-in, 신뢰된 워크스페이스만, 시간 예산 제한).
- `tasksmd.savedQueries`와 `.tasks/queries/*.md`의 저장된 쿼리를 사이드바에 그룹 결과로 표시.
- 빠른 검색 (`Cmd/Ctrl+Shift+;`), 쿼리 블록 삽입, 커서 위치 쿼리 설명.
- 50,000 태스크 벤치마크: 대표 쿼리 100ms 이내.

#### M3 — 반복, 상태, 의존성
- 반복 태스크: `🔁 every …` 태스크를 완료하면 다음 회차 삽입 (Obsidian 규칙: 기준 날짜 우선순위, 상대 날짜, `when done`, 짧은 달 보정, `🏁 delete`), 삽입 위치·id 처리·dependsOn 복사 설정.
- `tasksmd.statuses`로 커스텀 상태와 테마 프리셋 (Core, Minimal, ITS, Things); 동작은 상태 타입을 따름.
- 의존성: 차단/차단 중 감지, 순환 진단, id를 자동 발급하는 "의존성 설정…" 선택기.
- 긴급도 점수(Obsidian 공식)로 기본 정렬; 실시간 검증이 있는 반복 선택기.

#### M2 — 에디터 보조
- 장식: 상대 날짜 힌트, 기한 초과/오늘 마감 배경, 완료 태스크·메타데이터 흐리게, 거터 상태 아이콘.
- 현재 태스크 줄 위의 CodeLens 액션(완료, 우선순위, 마감, 예정, 미루기, 편집)과 명령 링크가 있는 호버 카드.
- 태스크 줄 자동완성: 키워드(due, priority, every week, id, depends on…)와 자연어 날짜("next fri", "3일 후").
- 상태·우선순위·날짜·미루기 QuickPick 명령.
- Quick Fix가 있는 진단: 잘못된 날짜, 없는 의존성 id, 날짜 없는 반복 태스크.

#### M1 — 최소 사용 가능
- 워크스페이스의 모든 `- [ ]` 줄 인덱스 (include/exclude glob, `files.exclude`, 루트 `.gitignore`, 크기 제한), 파일 워처와 열린 편집기로 실시간 갱신.
- `Tasks: 태스크 완료 토글` (`Cmd/Ctrl+Enter`), 완료/취소/다시 열기, 태스크로 이동.
- 스마트 뷰 사이드바 (오늘, 예정 7일, 기한 초과, 진행 중, 차단됨, 미완료 전체, 완료 30일), 그룹, 필터, 체크박스.
- 스캔 진행률과 건너뛴 파일 경고를 보여주는 상태바 요약.
- `tasksmd.*` 설정 (태스크 포맷, 글로벌 필터, 스캔 glob, 날짜 동작).

#### M0 — 기반
- 프로젝트 스캐폴딩, CI, 코어 태스크 모델, Obsidian Tasks와 호환되는 이모지/Dataview 파서·직렬화기 (원본 테스트 케이스 이식).


---

## 2부. 내부 1.0 완료 직후 상세 변경 기록 (내부 1.0.0 ~ 1.0.4)

**기준 시점:** 커밋 `9a4c8a7` (2026-09-21 20:34, "docs: checklist 1.0 — M0–M8 implementation complete") — 개발 체크리스트(docs/Tasks.md)의 M0–M8을 모두 끝내고 1.0.0으로 표시한 시점입니다.
**기록 범위:** 그 이후 `ee1ec93` (2026-09-22, 1.0.4)까지의 커밋 30개.
**규모:** 77개 파일, +2,804 / −422 줄. 그중 소스(`src/`) 41개 파일 +822/−264, 테스트(`tests/`) 13개 파일 +374/−4, 문서·예시 11개 파일 +533/−126.
**버전:** 1.0.0 → 1.0.1 → 1.0.2 → 1.0.3 → 1.0.4. 각 버전의 요약은 [CHANGELOG.md](../CHANGELOG.md)에 있고, 이 문서는 그 뒤에 있는 배경·원인·판단·되돌린 것까지 적는 상세 기록입니다.

이 기록은 실제 사용(Cursor 1.x, macOS)에서 발견된 문제를 고치고 요청받은 기능을 더한 것이 대부분입니다. 항목마다 **배경 → 원인 → 변경 → 검증 → 남은 제한** 순서로 적었습니다.

---

### 1. 타임라인

| # | 커밋 | 시각 | 분류 | 요약 |
|---|---|---|---|---|
| 1 | `207c70f` | 09-21 22:16 | 문서 | README·NOTICE·CHANGELOG 한국어화, 영문 README는 docs/README.en.md로 |
| 2 | `33e89a4` | 09-21 22:20 | 예시 | examples/ 샘플 노트·쿼리 예시·저장 쿼리 |
| 3 | `8b8b639` | 09-21 22:36 | 버그 | 미리보기 플러그인이 등록되지 않던 문제(contributes 키 형식) |
| 4 | `6656b0b` | 09-21 22:45 | 키 | 만들기/편집 단축키 macOS `Ctrl+T` (Cmd+Alt+T 충돌) |
| 5 | `83dc4b1` | 09-21 22:46 | 키 | 모든 플랫폼 `Ctrl+T` |
| 6 | `b95cff4` | 09-22 04:42 | 키 | 다시 `Cmd/Ctrl+Alt+T`, when 절 확대 |
| 7 | `aaf8eba` | 09-22 08:11 | 키 | 최종 `Ctrl+Shift+C` (모든 플랫폼) |
| 8 | `e264464` | 09-22 08:20 | 버그 | 에디터 안에서 단축키가 죽어 있던 문제(`inputFocus`) |
| 9 | `303c630` | 09-22 08:36 | 기능 | `tasksmd.language` 설정으로 UI 언어 강제 |
| 10 | `e757466` | 09-22 08:37 | 테스트 | 통합 테스트 날짜를 로컬 기준으로(자정 이후 실패) |
| 11 | `e0271e1` | 09-22 08:43 | 기능 | 미리보기에서 만들기/편집 → 해당 문서 태스크 QuickPick |
| 12 | `8c483bf` | 09-22 09:11 | 기능 | 미리보기 옆에 보이는 에디터의 커서를 우선 사용 |
| 13 | `944064c` | 09-22 09:21 | 기능 | 텍스트 에디터가 없을 때(Cursor 렌더 모드) 활성 탭 문서의 태스크 목록 |
| 14 | `391bc46` | 09-22 09:28 | 버그 | 인덱스가 늦을 때 편집 대화상자가 문서에서 직접 줄을 읽음, 진단 로그 |
| 15 | `cf94800` | 09-22 09:39 | 테스트 | 내장 마크다운 엔진 플러그인 적용 검사, Cursor에서 통합 테스트 실행 스크립트 |
| 16 | `65d8f63` | 09-22 11:30 | 버그 | Markdown All in One(markdown-it-task-lists)과 공존, 미리보기 공백 방지 |
| 17 | `b89b95c` | 09-22 11:31 | 버그 | 상태 기호가 이미 제거된 경우 복구 |
| 18 | `1bacc9e` | 09-22 12:40 | 되돌림 | #17 되돌림 |
| 19 | `3830483` | 09-22 12:40 | 되돌림 | #16 되돌림 |
| 20 | `f71d02d` | 09-22 12:40 | 되돌림 | #15 되돌림 |
| 21 | `938d509` | 09-22 12:48 | 재적용 | #16 재적용 |
| 22 | `3d2368f` | 09-22 12:48 | 재적용 | #17 재적용 |
| 23 | `846af9a` | 09-22 13:30 | 버그 | 편집 대화상자를 에디터 옆 열에, 패널에서 생성 시 대상 문서 폴백, 생성 로그 |
| 24 | `beae3a1` | 09-22 13:42 | 버그 | **적용 버튼 무반응(DataCloneError)** 수정, 웹뷰 컴포넌트 테스트 인프라, **1.0.1** |
| 25 | `c8ad128` | 09-22 15:31 | 기능 | 캘린더 전체 화면, 칸 높이에 맞춘 표시 개수, **1.0.2** |
| 26 | `30d72cc` | 09-22 15:35 | 기능 | `tasksmd.calendar.fontSize` |
| 27 | `7fb8cc7` | 09-22 15:43 | 기능 | 쿼리 결과 패널 + 블록 위 CodeLens, **1.0.3** |
| 28 | `6d4db7b`, `b32239a` | 09-22 | 문서 | 이 문서 작성, Cursor `Cmd+Shift+V` 바인딩 정정 |
| 29 | `ee1ec93` | 09-22 23:20 | 기능 | **렌더 보기**(상호작용 커스텀 에디터), **1.0.4** |
| 30 | `b98ecf4`, `089cb72` | 09-23 | 기능 | 렌더 보기를 Cursor Preview 모양에 맞춤(토큰 이식, 토글, 원문식 필드, 들여쓰기), **1.0.5–1.0.6** |
| 31 | `299e02c`, `eaa49e7` | 09-23 | 기능 | 렌더 보기 줄의 `✎ ⏩` 버튼, **1.0.7** |
| 32 | `4070009` | 09-23 | 문서 | 체크리스트 정리(코드로 끝난 항목 체크, D-1~D-5) |
| 33 | (다음) | 09-23 | 기능·문서 | 설계 문서 0.5, Obsidian 호환 테스트 이식 + 차이 3건 수정, 접근성, 칸반 윈도잉, **1.0.8** |

---

### 2. 주제별 상세

#### 2.1 사용자 문서 한국어화와 예시 노트 (#1, #2)

**배경.** 1.0.0의 README/NOTICE/CHANGELOG가 영어로 작성되어 있었고, 주 사용자가 한국어 사용자라는 지적을 받았습니다.

**변경.**
- `README.md`, `NOTICE.md`, `CHANGELOG.md`를 한국어로 다시 썼습니다. 영문 README는 `docs/README.en.md`로 옮겨 Marketplace 등 보조 용도로만 둡니다.
- 테스트용 예시를 `examples/`에 추가했습니다. `샘플-태스크.md`(모든 필드·이모지·반복·의존성이 들어간 태스크), `쿼리-예시.md`(기본/날짜/우선순위/그룹/불리언/레이아웃 등 블록 모음), `.tasks/queries/*.md`(사이드바 저장 쿼리 예시).

**원칙(이후 모든 작업에 적용).** 사용자가 읽는 문서는 한국어, 코드 주석·커밋 메시지·식별자는 영어.

#### 2.2 미리보기 플러그인이 전혀 동작하지 않던 문제 (#3)

**배경.** 마크다운 미리보기에서 태스크 뱃지도, ```tasks 블록 결과도 보이지 않고 원문 그대로 나왔습니다. 사이드바 등 다른 기능은 정상이었습니다.

**원인.** `package.json`의 미리보기 기여점을 `contributes.markdown.markdownItPlugins`처럼 **중첩 객체**로 써 두었는데, VS Code는 **평평한 점 표기 키**(`"markdown.markdownItPlugins": true`, `"markdown.previewStyles": [...]`)만 인식합니다. 그래서 `extendMarkdownIt`가 호출된 적이 없었습니다.

**변경.**
- `package.json`: 위 두 키를 평평한 형태로 수정.
- `tests/settings/schema.test.ts`: 두 키가 평평한 형태로 존재하는지 확인하는 회귀 테스트.
- `tests/integration/preview.test.ts`: 미리보기 엔진에 플러그인이 실제로 적용되는지 확인.
- `docs/design.md`: 기여점 형식 주석.

**검증.** VS Code 테스트 인스턴스와 Cursor에서 CDP(DevTools 프로토콜)로 미리보기 DOM을 확인해 `.tfm-task` 요소와 뱃지가 렌더링되는 것을 확인.

#### 2.3 만들기/편집 단축키의 변천 (#4–#8)

**배경.** 1.0.0의 기본 키는 `Cmd/Ctrl+Alt+T`였습니다. 미리보기가 떠 있는 상태에서 누르자 열려 있던 에디터들이 닫혔습니다.

**원인.** macOS에서 `Cmd+Alt+T`는 VS Code 기본 **"Close Other Editors"**이고, 우리 키의 when 절이 좁아 미리보기 포커스에서는 우리 바인딩이 지지 않고 기본 명령이 실행됐습니다.

**변천.**
1. `6656b0b`: macOS만 `Ctrl+T`. → 사용자가 "윈도우·리눅스도 같은 키로" 요청.
2. `83dc4b1`: 모든 플랫폼 `Ctrl+T`. → macOS에서 `Ctrl+T`는 Cocoa 텍스트 시스템의 **transpose**(문자 교환)라 에디터 안에서 먹히지 않음.
3. `b95cff4`: 다시 `Cmd/Ctrl+Alt+T`, when 절을 넓혀 기본 명령보다 우선하도록. → 사용자가 "vscode/cursor가 안 쓰는 조합"을 원함. `Cmd+T`는 심볼 검색(#)이라 제외.
4. `aaf8eba`: **최종 `Ctrl+Shift+C`** (mac 포함 모든 플랫폼). 
5. `e264464`: 4번 직후 "눌러도 아무 일도 없다"는 보고. when 절이 `!terminalFocus && !inputFocus`였는데, **텍스트 에디터 안에서는 `inputFocus`가 true**라 에디터에서는 바인딩이 꺼져 있었습니다. `!terminalFocus && (editorTextFocus || !inputFocus)`로 수정.

**현재 값.**
```json
{ "command": "tasksmd.createOrEdit", "key": "ctrl+shift+c", "mac": "ctrl+shift+c",
  "when": "!terminalFocus && (editorTextFocus || !inputFocus)" }
```
문서(README, user-guide, 예시 노트)의 키 표기도 매번 함께 갱신했습니다.

#### 2.4 UI 언어 강제: `tasksmd.language` (#9)

**배경.** 한국어 번들(`l10n/bundle.l10n.ko.json`)을 갖추었는데도 UI가 영어로 나왔습니다.

**원인.** `vscode.l10n`은 **에디터 표시 언어**를 따릅니다. 사용자의 Cursor는 영어 UI라 한국어 번들이 선택되지 않았습니다.

**변경(33개 파일).**
- 설정 `tasksmd.language`: `auto`(기본, 에디터 언어) | `en` | `ko`.
- `src/l10n.ts` 신설: `configureLanguage(extensionPath, language)`, `t(key, ...args)`, `currentBundle()`, `currentLanguage()`. `ko`로 강제하면 번들 파일을 직접 읽어 `t()`가 그 번들을 씁니다.
- 호스트 쪽 모든 문자열(`vscode.l10n.t` 호출 31개 파일)을 `src/l10n.ts`의 `t()`로 교체. 웹뷰에는 `state/init.l10n`으로 현재 번들을 넘겨 같은 언어를 씁니다.
- 언어 설정 변경 시 리로드 안내.
- 사용자 환경: Cursor `settings.json`에 `"tasksmd.language": "ko"` 추가(사용자 결정).

#### 2.5 통합 테스트가 자정 이후 실패 (#10)

**원인.** 기대값을 `toISOString()`(UTC)으로 만들어, KST 자정~오전 9시 사이에는 "오늘"이 하루 어긋났습니다.
**변경.** `tests/integration/helpers.ts`에 `localToday()` 추가, 날짜 비교를 로컬 기준으로.

#### 2.6 미리보기·렌더 모드에서 만들기/편집 (#11–#14)

**배경.** 사용자가 Cursor의 "Preview"(WYSIWYG) 모드에서 `Ctrl+Shift+C`로 커서 위치 태스크를 편집하고 싶어 했습니다.

**조사 결과.**
- VS Code 클래식 미리보기는 확장으로 되돌아오는 채널이 없습니다(상대 링크 클릭만 전달).
- Cursor의 Preview 토글은 Cursor 고유 `markdownEditor`(RICH 모드, `Cmd+Shift+V` = `markdownEditor.toggleMode`)로, **선택/커서 API가 없고** 원문 모드로 돌아가도 캐럿이 옮겨지지 않습니다. 따라서 렌더 모드의 커서 위치는 알 수 없습니다.

**변경(`src/commands/editCommands.ts`, `tasksmd.createOrEdit`).** 대상 결정 순서:
1. 명령 인자로 태스크가 오면(CodeLens·사이드바) 그 태스크.
2. 활성 텍스트 에디터의 커서 줄이 태스크면 그 태스크, 아니면 새 태스크.
3. 활성 에디터가 없어도 **보이는 Markdown 에디터**가 있으면 그 커서(미리보기를 옆에 띄운 경우).
4. 그것도 없으면 **활성 탭의 문서**(Cursor 렌더 모드)를 찾아 그 파일의 태스크 목록을 QuickPick으로 보여주고, 마지막 항목 "새 태스크(파일 끝)"를 제공.
- `391bc46`: 편집 대화상자의 `task/load`가 인덱스에서 태스크를 못 찾으면(디바운스 지연) **문서의 해당 줄을 직접 파싱**해 채웁니다. `createOrEdit: …`, `task/load key=… -> …` 로그를 출력 채널에 남깁니다.

**남은 제한.** 렌더 모드에서는 목록에서 고르는 방식이 최선입니다. 이는 Cursor의 편집기 구조 때문이며 확장에서 해결할 수 없습니다.

#### 2.7 Markdown All in One과의 공존 (#15–#22: 적용 → 되돌림 → 재적용)

**배경.** 태스크가 있는 파일만 `Cmd+Shift+V` 미리보기가 **비어** 보였고, 일반 파일은 정상이었습니다. 워크벤치 콘솔에는 플러그인 예외가 찍혔습니다.

**원인.** Markdown All in One이 쓰는 `markdown-it-task-lists`가 같은 파이프라인에서 먼저 실행되어 `[ ] `를 제거하고 `<input class="task-list-item-checkbox">`를 삽입합니다. 우리 플러그인은 원문 `[ ]`를 전제로 상태 기호를 읽다가 예외를 냈고, markdown-it 렌더링 전체가 중단되어 미리보기가 비었습니다.

**변경(`src/preview/markdownItPlugin.ts`, `PreviewIntegration.ts`).**
- 코어 룰 `decorateTaskLines()` 전체를 try/catch로 감싸고 `deps.log`로 기록. 어떤 예외도 미리보기를 비우지 않습니다.
- `FOREIGN_CHECKBOX_RE`로 타 플러그인의 체크박스를 감지해 제거하고, `checked` 여부로 상태 기호(` `/`x`)를 **복구**한 뒤 우리 체크박스와 뱃지를 삽입.
- ```tasks 펜스 렌더러도 try/catch, 실패 시 기본 펜스로 폴백.
- 테스트: `markdown-it-task-lists`를 devDependency로 넣어 두 플러그인을 함께 건 렌더링 테스트(`tests/core/render/markdownIt.test.ts`, `sample-file.test.ts`), 타입 선언 `tests/types/markdown-it-task-lists.d.ts`.

**되돌림과 재적용.** 검증 과정에서 Cursor 바이너리로 통합 테스트를 돌리자 실행마다 Cursor 로그인 창이 떠 사용자를 방해했고, 함께 나타난 다른 증상(라이트 테마 창 등)과 뒤섞여 "그 문제가 뜨기 전으로 돌리자"는 결정으로 #15·#16·#17을 모두 되돌렸습니다(#18–#20). 이후 "충돌이 어떤 것인지" 설명을 듣고 사용자가 "2번(공존 수정)을 다시 적용하자"고 결정해 #16·#17만 재적용했습니다(#21·#22). **#15(Cursor에서 테스트 실행 설정 `.vscode-test.cursor.mjs`, `test:integration:cursor`)는 재적용하지 않았고 삭제된 상태입니다.** Cursor GUI를 자동 실행하는 검증은 하지 않기로 했습니다.

**남은 제한.** 사용자의 Cursor에서 `Cmd+Shift+V`가 비어 보이던 증상은 "무시"하기로 해 재확인하지 않았습니다. 예외 격리로 사라졌을 가능성이 높지만 미검증입니다.

#### 2.8 편집 대화상자 위치와 패널 생성 대상 (#23)

**변경.**
- 편집 대화상자 패널을 `ViewColumn.Beside`로 열어 편집 중인 노트가 계속 보이게 했습니다(`createPanelOpener`에 column 인자 추가).
- `WebviewHost`의 `task/create` 대상 결정: 메시지의 key → `tasksmd.calendar.newTaskFile` → 활성/보이는 Markdown 에디터 → **마지막으로 포커스였던 Markdown 문서**(`lastMarkdownDoc`, 패널로 포커스가 옮겨진 경우) → 그래도 없으면 오류 메시지.
- `task/create -> <uri> line N: <desc>` 로그.

#### 2.9 적용 버튼 무반응: DataCloneError (#24, 1.0.1)

**배경.** 새 태스크 대화상자에서 설명·반복(`every day`)·마감일을 넣고 **적용**을 눌러도 아무 일도 일어나지 않았습니다. 리로드, 옆 열로 열기 후에도 같았습니다.

**원인.** `apply()`가 보내는 `fields` 객체에 Svelte 5 `$state` **프록시**(태그 배열)가 섞여 있었습니다. 웹뷰의 `postMessage`는 인자를 structured clone하는데 프록시는 복제할 수 없어 `DataCloneError`가 나고, 그 뒤의 `ui/close`까지 실행되지 않아 창이 그대로 남았습니다. 검증(반복 규칙·날짜)은 통과했으므로 오류 표시도 없었습니다.

**변경.**
- `src/webviews/shared/vscode.svelte.ts`(구 `vscode.ts`, `$state.snapshot`을 쓰기 위해 `.svelte.ts`로 개명): `post()`가 모든 메시지를 `$state.snapshot()`으로 평범한 객체로 바꾼 뒤 보냅니다. 편집·칸반·캘린더·쿼리 빌더·통계·TaskCard가 모두 이 함수를 쓰므로 한 번에 해결됩니다.
- **웹뷰 컴포넌트 테스트 인프라 신설.** `vitest.webviews.config.mts`(jsdom + `@sveltejs/vite-plugin-svelte@5` + `@testing-library/svelte`), `tests/webviews/setup.ts`(가짜 `acquireVsCodeApi`: **실제처럼 `structuredClone`을 수행**해 같은 회귀를 잡음, `receive()`로 호스트 메시지 주입, ResizeObserver 스텁, 테스트 간 cleanup), `tests/webviews/EditApp.test.ts`(적용 시 `task/create`+`ui/close` 전송, 날짜 없는 반복 차단). 스냅샷을 빼면 테스트가 같은 `DataCloneError`로 실패하는 것을 확인했습니다.
- `pnpm test:webviews` 스크립트, `tsconfig.browser.json`에 `tests/webviews` 포함, 단위 vitest 설정에서 제외, `.vscodeignore`에 테스트 설정 제외.
- devDependencies: `jsdom`, `@sveltejs/vite-plugin-svelte@5`(v7은 vite 5와 비호환), `@testing-library/svelte`.

#### 2.10 캘린더 전체 화면·표시 개수·글자 크기 (#25, #26, 1.0.2)

**배경.** 캘린더가 에디터 그룹의 탭 하나로만 열려 칸이 좁고, 하루에 3개까지만 보여 `+5`, `+12`로 접혔습니다. 글자도 작았습니다.

**변경.**
- `src/webviewHost/PanelFullscreen.ts` 신설: 진입 시 `panel.reveal` → `workbench.action.maximizeEditorHideSidebar`(양쪽 사이드바 숨김 + 활성 그룹 최대화) → `closeSidebar` → `closePanel`; 설정이 `window`면 `toggleFullScreen`까지. 해제 시 역순(창 전체 화면 되돌림 → 그룹이 2개 이상 남아 있을 때만 `toggleMaximizeEditorGroup` → `focusSideBar` → 패널 재표시). 패널이 전체 화면 중 닫히면 `dispose()`가 레이아웃을 복구합니다. 각 명령은 try/catch로 감싸 실패해도 로그만 남깁니다.
- 프로토콜에 `ui/fullscreen {on}` 양방향 메시지. 호스트가 확정 상태를 돌려주고 `uiState.fullscreen`에도 넣어 웹뷰가 다시 로드돼도 버튼 상태가 유지됩니다.
- 모든 에디터 패널(`createPanelOpener`)이 전체 화면 컨트롤러를 갖도록 했고, 캘린더 툴바에 `⤢ 전체 화면 / ⤡ 전체 화면 해제` 버튼, `Esc`로 해제.
- 명령 `tasksmd.openCalendarFullScreen`(캘린더 열기(전체 화면)), `tasksmd.toggleFullScreen`(캘린더: 전체 화면 전환).
- 설정 `tasksmd.calendar.fullScreen`: `maximize`(기본) | `window`.
- 월간 그리드: 요일 헤더 행이 날짜 행과 같은 높이를 차지하던 CSS(`grid-auto-rows`)를 `grid-template-rows: auto repeat(6, …)`로 고쳐 칸을 키웠고, **칸 높이를 측정해 들어가는 만큼 표시**(`maxItems`, 최소 2). 주간 보기 칸은 스크롤.
- `tasksmd.calendar.fontSize`(9–24, 기본 13px; 이전 `0.82em` ≈ 10.7px 고정). 표시 개수 계산도 글자 크기를 따릅니다. `Cmd+=`/`Cmd+-` 창 배율에는 함께 확대·축소됩니다.
- 테스트: `tests/webviewHost-panelFullscreen.test.ts`(명령 순서, 단일 그룹, window 모드, 실패 격리, dispose), `tests/webviews/CalendarApp.test.ts`(버튼→메시지, 상태 반영, Esc, 리로드 후 복원).

**남은 제한.** VS Code에 레이아웃을 읽는 API가 없어 해제는 "진입 때 바꾼 것을 되돌리기"입니다. 진입 전에 사이드바를 닫아 두었더라도 해제 후에는 열립니다. 이미 창 전체 화면 상태에서 `window` 모드로 진입하면 토글이 반대로 동작할 수 있습니다.

#### 2.11 쿼리 결과 패널과 블록 CodeLens (#27, 1.0.3)

**배경.** Cursor의 "Preview" 토글에서 ```tasks 블록이 코드로만 보였습니다.

**원인.** 그 토글은 Cursor 자체 WYSIWYG 편집기라 VS Code 미리보기 엔진(markdown-it)을 쓰지 않으며, 확장 렌더러가 개입할 방법이 없습니다. 결과가 렌더링되는 곳은 VS Code 표준 미리보기(`Cmd+Shift+V`)뿐이었고, 그 미리보기는 사용자 환경에서 검증되지 않은 상태였습니다. 즉 Cursor에서 결과를 볼 통로가 없었습니다.

**변경.**
- 웹뷰 앱 `src/webviews/query-results/` 신설(`QueryResultsApp.svelte`): 블록 텍스트로 `query/run`을 실행해 그룹(재귀 스니펫)·카드(`TaskCard`)로 표시, 일치 수·오류, 쿼리 원문 토글, 새로 고침, **커서 따라가기** 체크박스(`uiState.follow`). 카드 클릭=편집, 더블클릭=원본, 체크박스=완료 전환.
- 프로토콜: `QueryTargetDto {text, source, label}`, `results/query {target}`(호스트→웹뷰), `query/run`에 `source`(문서 상대 경로) 추가 → `{{query.file.folder}}` 등 자리표시자가 패널에서도 동작.
- `src/commands/queryCommands.ts`: `resolveQueryBlock(arg)`(CodeLens 인자 `{uri, line}` 또는 커서), `queryTargetFor()`, 명령 `tasksmd.runQueryAtCursor`. `tasksmd.explainQuery`도 인자를 받습니다.
- `src/webviewHost/registerWebviews.ts`: 패널을 `Beside`로 열고, 열려 있는 동안 `onDidChangeTextEditorSelection` / `onDidChangeActiveTextEditor` / `onDidChangeTextDocument`(300ms 디바운스)를 구독해 커서가 있는 블록으로 대상을 갱신(동일 대상은 재전송하지 않음). 패널이 닫히면 구독 해제. `createPanelOpener`에 `onCreate` 훅 추가.
- `src/editor/TaskCodeLensProvider.ts`: 모든 ```tasks 펜스 줄 위에 `▶ 결과 보기 · ? 설명` CodeLens(코드렌즈 모드가 `off`가 아니면 항상, 최대 20,000줄 검사).
- 테스트: `tests/webviews/QueryResultsApp.test.ts`(source 전달·그룹 렌더링, 커서 따라가기 메시지·카드 토글), 통합 테스트(펜스 두 개의 CodeLens 위치, 명령이 그 블록을 대상으로 패널을 여는지, 커서 이동 시 대상 교체).
- 문서: user-guide 4장을 "패널/표준 미리보기" 두 경로로 재작성하고 FAQ에 Cursor Preview 항목 추가, README·README.en·`examples/쿼리-예시.md` 안내 문구 수정.

#### 2.12 렌더 보기: 상호작용 커스텀 에디터 (#29, 1.0.4)

**배경.** 사용자가 "Preview | Markdown 토글에서 렌더링되지 않으면 별 의미가 없다"고 했습니다.

**조사.** Cursor 번들(`workbench.desktop.main.js`)을 분석한 결과, 그 Preview는 워크벤치 렌더러 안의 Tiptap/ProseMirror 컴포넌트(remark/micromark로 파싱)이고, 확장 호스트 번들(`extensionHostProcess.js`)에는 `markdownEditor` 관련 API가 0건입니다. mermaid 블록만 코드에 하드코딩된 특별 처리입니다. 확장은 별도 프로세스에서 실행되어 워크벤치 DOM에 접근할 수 없으므로, **그 토글 안에 결과를 그리는 것은 어떤 확장도 불가능**합니다.

**결정.** 같은 자리를 차지하는 확장 자체의 렌더 보기를 만들었습니다. `.md` 파일을 여는 또 하나의 에디터(`customEditors`, viewType `tasksmd.rendered`, priority `option`)로 등록되어 탭 안에서 Preview 토글처럼 쓸 수 있고, 미리보기와 달리 상호작용이 됩니다. 처음 요구사항에서 제외한 "편집기 대체"(본문 WYSIWYG 편집)는 아니며, 읽기 + 태스크 조작 뷰입니다.

**변경.**
- `src/preview/renderDocument.ts`: vscode 의존 없는 순수 함수 `renderDocumentHtml()`. 자체 `markdown-it` 인스턴스(`html: false`로 원문 HTML은 이스케이프, `linkify`)에 기존 미리보기 플러그인을 걸어 렌더링. YAML front matter는 **줄 수를 유지한 채** 비워 `data-tfm-line`이 문서 줄과 일치. 체크박스의 `disabled` 제거. 상대 경로 이미지를 webview URI로 치환(절대 URL·data:·앵커는 제외).
- `src/preview/RenderedView.ts`: `RenderedViewProvider implements CustomTextEditorProvider`. 문서 변경(250ms)·인덱스 변경(400ms)·설정 변경 시 재렌더 후 `doc/html` 전송. 메시지 처리: `doc/toggle`(문서 줄 또는 쿼리 결과 행의 path+line → 인덱스에서 태스크를 찾고, 없으면 문서 줄을 직접 파싱 → `TaskEditService.toggle`), `doc/edit`(`tasksmd.createOrEdit`), `doc/link`(외부 URL은 `openExternal`, 상대 경로는 문서 기준으로 열고 `#L<n>`이면 해당 줄로), `doc/openSource`(`vscode.openWith … default`). 오류 시 알림 + 재렌더로 체크박스 상태 되돌림. 활성 렌더 보기 문서를 추적해 `tasksmd.openSource`가 동작.
- `src/webviews/rendered/main.ts`: 프레임워크 없는 1.5KB 페이지 스크립트(초기에는 공용 헬퍼를 썼다가 Svelte 런타임이 딸려와 135KB가 되어 교체). 클릭/더블클릭 위임, 재렌더 시 스크롤 위치 유지.
- 명령 `tasksmd.openRendered`(`Ctrl+Shift+R`), `tasksmd.openRenderedToSide`, `tasksmd.openSource`. 에디터 제목 표시줄 아이콘(마크다운 파일이면 렌더 보기, 렌더 보기 안이면 소스 편집). 같은 키가 두 방향 전환에 쓰입니다.
- `markdown-it`을 devDependencies에서 dependencies로 이동. `PreviewIntegration.pluginDeps()` 분리.
- 테스트: `tests/preview-renderDocument.test.ts`(front matter 줄 번호 유지, 체크박스 활성, 쿼리 결과, 상대 이미지만 치환, 원문 HTML 이스케이프), 통합 테스트(커스텀 에디터 탭이 열리고 소스로 돌아옴).

**후속(1.0.5).** "Preview 토글과 UI/UX가 너무 다르다"는 지적에 따라 Cursor 편집기의 디자인 토큰을 번들에서 추출했습니다(`--rte-font-size-*`, `--cursor-font-size-lg` 14px, `--rte-line-height-base` 1.42, 제목 1.75/1.5/1.25em, 코드 .9em, `.markdown-editor-react__richtext-content` max-width 800px / padding 32px 16px 64px, 배경 `color-mix(fg 6%)`, 테두리 12%/20%, radius 4/6px, 체크박스 accent `--cursor-blue`). 웹뷰에는 `--cursor-*` 변수가 없으므로 `--vscode-editor-foreground/background`, `--vscode-terminal-ansiBlue` 등으로 치환해 같은 비율로 재현했습니다. 상단 툴바를 제거하고 오른쪽 위 `렌더 | 소스` 토글로 바꾸었으며, `Ctrl+Shift+R`은 같은 탭 자리에서 전환하도록 반대편 편집기를 닫습니다(더티 문서는 닫지 않음). 검증은 헤드리스 Chrome으로 예시 노트를 렌더링해 스크린샷으로 확인.

**후속(1.0.6).** 스크린샷 비교에서 남은 차이 네 가지를 맞췄습니다. (1) 필드: 배지+상대 날짜 대신 원문과 같은 이모지+값(`RenderOptions.fieldStyle: 'plain'`, `.tfm-field`; 상대 날짜는 `title`로, 지난 마감·잘못된 날짜는 색). 플러그인의 `renderOptions(source, context)`에 `'line' | 'query'` 컨텍스트를 추가해 문서 줄에만 적용하고 쿼리 결과는 배지를 유지. 설정 `tasksmd.rendered.fieldStyle`(기본 `plain`). (2) 하위 태스크 들여쓰기: `li.tfm-task`의 음수 margin이 중첩 `ul`의 padding과 상쇄되어 평평해지던 것을 `li.tfm-task > ul { margin-left: 1.6em }`으로 복원. (3) 체크박스 17px/radius 5px, 줄 간격 확대. (4) front matter를 상단 키/값 블록으로 표시(`renderDocumentHtml`의 `frontMatter` 옵션, 줄 번호는 그대로 유지). 헤드리스 Chrome 스크린샷으로 재확인.

**남은 제한.** 본문 텍스트 편집은 소스 편집으로 전환해야 합니다. 렌더 보기는 실행 취소 스택을 갖지 않으며(편집은 모두 `TaskEditService`가 원본 파일에 적용) 미리보기 CSS(`media/preview.css`)를 공유하므로 스타일 변경은 두 곳에 함께 반영됩니다.

#### 2.13 체크리스트 잔여 4건 처리 (#33, 1.0.8)

**배경.** docs/Tasks.md에서 제가 처리할 수 있는 미체크 항목 4개를 한 번에 진행했습니다.

**(1) 설계 문서 반영.** design.md 0.5 — 3.2 모듈 트리를 실제 구조로(`preview/RenderedView`, `webviewHost/`, `webviews/query-results`·`rendered`, `l10n.ts`), 5.5에 렌더 보기 배경, 5.6에 1.0.x 메시지 표, **5.7 렌더 보기 시퀀스**(Mermaid → `05-7-rendered-view.svg`, `render-mermaid.py`의 `NAMES`에 추가), 7.1/7.4/7.5 보강, **7.8 렌더 보기·7.9 쿼리 결과 패널** ASCII 목업 + SVG(`gen_mockups.py`에 `rendered()`·`results()` 추가), 9 성능(윈도잉), 14 매핑, 16 이력. SVG는 헤드리스 Chrome으로 렌더링해 확인.

**(2) Obsidian Tasks 테스트 이식.** 원본 저장소를 임시 폴더에 받아 `tests/Query/Filter/*.test.ts`에서 "필터 + 태스크 줄 + 기대값" 형태로 옮길 수 있는 케이스를 골라 `tests/core/query/obsidian-compat.test.ts`(224 케이스, 표 기반)로 이식했습니다. 우리 엔진으로 돌리자 **3건이 실패**했고 모두 우리 쪽 차이여서 고쳤습니다.
- `due in two weeks`: 상대 날짜의 숫자 단어(one…ten, a/an) 미지원 → `DateParser`에 `numberWord()`.
- `id includes DEF`가 `abcdef`에 불일치: id 필터만 대소문자 구분이었음 → Obsidian처럼 무시.
- 불리언 구분자: `( )`만 받았음 → `[ ]`, `{ }`, `" "` 허용(한 줄에 한 종류, 따옴표는 중첩 불가). `parseBoolean`/`tokenizeBoolean`에 open/close 매개변수.
이식하지 않은 것: 정렬·그룹·explain·approval 테스트(우리 출력 형식과 다름), `FunctionField`(JS 함수, 별도 테스트 있음), 전역 필터 조합(설정 의존).

**(3) 접근성.** 칸반: 카드에 `data-key/line`·`aria-label`, 컬럼 `role=group`/목록 `role=list`, **`Alt+←/→`로 옆 컬럼 이동**(`onCardKey`: drop 가능한 다음 컬럼을 찾아 `task/setField`), `aria-live` 안내, 오류 `role=alert`, 힌트 줄. 캘린더: `role=grid`/`gridcell`/`columnheader`, 오늘 칸부터 roving tabindex(`focusDay`), 화살표 이동(가장자리를 넘으면 `move()`로 페이지 전환), `Enter`로 새 태스크, `aria-label`에 날짜와 개수. 결과 패널 일치 수 `aria-live`, 오류 `role=alert`; 편집 대화상자 오류 `role=alert`; 렌더 보기 `focus-within`에 버튼 표시 + `aria-label`. `tokens.css`에 `.sr-only`. 포커스 트랩은 각 웹뷰가 독립 문서라 불필요(편집 대화상자는 `Esc`로 닫힘). 테스트: `KanbanApp.test.ts`(키보드 이동), `CalendarApp.test.ts`(화살표 roving).

**(4) 가상 스크롤.** 칸반 컬럼 150장 이상은 `windowFor()`로 보이는 범위 ± 6장만 렌더(카드 64px 추정, 위·아래 스페이서로 스크롤 높이 유지, `onscroll`로 시작 인덱스 갱신, `bind:clientHeight`로 뷰포트). 카드 높이가 제각각이라 추정치와 어긋나는 부분은 오버스캔이 흡수합니다. 결과 패널 카드와 렌더 보기 쿼리 목록에는 `content-visibility: auto`. 테스트: jsdom에서 `clientHeight`를 600으로 가장해 1,000장 → 60장 미만 렌더, 3장이면 전부 렌더.

#### 2.14 Cursor Preview 토글을 대체하기로 한 결정 (1.4.0)

**요청.** "Preview 버튼을 누르면 Cursor의 Preview가 아니라 `Ctrl+Shift+R` 화면이 뜨게 하자", 그리고 그 화면에 "이번 주 할 일"처럼 정렬·범위를 바꾸는 기능.

**조사와 한계(확정).** Cursor의 "Preview | Markdown" 토글은 Cursor가 `file:/**/*.md`에 priority `default`로 등록한 자체 마크다운 편집기(Tiptap/ProseMirror)가 탭 제목 영역에 직접 그리는 DOM입니다. 확장 기여점이 아니고 끄는 설정도 없으며, 확장 호스트에는 관련 API가 없습니다. 따라서 **버튼의 동작을 바꾸거나 버튼을 없애는 것은 불가능**합니다. `Cmd+Shift+V`는 Cursor 편집기가 활성이면 이 토글(weight 600), 일반 텍스트 편집기가 활성이면 VS Code 클래식 미리보기로 갑니다(같은 키, 다른 화면).

**결정.** Cursor 편집기를 **기본에서 밀어내는 방식**으로 같은 결과를 냅니다. `workbench.editorAssociations["*.md"]`를 `tasksmd.rendered`로 두면 노트가 렌더 보기로 열리고, 소스는 VS Code 기본 텍스트 편집기라 Cursor 토글이 나타나지 않으며, 사용자에게는 우리 `렌더 | 소스` 토글 하나만 보입니다. 사용자 승인 하에 진행(2026-09-26).

**구현.** 명령 `tasksmd.renderedAsDefault`(설정/해제 QuickPick, 사용자 설정에 기록), 첫 렌더 보기에서 한 번 제안(`globalState` `rendered.defaultPrompted`), 태스크 없는 노트는 텍스트 편집기로 넘김(`rendered.sourceWhenNoTasks`, 명시적 열기는 예외: `explicitOpen`). 정렬·보기 툴바는 `webviews/rendered/view.ts`(순수 DOM 함수, jsdom 테스트 4건)와 플러그인의 `data-tfm-*` 속성으로 구현, 파일은 불변, 상태는 파일별 `workspaceState`.

**대가(명시).** 이 방식에서는 Cursor의 WYSIWYG 본문 편집을 쓰지 않게 됩니다. 본문은 소스에서 고치고, 태스크 조작은 렌더 보기에서 합니다. 되돌리려면 같은 명령에서 "텍스트 편집기"를 고르면 됩니다.

---

### 3. 삭제되었거나 되돌린 것

| 항목 | 상태 | 이유 |
|---|---|---|
| `Cmd/Ctrl+Alt+T`, `Ctrl+T` 단축키 | 삭제 → `Ctrl+Shift+C` | macOS 기본 명령·Cocoa 키와 충돌 |
| `.vscode-test.cursor.mjs`, `test:integration:cursor` 스크립트 (#15) | 되돌림 후 재적용 안 함 | Cursor GUI 자동 실행 시 매번 로그인 창 |
| `tests/integration/preview.test.ts`의 "내장 엔진이 플러그인을 적용한다" 단언 (#15) | 되돌림 후 재적용 안 함 | 위와 같은 커밋에 포함 |
| `contributes.markdown.*` 중첩 키 | 삭제 | VS Code가 인식하지 않는 형식 |
| `src/webviews/shared/vscode.ts` | `vscode.svelte.ts`로 개명 | `$state.snapshot` 사용을 위해 Svelte 모듈이어야 함 |
| 캘린더 월간 "3개 고정" 표시 | 삭제 | 칸 높이 기반 계산으로 대체 |
| 캘린더 `.item { font-size: 0.82em }` | 삭제 | `--tfm-cal-font`(설정값)로 대체 |
| `vscode.l10n.t` 직접 호출 | 전부 `src/l10n.ts`의 `t()`로 교체 | 언어 강제 설정 |

`git revert`로 남긴 되돌림 커밋(#18–#20)과 재적용 커밋(#21–#22)은 이력에 그대로 있습니다.

---

### 4. 설정·명령·단축키 변경 요약

**추가된 설정**

| 설정 | 기본값 | 도입 |
|---|---|---|
| `tasksmd.language` | `auto` | 1.0.1 이전(#9) |
| `tasksmd.calendar.fullScreen` | `maximize` | 1.0.2 |
| `tasksmd.calendar.fontSize` | `13` | 1.0.2 |

**추가된 명령**

| 명령 ID | 팔레트 이름(한국어) | 도입 |
|---|---|---|
| `tasksmd.openCalendarFullScreen` | 캘린더 열기(전체 화면) | 1.0.2 |
| `tasksmd.toggleFullScreen` | 캘린더: 전체 화면 전환 | 1.0.2 |
| `tasksmd.runQueryAtCursor` | 커서 위치 쿼리 결과 보기 | 1.0.3 |

**동작이 바뀐 명령**
- `tasksmd.createOrEdit`: 대상 결정 4단계(2.6절), 대화상자 옆 열에 열림.
- `tasksmd.explainQuery`: CodeLens 인자 `{uri, line}` 허용.

**단축키**: `Ctrl+Shift+C`(모든 플랫폼) — 만들기/편집.

**사용자 환경(settings.json)에 추가된 값(사용자 결정)**: `"tasksmd.language": "ko"`, `"tasksmd.setCreatedDate": true`.

---

### 5. 테스트 현황과 인프라 변화

| 종류 | 실행 | 개수(1.0.3) | 비고 |
|---|---|---|---|
| 단위 | `pnpm test` (vitest, node) | 475 | `tests/webviews`, `tests/integration` 제외 |
| 웹뷰 컴포넌트 | `pnpm test:webviews` (vitest, jsdom, Svelte 플러그인) | 6 | 1.0.1에서 신설. EditApp 2, CalendarApp 2, QueryResultsApp 2 |
| 통합 | `pnpm test:integration` (@vscode/test-cli, VS Code 테스트 인스턴스) | 38 | 1.0 시점 37 → 쿼리 결과 패널 1 추가 |

- 1.0 시점 대비 단위 테스트 4개(PanelFullscreen), 회귀 테스트(기여점 키, 플러그인 공존, l10n 커버리지 확장) 추가.
- `tsconfig.json`은 `tests/webviews`를 제외하고 `tsconfig.browser.json`(DOM lib)이 포함합니다. `pnpm typecheck`는 둘 다 검사합니다.
- 통합 테스트는 **VS Code 테스트 인스턴스**(`.vscode-test/` 다운로드본)로만 돌립니다. Cursor 바이너리로는 돌리지 않습니다.
- 통합 테스트는 픽스처를 `FixtureGuard`로 복구하고, 마지막 `zz-teardown` 테스트가 더러워진 문서를 되돌립니다.

---

### 6. 알려진 제한과 미결 항목

**환경 제약(확장에서 해결 불가)**
- Cursor "Preview"(WYSIWYG) 모드: 확장 렌더러 미적용, 커서 위치 미제공. 대안: 쿼리 결과 패널(2.11), 태스크 목록 QuickPick(2.6).
- VS Code 클래식 미리보기: 표시 전용(클릭이 확장으로 오지 않음).
- 레이아웃 읽기 API 부재: 전체 화면 해제가 이전 상태를 정확히 복원하지 못함(2.10).

**미검증**
- 사용자 Cursor에서 VS Code 표준 미리보기가 비어 보이던 증상(사용자가 무시하기로 함). **추가 발견(09-22):** Cursor는 `Cmd+Shift+V`를 자체 `markdownEditor.toggleMode`(weight 600, `markdownEditorActive`일 때)에 묶어 두어 Markdown 확장의 `markdown.showPreview`(같은 키)를 덮습니다. 즉 Cursor에서 `Cmd+Shift+V`는 VS Code 미리보기가 아니라 Cursor WYSIWYG 토글입니다. VS Code 미리보기는 `Cmd+K V`(`markdown.showPreviewToSide`) 또는 명령 팔레트로 엽니다. 이 키로는 미검증.
- 한국어 UI가 리로드 후 실제로 표시되는지에 대한 사용자 확인.

**사용자 결정 대기(제안만 한 상태)**
- 완료 시 태스크를 목록 하단으로 이동하는 옵션.
- Obsidian Tasks의 Global Query(모든 쿼리에 자동 적용되는 공통 필터).
- 트리 표시(하위 태스크 들여쓰기 유지) — 구현 권장.
- Presets(쿼리 프리셋 치환) — 우선순위 낮음.

**운영 항목(docs/Tasks.md M8.7)**: 수동 체크리스트, 퍼블리셔·토큰 설정, 저장소 공개 범위.

---

### 7. 배포·설치 방법(현재 방식)

```bash
pnpm package        # dist 정리 → 프로덕션 빌드 → vsce package → dist/latest.json
/Applications/Cursor.app/Contents/Resources/app/bin/cursor --install-extension tasks-for-markdown-<버전>.vsix --force
```
설치 후 Cursor에서 `Developer: Reload Window`. 저장소에는 최신 `.vsix`만 남기고 이전 버전 파일은 삭제합니다(`.vsix`는 커밋하지 않음).

---

### 8. 작업 중 얻은 교훈(재발 방지)

- **파이프 체인이 실패를 숨긴다.** `pnpm test | grep …`처럼 쓰면 종료 코드가 grep의 것이 되어 실패한 채 커밋된 적이 있습니다. 이후 `set -o pipefail`과 `PIPESTATUS`로 확인합니다.
- **치환 스크립트의 빈 슬라이스.** Python으로 소스를 치환하다 `editCommands.ts`를 두 번 비운 적이 있습니다. 치환 전 `assert a in s`로 대상 존재를 확인하고, 사고 시 `git checkout`으로 복구했습니다.
- **Cursor GUI를 자동으로 띄우지 않는다.** 로그인 창이 사용자를 방해합니다. Cursor 고유 동작은 번들 코드 정적 분석(`workbench.desktop.main.js`에서 명령 ID 존재 확인 등) → VS Code 테스트 인스턴스 → 사용자 확인 절차 순으로 검증합니다.
- **웹뷰 테스트의 가짜 API는 실제와 같은 제약을 가져야 한다.** `postMessage` 가짜가 clone을 하지 않으면 DataCloneError류 회귀를 놓칩니다.
- **VS Code 기여점은 평평한 점 표기 키**(`markdown.markdownItPlugins`)를 쓴다. 중첩 객체는 조용히 무시됩니다.
- **`inputFocus`는 텍스트 에디터 안에서도 true**다. 키바인딩 when 절에 `!inputFocus`만 쓰면 에디터에서 꺼진다.
