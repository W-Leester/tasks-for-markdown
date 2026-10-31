# Changelog

## 1.1.8 — unreleased

- **Type into a blockquote in the rendered view.** Click a quote (`> …`) in the note and it becomes a text box with its text; `Cmd/Ctrl+Enter` or clicking outside saves it back as `> ` lines, `Esc` cancels, `Cmd/Ctrl+Z` undoes. Handy for question-and-answer notes: answer under `> Answer:` without switching to the source. Links and tasks inside a quote work as before; quotes in query results are not editable.
- **Fix: saved queries now follow `tasksmd.exclude`** (and `files.exclude`, `.gitignore`), like the task index. Query files in excluded folders no longer show up under SAVED QUERIES.

### 한국어 요약
- **렌더 보기에서 인용문에 바로 쓰기:** 노트의 인용문(`> …`)을 클릭하면 그 자리가 입력칸이 되고, `Cmd/Ctrl+Enter`나 바깥 클릭으로 저장(줄마다 `> `), `Esc` 취소, `Cmd/Ctrl+Z` 되돌리기. 질문지의 `> 답변:` 아래에 소스로 넘어가지 않고 답을 씀. 인용문 안의 링크·태스크는 그대로, 쿼리 결과 안의 인용문은 제외. 내용이 없는 인용문(`>`만)에는 연한 "입력"이 보임(파일에는 안 씀).
- **고침: 저장된 쿼리가 `tasksmd.exclude`를 따름**(`files.exclude`·`.gitignore`도, 인덱스와 같게). 제외한 폴더의 쿼리 파일이 SAVED QUERIES에 나오지 않음.

## 1.1.7 — 2026-10-29

Documentation only; the extension is the same as 1.1.6.

- **README: "Four Shortcuts" near the top** — make a checkbox (`Cmd/Ctrl+Shift+C`), mark it done (`Option/Alt+C`), create or edit in a form (`Option/Alt+Shift+C`), switch to the rendered view (`Cmd/Ctrl+Shift+R`), each with a short GIF. The older dialog and recurring-completion GIFs, which showed the previous keys, are no longer on the page.

### 한국어 요약
- 문서만 바뀜(확장은 1.1.6과 같음). README 위쪽에 **단축키**(체크박스 `Cmd/Ctrl+Shift+C`, 완료 `Option/Alt+C`, 만들기/편집 `Option/Alt+Shift+C`, 렌더 보기 `Cmd/Ctrl+Shift+R`)와 짧은 GIF 네 개. 예전 키가 찍힌 대화상자·반복 완료 GIF는 README에서 뺌.

## 1.1.6 — 2026-10-29

- **Task buttons on lines are off by default, with a switch in the sidebar.** The eye icon in the TASKS title bar shows or hides `✓ Done · Priority ▾ · 📅 Due ▾ · ✎ Edit` at the end of the cursor's task line, for this project (next to the title: "Line buttons on/off"). Also **Tasks: Show/Hide task buttons on lines**; the setting is `tasksmd.codeLens.mode` (default now `off`, was `cursorLine`). The query blocks' Show results · Explain stay.
- **New keys.** Add or remove checkbox: `Cmd+Shift+C` (macOS) / `Ctrl+Shift+C` (Windows, Linux). Toggle done: `Option+C` / `Alt+C` (also on the selected row of the rendered view). Create or edit task: `Option+Shift+C` / `Alt+Shift+C`. Rendered view ↔ source: `Cmd+Shift+R` on macOS (`Ctrl+Shift+R` on Windows and Linux, as before). Before: `Ctrl+Shift+C`, `Ctrl+Shift+Enter`, and `Cmd+Shift+C` on macOS for the dialog. On macOS `Option+C` and `Option+Shift+C` normally type `ç` and `Ç`; in Markdown editors they are the extension's keys now. Change any of them with **Tasks: Keyboard shortcuts**.
- **The rendered view shows what other Markdown extensions add to the preview** — Mermaid diagrams, math and the like now draw there as they do in the built-in preview (`Cmd/Ctrl+Shift+V`). Nothing is bundled: the rendered view uses the same extensions, through the same contributions the built-in preview uses. VS Code has Mermaid and math built in; in Cursor, install a Mermaid extension (e.g. Markdown Preview Mermaid Support). Turn off with `tasksmd.rendered.markdownExtensions`.

