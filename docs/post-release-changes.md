# 1.0 완료 이후 변경 기록

**기준 시점:** 커밋 `9a4c8a7` (2026-09-21 20:34, "docs: checklist 1.0 — M0–M8 implementation complete") — 개발 체크리스트(docs/Tasks.md)의 M0–M8을 모두 끝내고 1.0.0으로 표시한 시점입니다.
**기록 범위:** 그 이후 `7fb8cc7` (2026-09-22 15:43, 1.0.3)까지의 커밋 27개.
**규모:** 77개 파일, +2,804 / −422 줄. 그중 소스(`src/`) 41개 파일 +822/−264, 테스트(`tests/`) 13개 파일 +374/−4, 문서·예시 11개 파일 +533/−126.
**버전:** 1.0.0 → 1.0.1 → 1.0.2 → 1.0.3. 각 버전의 요약은 [CHANGELOG.md](../CHANGELOG.md)에 있고, 이 문서는 그 뒤에 있는 배경·원인·판단·되돌린 것까지 적는 상세 기록입니다.

이 기록은 실제 사용(Cursor 1.x, macOS)에서 발견된 문제를 고치고 요청받은 기능을 더한 것이 대부분입니다. 항목마다 **배경 → 원인 → 변경 → 검증 → 남은 제한** 순서로 적었습니다.

---

## 1. 타임라인

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

---

## 2. 주제별 상세

### 2.1 사용자 문서 한국어화와 예시 노트 (#1, #2)

**배경.** 1.0.0의 README/NOTICE/CHANGELOG가 영어로 작성되어 있었고, 주 사용자가 한국어 사용자라는 지적을 받았습니다.

**변경.**
- `README.md`, `NOTICE.md`, `CHANGELOG.md`를 한국어로 다시 썼습니다. 영문 README는 `docs/README.en.md`로 옮겨 Marketplace 등 보조 용도로만 둡니다.
- 테스트용 예시를 `examples/`에 추가했습니다. `샘플-태스크.md`(모든 필드·이모지·반복·의존성이 들어간 태스크), `쿼리-예시.md`(기본/날짜/우선순위/그룹/불리언/레이아웃 등 블록 모음), `.tasks/queries/*.md`(사이드바 저장 쿼리 예시).

**원칙(이후 모든 작업에 적용).** 사용자가 읽는 문서는 한국어, 코드 주석·커밋 메시지·식별자는 영어.

### 2.2 미리보기 플러그인이 전혀 동작하지 않던 문제 (#3)

**배경.** 마크다운 미리보기에서 태스크 뱃지도, ```tasks 블록 결과도 보이지 않고 원문 그대로 나왔습니다. 사이드바 등 다른 기능은 정상이었습니다.

**원인.** `package.json`의 미리보기 기여점을 `contributes.markdown.markdownItPlugins`처럼 **중첩 객체**로 써 두었는데, VS Code는 **평평한 점 표기 키**(`"markdown.markdownItPlugins": true`, `"markdown.previewStyles": [...]`)만 인식합니다. 그래서 `extendMarkdownIt`가 호출된 적이 없었습니다.

**변경.**
- `package.json`: 위 두 키를 평평한 형태로 수정.
- `tests/settings/schema.test.ts`: 두 키가 평평한 형태로 존재하는지 확인하는 회귀 테스트.
- `tests/integration/preview.test.ts`: 미리보기 엔진에 플러그인이 실제로 적용되는지 확인.
- `docs/design.md`: 기여점 형식 주석.

**검증.** VS Code 테스트 인스턴스와 Cursor에서 CDP(DevTools 프로토콜)로 미리보기 DOM을 확인해 `.tfm-task` 요소와 뱃지가 렌더링되는 것을 확인.

### 2.3 만들기/편집 단축키의 변천 (#4–#8)

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

### 2.4 UI 언어 강제: `tasksmd.language` (#9)

**배경.** 한국어 번들(`l10n/bundle.l10n.ko.json`)을 갖추었는데도 UI가 영어로 나왔습니다.

**원인.** `vscode.l10n`은 **에디터 표시 언어**를 따릅니다. 사용자의 Cursor는 영어 UI라 한국어 번들이 선택되지 않았습니다.

**변경(33개 파일).**
- 설정 `tasksmd.language`: `auto`(기본, 에디터 언어) | `en` | `ko`.
- `src/l10n.ts` 신설: `configureLanguage(extensionPath, language)`, `t(key, ...args)`, `currentBundle()`, `currentLanguage()`. `ko`로 강제하면 번들 파일을 직접 읽어 `t()`가 그 번들을 씁니다.
- 호스트 쪽 모든 문자열(`vscode.l10n.t` 호출 31개 파일)을 `src/l10n.ts`의 `t()`로 교체. 웹뷰에는 `state/init.l10n`으로 현재 번들을 넘겨 같은 언어를 씁니다.
- 언어 설정 변경 시 리로드 안내.
- 사용자 환경: Cursor `settings.json`에 `"tasksmd.language": "ko"` 추가(사용자 결정).

### 2.5 통합 테스트가 자정 이후 실패 (#10)

**원인.** 기대값을 `toISOString()`(UTC)으로 만들어, KST 자정~오전 9시 사이에는 "오늘"이 하루 어긋났습니다.
**변경.** `tests/integration/helpers.ts`에 `localToday()` 추가, 날짜 비교를 로컬 기준으로.

### 2.6 미리보기·렌더 모드에서 만들기/편집 (#11–#14)

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

### 2.7 Markdown All in One과의 공존 (#15–#22: 적용 → 되돌림 → 재적용)

**배경.** 태스크가 있는 파일만 `Cmd+Shift+V` 미리보기가 **비어** 보였고, 일반 파일은 정상이었습니다. 워크벤치 콘솔에는 플러그인 예외가 찍혔습니다.

**원인.** Markdown All in One이 쓰는 `markdown-it-task-lists`가 같은 파이프라인에서 먼저 실행되어 `[ ] `를 제거하고 `<input class="task-list-item-checkbox">`를 삽입합니다. 우리 플러그인은 원문 `[ ]`를 전제로 상태 기호를 읽다가 예외를 냈고, markdown-it 렌더링 전체가 중단되어 미리보기가 비었습니다.

**변경(`src/preview/markdownItPlugin.ts`, `PreviewIntegration.ts`).**
- 코어 룰 `decorateTaskLines()` 전체를 try/catch로 감싸고 `deps.log`로 기록. 어떤 예외도 미리보기를 비우지 않습니다.
- `FOREIGN_CHECKBOX_RE`로 타 플러그인의 체크박스를 감지해 제거하고, `checked` 여부로 상태 기호(` `/`x`)를 **복구**한 뒤 우리 체크박스와 뱃지를 삽입.
- ```tasks 펜스 렌더러도 try/catch, 실패 시 기본 펜스로 폴백.
- 테스트: `markdown-it-task-lists`를 devDependency로 넣어 두 플러그인을 함께 건 렌더링 테스트(`tests/core/render/markdownIt.test.ts`, `sample-file.test.ts`), 타입 선언 `tests/types/markdown-it-task-lists.d.ts`.

