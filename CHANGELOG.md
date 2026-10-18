# Changelog

## Unreleased (1.1.5)

- **Add tasks in the rendered view.** Click a task row and press `Enter` (or ＋ on the row, or "＋ Add task" at the end of a list): an input opens right below it, at the same depth. `Enter` writes `- [ ] …` there and opens the next input, so you can add several in a row; `Esc` or an empty `Enter` stops. One line per task, so Undo takes it back. Not in query results.
- The `Ctrl+Shift+C` command is now called **Tasks: Add or remove checkbox** (Korean: **체크박스 만들기/지우기**). "Toggle checkbox" read like checking a task off, which is `Ctrl+Shift+Enter` (**Toggle task done**). The key and what it does are unchanged.

### 한국어 요약
- **렌더 보기에서 태스크 넣기:** 줄을 클릭하고 `Enter`(또는 줄의 ＋, 목록 끝 "＋ 태스크 추가") → 바로 아래 입력칸, `Enter`로 넣고 다음 칸이 이어서 열림. `Esc`로 끝. 쿼리 결과 안은 제외.
- `Ctrl+Shift+C` 명령 이름을 **체크박스 만들기/지우기**(영어 Add or remove checkbox)로 바꿈 — "체크박스 토글"이 완료 전환(`Ctrl+Shift+Enter`)처럼 읽혀서. 키와 동작은 그대로.

## 1.1.4 — 2026-10-16

**Editor — keys changed**
- **`Ctrl+Shift+C` now toggles a checkbox; the create/edit dialog moved to `Ctrl+Shift+/`.** The quick, frequent action gets the one-hand key. (Change either in Keyboard Shortcuts if you prefer the old layout.)
- `Ctrl+Shift+C` (**Tasks: Toggle checkbox**) turns the current line — or every selected line — into a checklist item (`- [ ] …`, a bullet keeps its marker) and takes the box off a task line. The quick way to make a task without the dialog; the dialog opens with `Ctrl+Shift+/`.
- The date picker button in the create/edit dialog is drawn whole again, on dark themes too (its icon was clipped and dark on dark).

### 한국어 요약
- **키 변경:** `Ctrl+Shift+C` = 체크박스 토글(현재 줄 또는 선택한 줄을 `- [ ] …`로, 태스크 줄이면 제거), 만들기/편집 대화상자는 `Ctrl+Shift+/`로 이동.
- **편집 창 날짜 선택 아이콘** 잘림·다크 테마에서 안 보이던 문제 수정.

## 1.1.3 — 2026-10-15

**CLI**
- `tasksmd --version` (`-v`) prints the version. An unknown option on its own now says which option it did not understand instead of printing the whole help page.

**`tasksmd` in one step**
- Installing the `tasksmd` command now makes it available in this editor's new terminals right away, on every platform (no restart, no shell profile edits). On Windows the extension also adds the folder to your user Path, so terminals opened from Start work too; uninstalling removes both.

### 한국어 요약
- **CLI:** `tasksmd --version`(`-v`) 추가, 모르는 옵션은 도움말 전체 대신 "Unknown option"으로.
- **`tasksmd` 설치 한 번에:** 설치하면 이 에디터의 새 터미널에서 바로 동작(모든 플랫폼, 재시작·셸 설정 편집 없음). Windows는 사용자 Path에도 자동 추가(제거하면 함께 삭제).

## 1.1.2 — 2026-10-15

**Windows**
- **Tasks: Connect AI agents (MCP)** now connects Claude Code on Windows. It ran `claude` through cmd.exe, which broke the quoted settings it passes, so nothing was added. `claude.exe` now starts directly, and an npm-installed `claude.cmd` runs its script on the editor's Node. The fallback command to copy (when `claude` is not on PATH) uses `claude mcp add` (no JSON) with the `--` separator quoted as `"--"`: in PowerShell an npm-installed `claude` runs through `claude.ps1`, which drops a bare `--`, so the line failed there with "unknown option '--root'". Quoted, it works in cmd and PowerShell.
- Claude Code's connection is saved for the folder as your terminal names it: VS Code reports Windows folders with a lowercase drive letter (`c:\…`), so the server was stored for `c:/…` and `claude mcp list` run from `C:\…` showed nothing. The "already connected" check also never matched on Windows, so the connect prompt kept coming back.
- Installing the `tasksmd` command explains how to add its folder to your user Path on Windows (Settings, or a PowerShell line that changes only the user Path) instead of macOS wording and `setx`, which cuts long Paths.

### 한국어 요약
- **Windows:** Claude Code 연결이 실패하던 문제 수정(cmd.exe를 거치며 설정 인자가 깨짐 → `claude.exe`는 직접, npm `claude.cmd`는 에디터 Node로 실행). 복사용 명령의 `--`는 `"--"`로(PowerShell에서 npm `claude.ps1`이 맨 `--`를 떨어뜨려 실패하던 문제). `tasksmd` 설치 후 PATH 안내를 Windows용으로(환경 변수 설정 또는 사용자 Path만 바꾸는 PowerShell 한 줄, `setx` 사용 안 함). 연결이 소문자 드라이브 문자 경로(`c:/…`)에 저장돼 터미널에서 안 보이던 문제와, "이미 연결됨" 확인이 늘 실패하던 문제 수정.