### 한국어 요약
- **줄 버튼은 기본 꺼짐, 사이드바에 스위치:** TASKS 제목 줄의 눈 아이콘으로 그 프로젝트에서 줄 끝 `✓ 완료 · 우선순위 ▾ · 📅 마감 ▾ · ✎ 편집`을 켜고 끔(제목 옆에 `줄 버튼 켬/끔`). 명령 `Tasks: 줄 버튼 보이기/숨기기`, 설정 `tasksmd.codeLens.mode`(기본 `cursorLine` → `off`). 쿼리 블록의 결과 보기·설명은 그대로.
- **단축키 변경:** 체크박스 만들기/지우기 `Cmd+Shift+C`(macOS) / `Ctrl+Shift+C`(Windows·Linux), 완료 표시 `Option+C` / `Alt+C`(렌더 보기에서 고른 줄도), 태스크 만들기/편집 `Option+Shift+C` / `Alt+Shift+C`, 렌더 보기 ↔ 소스 macOS `Cmd+Shift+R`(Windows·Linux는 그대로 `Ctrl+Shift+R`). 예전: `Ctrl+Shift+C`, `Ctrl+Shift+Enter`, macOS 대화상자 `Cmd+Shift+C`. macOS의 `Option+C`·`Option+Shift+C`는 원래 `ç`·`Ç` 입력 — 마크다운 편집기에서는 확장 키. 바꾸려면 `Tasks: 단축키 설정 열기`.
- **렌더 보기에서 다른 마크다운 확장의 기능도:** 머메이드 다이어그램·수식 등이 기본 미리보기처럼 렌더 보기에서도 그려짐. 우리 확장에 넣지 않고 그 확장을 같은 통로로 빌려 씀. VS Code는 머메이드·수식 내장, Cursor는 머메이드 확장(Markdown Preview Mermaid Support 등) 설치 필요. 끄려면 `tasksmd.rendered.markdownExtensions`.

## 1.1.5 — 2026-10-19

