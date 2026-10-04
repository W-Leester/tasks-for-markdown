# Changelog

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