**되돌림과 재적용.** 검증 과정에서 Cursor 바이너리로 통합 테스트를 돌리자 실행마다 Cursor 로그인 창이 떠 사용자를 방해했고, 함께 나타난 다른 증상(라이트 테마 창 등)과 뒤섞여 "그 문제가 뜨기 전으로 돌리자"는 결정으로 #15·#16·#17을 모두 되돌렸습니다(#18–#20). 이후 "충돌이 어떤 것인지" 설명을 듣고 사용자가 "2번(공존 수정)을 다시 적용하자"고 결정해 #16·#17만 재적용했습니다(#21·#22). **#15(Cursor에서 테스트 실행 설정 `.vscode-test.cursor.mjs`, `test:integration:cursor`)는 재적용하지 않았고 삭제된 상태입니다.** Cursor GUI를 자동 실행하는 검증은 하지 않기로 했습니다.

**남은 제한.** 사용자의 Cursor에서 `Cmd+Shift+V`가 비어 보이던 증상은 "무시"하기로 해 재확인하지 않았습니다. 예외 격리로 사라졌을 가능성이 높지만 미검증입니다.

### 2.8 편집 대화상자 위치와 패널 생성 대상 (#23)

**변경.**
- 편집 대화상자 패널을 `ViewColumn.Beside`로 열어 편집 중인 노트가 계속 보이게 했습니다(`createPanelOpener`에 column 인자 추가).
- `WebviewHost`의 `task/create` 대상 결정: 메시지의 key → `tasksmd.calendar.newTaskFile` → 활성/보이는 Markdown 에디터 → **마지막으로 포커스였던 Markdown 문서**(`lastMarkdownDoc`, 패널로 포커스가 옮겨진 경우) → 그래도 없으면 오류 메시지.
- `task/create -> <uri> line N: <desc>` 로그.

### 2.9 적용 버튼 무반응: DataCloneError (#24, 1.0.1)

**배경.** 새 태스크 대화상자에서 설명·반복(`every day`)·마감일을 넣고 **적용**을 눌러도 아무 일도 일어나지 않았습니다. 리로드, 옆 열로 열기 후에도 같았습니다.

**원인.** `apply()`가 보내는 `fields` 객체에 Svelte 5 `$state` **프록시**(태그 배열)가 섞여 있었습니다. 웹뷰의 `postMessage`는 인자를 structured clone하는데 프록시는 복제할 수 없어 `DataCloneError`가 나고, 그 뒤의 `ui/close`까지 실행되지 않아 창이 그대로 남았습니다. 검증(반복 규칙·날짜)은 통과했으므로 오류 표시도 없었습니다.