**API · CLI · MCP**
- **Add a task below another one** without taking its notes and subtasks: `below` (that task's line) in MCP `tasks_create`, `--below N` in `tasksmd add`, `target.below` in the extension API's `create`. The new task goes after the task's whole block at the same depth and with the same bullet; `asSubtask` / `--subtask` adds it as the task's last subtask, and `expectedText` / `--expect` refuses if the line changed. Inserting with `afterLine` / `--line` / `target.line` right after a task line handed its notes and subtasks to the new task; those options are unchanged (they insert after that exact line). Feature `insert.below`.
- **The editor's AI follows the editor's settings.** The MCP server registered in VS Code and Cursor now gets the `tasksmd.*` settings in effect for the folder, user settings included (created date, required due date, task format, statuses, …). Before, it read only the folder's `.vscode/settings.json`. The terminal `tasksmd` and the Claude Code / Claude Desktop connections still read that file.

**Editor**
- **No more yellow squiggle on every task without a due date.** Marking them is now its own setting, `tasksmd.decorations.missingDueDate`, **off by default**; turned on, it shows faint dots under the first letters (a hint, not in the Problems panel) and the light bulb offers to set a date. `tasksmd.requireDueDate` now only makes the dialog, API, CLI and MCP refuse new tasks without 📅. Real mistakes (bad dates, unknown ids) stay warnings.
- **Fixed: adding 🔁, 🔺, 🔼, 🔽 or 🛫 in front of 📅 broke both emoji** in a file open in the editor (since 1.0; through the buttons, menus and the dialog). The editor shrank the edit by UTF-16 units and cut emoji that share their first unit in half. The CLI and MCP were not affected.
- **The task buttons' choices open right below the line** instead of at the top of the window: Priority ▾, 📅 Due ▾ and 🔁 Repeat ▾ show a drop-down there. Pick one, or type a date or rule (`next fri`, `3일 후`, `every 2 weeks`) and it appears first. From the menus and the command palette the picker stays at the top.
- **Task suggestions open as you type a keyword, not on every space.** Type `d` (due), `pr` (priority), `ev` (every …) and the list appears; a bare space or Korean text never opens it — the list popping up on each space interrupted typing in Korean and turned `space → Enter` into picking a suggestion. `Ctrl+Space` still opens it anytime. The extension opens the list itself when a typed letter starts a keyword; no editor settings are changed. Set `tasksmd.autoSuggest.minMatch` to `0` to also open it right after a space.
- **Task buttons at the end of the line.** `✓ Done · Priority ▾ · 📅 Due ▾ · 🔁 Repeat ▾ · ✎ Edit` now sit right after the cursor's task line instead of above it, and only for what the task does not have yet (a set priority, due date or repeat needs no button; change it with Edit or the hover). Postpone left the buttons; it is still in the menu and the command palette. They are inlay hints, so press them with **Cmd+click** (Ctrl+click on Windows and Linux). To keep them above the line with a plain click, set `tasksmd.codeLens.position` to `above`. In Markdown files the extension lifts `editor.inlayHints.maximumLength` so the whole row fits.
- **Quick search (`Cmd/Ctrl+Shift+;`) only takes the key in Markdown editors, the rendered view and the Tasks sidebar.** In code files VS Code's "Focus Breadcrumbs" works again. The command palette still runs it from anywhere.
- **Quiet in folders without tasks.** Opening a code project that only has a README no longer shows the task count in the status bar, registers the MCP server with the editor's AI, or asks to install `tasksmd` / connect AI tools. Write and save the first `- [ ] …` and they turn on.
- **Enter / Tab in checklists work with Markdown All in One again.** On a fresh `- [ ] ` line (nothing written after the box yet) the task suggestions no longer pop up by themselves; an open suggestion list made Markdown All in One give up Tab (indent) and Enter. Start typing and they appear as before, or press `Ctrl+Space`.
- **The create/edit dialog key is now `Cmd+Shift+C` on macOS and `Alt+Shift+C` on Windows and Linux** (it was `Ctrl+Shift+/` in 1.1.4). On macOS it is taken only in Markdown editors, the rendered view and the Tasks sidebar, so VS Code's "new external terminal" keeps working elsewhere. In the rendered view it opens the selected row's task instead of asking which one.
- **Tasks: Keyboard shortcuts** opens the Keyboard Shortcuts editor showing only this extension's commands, to change any key.
- **Add tasks in the rendered view.** Click a task row and press `Enter` (or ＋ on the row, or "＋ Add task" at the end of a list): an input opens right below it, at the same depth. `Enter` writes `- [ ] …` there and opens the next input, so you can add several in a row; `Esc` or an empty `Enter` stops. One line per task, so Undo takes it back. Not in query results. On a selected row `Ctrl+Shift+Enter` toggles done, as in the editor.
- The `Ctrl+Shift+C` command is now called **Tasks: Add or remove checkbox** (Korean: **체크박스 만들기/지우기**). "Toggle checkbox" read like checking a task off, which is `Ctrl+Shift+Enter` (**Toggle task done**). The key and what it does are unchanged.

### 한국어 요약
- **에디터 안 AI가 편집기 설정을 따름:** VS Code·Cursor에 자동 등록된 MCP 서버가 그 폴더에 적용 중인 `tasksmd.*` 설정(사용자 설정 포함)을 받음 — 만든 날짜·마감일 필수·포맷 등. 예전에는 `.vscode/settings.json`만 읽었음. 터미널 `tasksmd`·Claude Code·Desktop 연결은 그대로 그 파일.
- **마감일 없는 줄마다 노란 밑줄이 그어지지 않음:** 표시는 새 설정 `tasksmd.decorations.missingDueDate`(**기본 꺼짐**). 켜면 첫 글자 밑 옅은 점(힌트, Problems 패널에 안 나옴), 전구로 마감일 넣기. `tasksmd.requireDueDate`는 이제 대화상자·API·CLI·MCP의 📅 없는 새 태스크 거부만. 잘못된 날짜 등 실제 오류는 그대로 경고.
- **API·CLI·MCP — 태스크 아래에 넣기:** MCP `tasks_create`의 `below`, `tasksmd add --below N`, 확장 API `create`의 `target.below`. 그 태스크의 메모·하위 항목 뒤에 같은 깊이로(`asSubtask`/`--subtask`면 하위 태스크로, `expectedText`/`--expect`로 줄 확인). 예전처럼 `afterLine`/`--line`으로 태스크 줄 바로 뒤에 넣으면 그 태스크의 메모·하위 태스크가 새 태스크 밑으로 넘어갔음(옵션 자체는 그대로). 기능 `insert.below`.
- **수정: 📅 앞에 🔁·🔺·🔼·🔽·🛫를 넣으면 두 이모지가 깨지던 문제**(1.0부터, 편집기에 열린 파일에서 버튼·메뉴·대화상자로 고칠 때). 편집기가 편집을 UTF-16 단위로 줄이며 첫 단위가 같은 이모지를 반으로 자름. CLI·MCP는 영향 없음.
- **태스크 버튼의 선택창이 그 줄 바로 아래 드롭다운으로:** 우선순위 ▾·📅 마감 ▾·🔁 반복 ▾. 고르거나 날짜·규칙을 그대로 치면(`next fri`, `3일 후`) 맨 위에. 메뉴·명령 팔레트에서는 예전처럼 위쪽.
- **자동완성은 키워드를 칠 때:** `d`·`pr`·`ev`를 치면 뜨고, 스페이스만이나 한글에는 안 뜸(스페이스마다 뜨던 목록이 한글 입력을 끊었음). `Ctrl+Space`는 언제나. 편집기 설정은 그대로(영문 글자가 키워드와 맞으면 확장이 목록을 엶). 예전 동작은 `tasksmd.autoSuggest.minMatch` = 0.
- **태스크 버튼을 줄 끝에:** `✓ 완료 · 우선순위 ▾ · 📅 마감 ▾ · 🔁 반복 ▾ · ✎ 편집`이 커서 줄 위가 아니라 **끝에**, 아직 없는 항목만(이미 있는 우선순위·마감·반복은 버튼 없음 — 편집·호버로 바꿈). 미루기는 버튼에서 빠지고 메뉴·명령 팔레트에 그대로. 인레이 힌트라 **Cmd+클릭**(Windows·Linux Ctrl+클릭). 예전처럼 줄 위·그냥 클릭은 `tasksmd.codeLens.position` = `above`.
- **빠른 검색 키(`Cmd/Ctrl+Shift+;`)는 마크다운 편집기·렌더 보기·Tasks 사이드바에서만** — 코드 파일에서는 "브레드크럼에 포커스"가 다시 동작.
- **태스크 없는 폴더에서는 조용히:** README만 있는 프로젝트에서 상태 표시줄 개수·에디터 AI용 MCP 등록·설치/연결 알림 없음. 첫 태스크를 저장하면 켜짐.
- **Markdown All in One과 함께 Enter·Tab:** 체크박스 뒤가 빈 `- [ ] ` 줄에서는 제안 목록이 저절로 뜨지 않음(떠 있으면 Markdown All in One이 Tab 들여쓰기·Enter를 양보했음). 글자를 쓰거나 `Ctrl+Space`로 부르면 뜸.
- **대화상자 키:** macOS `Cmd+Shift+C`, Windows·Linux `Alt+Shift+C`(1.1.4의 `Ctrl+Shift+/`에서 변경). macOS는 마크다운 편집기·렌더 보기·Tasks 사이드바에서만. 렌더 보기에서는 고른 줄의 태스크를 바로 엶.
- **`Tasks: 단축키 설정 열기`**로 이 확장의 키를 바꿀 수 있음.
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