## 1.1.1 — 2026-10-12

**Rendered view columns**
- Column titles are always shown above query results and task lists; ✕, the + chips and the width grips appear on hover or focus.
- Dragging a column boundary follows the pointer and the table's right edge stays put: the columns beside it trade width, and when one reaches its limit the next one takes over (columns 3–80em, description at least 8em). Before, every boundary between the description and the dragged column moved with it, and a column at 40em could not be dragged further.
- A **Done date** column between Created date and Other fields (✅ no longer sits in Other fields; cancelled dates stay there). It can be hidden and resized like the others.
- Double-click a column's grip to fit the column to its widest content, like a spreadsheet (Home still resets to the default width).

**Other**
- README links the bundled open-source licenses (THIRD_PARTY_NOTICES.md).
- Open VSX releases are published with trusted publishing (no stored token).

### 한국어 요약
- **렌더 보기 열:** 열 이름 항상 표시(✕·`+`·손잡이는 마우스를 올릴 때), 경계를 끌면 그 경계가 마우스를 따라감(양옆 열이 주고받고, 한도에 닿으면 다음 열이 이어받음, 최대 80em), 손잡이 더블클릭 = 내용에 맞춤, **완료일 열** 추가(생성일과 나머지 필드 사이).

## 1.1.0 — 2026-10-08

**AI agents and the terminal without npm**
- The MCP server is now bundled in the extension and runs on the editor's own Node — no Node.js or npm needed.
- VS Code (agent mode) and Cursor: the server is registered automatically, one per workspace folder (`tasksmd.mcp.autoRegister`, on by default; not in untrusted workspaces).
- **Tasks: Connect AI agents (MCP)** adds it to Claude Code (this project on this computer) or Claude Desktop (config file updated after confirmation, with a backup). Tools that are installed but not connected start checked; connected ones are shown as "connected". If Claude Code or Claude Desktop is installed but not connected, a prompt offers to connect it each time the editor starts (until connected or "Don't ask again").
- **Tasks: Install 'tasksmd' terminal command** / **Uninstall** — the CLI in any terminal; keeps working after updates.
- A "Get started" walkthrough (first task, queries and the rendered view, AI agents, terminal command), opened once on the first launch and with **Tasks: Open Get Started guide**; the guide is offered again on the second and third day of use, and until the `tasksmd` command is installed (or "Don't ask again") a prompt offers it each time the editor starts. README link: `…/guide`.
- Insert query block, Open rendered view and the query builder's "insert into note" act on the note you were working on, even when another tab (such as the walkthrough) is in front; with no note open, Insert query block opens a sample note.

**Licenses**
- `THIRD_PARTY_NOTICES.md` lists every bundled open-source package with its license text (generated at build time). Earlier releases missed several (markdown-it and its dependencies, clsx, esm-env, and in the npm CLI the MCP SDK, zod and ajv).

**AI results**
- MCP `tasks_query` / `tasks_get` results are much smaller for agents: each task once (no repeated `groups` / `tree` copies), empty fields left out, compact JSON — about 11% of the previous size for the same query. With `group by`, `groups` lists task indexes.
- MCP tools carry standard annotations: the six lookup tools are read-only, `tasks_remove` is marked destructive, the other edits are not — clients can use them in their permission prompts.
- Claude Desktop's config is written only after Claude Desktop is closed; while it runs it can overwrite the file and drop the connection.

**Task links**
- `vscode://hastycapybara.tasks-for-markdown/open?path=…&line=…` opens a task from any app; `/query?text=…` shows a query's results (Cursor: `cursor://…`).
- **Tasks: Copy link to task**, **Copy link to query under cursor**.
- **API:** `ui.link(ref)` and command `tasksmd.api.ui.link`, feature `links`.

### 한국어 요약
- **npm 없이 AI 에이전트와 터미널:** MCP 서버를 확장에 넣어 에디터 내장 Node로 실행. VS Code 에이전트 모드와 Cursor는 자동 연결(`tasksmd.mcp.autoRegister`), `Tasks: AI 에이전트 연결 (MCP)`로 Claude Code·Claude Desktop 연결, `'tasksmd' 터미널 명령 설치/제거`, 시작 안내 페이지.
- **AI 응답·연결:** MCP 조회 결과를 약 11%로 줄임(태스크마다 한 번, 빈 필드 생략), 도구에 읽기 전용·삭제 표시(annotations), Claude Desktop은 꺼져 있을 때만 설정을 씀, 연결 선택 창에 "연결됨" 표시, 설치·연결 안내 알림.
- **라이선스:** 포함된 오픈소스 목록과 라이선스 전문 `THIRD_PARTY_NOTICES.md`(1.0.0부터 빠져 있던 것 보완).
- **태스크 링크:** `vscode://hastycapybara.tasks-for-markdown/open?…`, `/query?…`, 링크 복사 명령 2개, API `ui.link`(기능 `links`).

