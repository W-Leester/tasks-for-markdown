# Changelog

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