**변경.**
- `src/webviews/shared/vscode.svelte.ts`(구 `vscode.ts`, `$state.snapshot`을 쓰기 위해 `.svelte.ts`로 개명): `post()`가 모든 메시지를 `$state.snapshot()`으로 평범한 객체로 바꾼 뒤 보냅니다. 편집·칸반·캘린더·쿼리 빌더·통계·TaskCard가 모두 이 함수를 쓰므로 한 번에 해결됩니다.
- **웹뷰 컴포넌트 테스트 인프라 신설.** `vitest.webviews.config.mts`(jsdom + `@sveltejs/vite-plugin-svelte@5` + `@testing-library/svelte`), `tests/webviews/setup.ts`(가짜 `acquireVsCodeApi`: **실제처럼 `structuredClone`을 수행**해 같은 회귀를 잡음, `receive()`로 호스트 메시지 주입, ResizeObserver 스텁, 테스트 간 cleanup), `tests/webviews/EditApp.test.ts`(적용 시 `task/create`+`ui/close` 전송, 날짜 없는 반복 차단). 스냅샷을 빼면 테스트가 같은 `DataCloneError`로 실패하는 것을 확인했습니다.
- `pnpm test:webviews` 스크립트, `tsconfig.browser.json`에 `tests/webviews` 포함, 단위 vitest 설정에서 제외, `.vscodeignore`에 테스트 설정 제외.
- devDependencies: `jsdom`, `@sveltejs/vite-plugin-svelte@5`(v7은 vite 5와 비호환), `@testing-library/svelte`.

### 2.10 캘린더 전체 화면·표시 개수·글자 크기 (#25, #26, 1.0.2)

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

### 2.11 쿼리 결과 패널과 블록 CodeLens (#27, 1.0.3)

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

---

## 3. 삭제되었거나 되돌린 것

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

## 4. 설정·명령·단축키 변경 요약

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

## 5. 테스트 현황과 인프라 변화

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

## 6. 알려진 제한과 미결 항목

**환경 제약(확장에서 해결 불가)**
- Cursor "Preview"(WYSIWYG) 모드: 확장 렌더러 미적용, 커서 위치 미제공. 대안: 쿼리 결과 패널(2.11), 태스크 목록 QuickPick(2.6).
- VS Code 클래식 미리보기: 표시 전용(클릭이 확장으로 오지 않음).
- 레이아웃 읽기 API 부재: 전체 화면 해제가 이전 상태를 정확히 복원하지 못함(2.10).

**미검증**
- 사용자 Cursor에서 `Cmd+Shift+V` 표준 미리보기가 여전히 비어 보이는지(사용자가 무시하기로 함). 재확인 권장: 1.0.1 이후 예외 격리로 해결됐을 가능성.
- 한국어 UI가 리로드 후 실제로 표시되는지에 대한 사용자 확인.

**사용자 결정 대기(제안만 한 상태)**
- 완료 시 태스크를 목록 하단으로 이동하는 옵션.
- Obsidian Tasks의 Global Query(모든 쿼리에 자동 적용되는 공통 필터).
- 트리 표시(하위 태스크 들여쓰기 유지) — 구현 권장.
- Presets(쿼리 프리셋 치환) — 우선순위 낮음.

**운영 항목(docs/Tasks.md M8.7)**: 수동 체크리스트, 퍼블리셔·토큰 설정, 저장소 공개 범위.

---

## 7. 배포·설치 방법(현재 방식)

```bash
pnpm package        # dist 정리 → 프로덕션 빌드 → vsce package → dist/latest.json
/Applications/Cursor.app/Contents/Resources/app/bin/cursor --install-extension tasks-for-markdown-<버전>.vsix --force
```
설치 후 Cursor에서 `Developer: Reload Window`. 저장소에는 최신 `.vsix`만 남기고 이전 버전 파일은 삭제합니다(`.vsix`는 커밋하지 않음).

---

## 8. 작업 중 얻은 교훈(재발 방지)

- **파이프 체인이 실패를 숨긴다.** `pnpm test | grep …`처럼 쓰면 종료 코드가 grep의 것이 되어 실패한 채 커밋된 적이 있습니다. 이후 `set -o pipefail`과 `PIPESTATUS`로 확인합니다.
- **치환 스크립트의 빈 슬라이스.** Python으로 소스를 치환하다 `editCommands.ts`를 두 번 비운 적이 있습니다. 치환 전 `assert a in s`로 대상 존재를 확인하고, 사고 시 `git checkout`으로 복구했습니다.
- **Cursor GUI를 자동으로 띄우지 않는다.** 로그인 창이 사용자를 방해합니다. Cursor 고유 동작은 번들 코드 정적 분석(`workbench.desktop.main.js`에서 명령 ID 존재 확인 등) → VS Code 테스트 인스턴스 → 사용자 확인 절차 순으로 검증합니다.
- **웹뷰 테스트의 가짜 API는 실제와 같은 제약을 가져야 한다.** `postMessage` 가짜가 clone을 하지 않으면 DataCloneError류 회귀를 놓칩니다.
- **VS Code 기여점은 평평한 점 표기 키**(`markdown.markdownItPlugins`)를 쓴다. 중첩 객체는 조용히 무시됩니다.
- **`inputFocus`는 텍스트 에디터 안에서도 true**다. 키바인딩 when 절에 `!inputFocus`만 쓰면 에디터에서 꺼진다.