## 1.0.1 — 2026-10-05

**Fixes**
- Webviews (kanban, calendar, statistics, query builder, dialog) now show their first screen in the configured language; toolbars could stay in English with Korean selected.
- The create/edit dialog's Tags placeholder was Korean in the English UI.
- Query explanations show ordinal dates (`Sunday 4th October 2026`, was `4o`).
- Rendered view: the `+` chip that brings back a hidden column no longer covers the last column title.

**Docs**
- README rewritten: why use it, a three-step getting started, query syntax cheat sheet, using it with AI agents (MCP setup for Claude Code, Cursor, VS Code and Claude Desktop), building on the public API, animated examples (English and Korean), complete settings table, website link.
- VS Code's `.vscode/mcp.json` example now uses the `servers` key.

### 한국어 요약
- **수정:** 한국어 설정에서 칸반 등 웹뷰 첫 화면 일부가 영어로 나오던 문제, 영어 화면 대화상자의 태그 안내 문구가 한국어이던 문제, 쿼리 설명 날짜가 `4o`로 나오던 문제(이제 `4th`), 렌더 보기 열 제목의 `+` 칩이 마지막 열 제목과 겹치던 문제.
- **문서:** README 개편(왜 쓰는지, 3단계 시작하기, 쿼리 문법, AI 연결, 공개 API, 영·한 예시 GIF, 설정 표 전체, 웹사이트). VS Code용 MCP 설정 예시의 키를 `servers`로 바로잡음.

## 1.0.0 — 2026-09-30

First public release on the VS Code Marketplace, Open VSX and npm. (한국어 요약은 아래에 있습니다.)

**Tasks**
- Obsidian Tasks syntax: emoji fields (📅 ⏳ 🛫 ➕ ✅ ❌ 🔁 🏁 🆔 ⛔, priorities 🔺⏫🔼🔽⏬) and Dataview inline fields, written in Obsidian's field order.
- Toggle with `Ctrl+Shift+Enter`, create/edit dialog (`Ctrl+Shift+C`), auto-suggest with natural-language dates, CodeLens, hover cards, diagnostics with quick fixes.
- Recurrence (`every month on the last`, `when done`), custom statuses with presets, dependencies (🆔/⛔) with blocked/blocking detection, urgency.
- Notes: indented plain bullets under a task; add from the rendered view (💬), shown on query rows and cards, edited in the dialog.
- Due date required for new tasks by default (`tasksmd.requireDueDate`).

**Views**
- Sidebar smart views (Today, Upcoming, Overdue, In progress, Blocked, Open, Done) and saved queries.
- Rendered view: an interactive preview with live ` ```tasks ` results, column layout (hide and resize columns), view-only sort and scope; can be the default Markdown editor (replaces Cursor's Preview toggle).
- Query results panel, query builder, kanban board (columns in a balanced grid, e.g. 2×2), calendar (month/week, full screen), weekly statistics, archive, notifications.
- Query language compatible with Obsidian Tasks, including tree display, `explain` and optional `by function`.

**Integration**
- Public extension API `getAPI(1)` with feature detection (`features`, `info()`), notes, status events, command surface `tasksmd.api.*`, write policy.
- CLI and MCP server for AI agents: `@hastycapybara/tasks-cli`; library `@hastycapybara/tasks-core`; types `@hastycapybara/tasks-api`.

Built on the work of [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) (MIT) — see NOTICE.md.

### 한국어 요약

마켓플레이스·Open VSX·npm 첫 공개 버전입니다.
- **태스크:** Obsidian Tasks 문법(이모지·Dataview 필드), 완료 토글, 만들기/편집 대화상자, 자동완성(자연어 날짜), CodeLens·호버·진단, 반복, 사용자 정의 상태, 의존성(차단됨/차단 중), 긴급도, 메모, 마감일 필수(기본 켜짐).
- **화면:** 사이드바 스마트 뷰와 저장된 쿼리, 렌더 보기(쿼리 결과 표시, 열 숨기기·너비 조절, 정렬·범위, 기본 편집기로 쓰기), 쿼리 결과 패널, 쿼리 빌더, 칸반, 캘린더, 통계, 아카이브, 알림.
- **연동:** 확장 API `getAPI(1)`(기능 확인, 메모, 상태 알림), 명령 `tasksmd.api.*`, CLI·MCP(`@hastycapybara/tasks-cli`), 라이브러리(`@hastycapybara/tasks-core`), 타입(`@hastycapybara/tasks-api`).

공개 전 내부 개발 이력(내부 1.0.0~1.13.0)은 [docs/history-internal.md](docs/history-internal.md)에 있습니다.
