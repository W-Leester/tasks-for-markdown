# Tasks for Markdown — 개발 체크리스트

- 문서 버전: 1.0
- 작성일: 2026-09-21
- 근거: [requirements.md](requirements.md) v0.3 · [design.md](design.md) v0.2
- 이 파일은 표준 `- [ ]` 체크리스트로 작성되어 있어서, M1이 끝나면 **이 확장 자체로 인덱싱·토글할 수 있다**(dogfooding). 그 전까지는 손으로 `[x]`를 채운다.

## 사용법

| 표기 | 의미 |
|---|---|
| `- [ ]` / `- [x]` / `- [/]` / `- [-]` | 대기 / 완료 / 진행 중 / 취소(범위 제외) |
| `FR-1.3`, `NFR-4` | requirements.md의 요구사항 번호 |
| `D§5.2` | design.md의 절 번호 |
| `D-1` … `D-5` | design.md 15장의 열린 설계 이슈 |
| **DoD** | Definition of Done — 그 단계가 "끝났다"고 말할 수 있는 조건 |
| ⚠ | 다른 항목에 막혀 있거나 먼저 결정이 필요한 항목 |

작업 순서 원칙:
1. 마일스톤은 M0 → M8 순서로 진행한다. 다음 마일스톤을 시작하기 전에 현재 DoD를 모두 만족해야 한다.
2. 각 마일스톤 안에서는 `core/` → `index/`·`services/` → UI 순으로 진행한다 (아래 계층이 위 계층의 전제).
3. 항목을 완료할 때는 관련 테스트가 함께 있어야 한다. "테스트" 항목이 별도로 없으면 해당 항목 안에 포함된 것으로 본다.

## 진행 현황

| 단계 | 내용 | 상태 | 비고 |
|---|---|---|---|
| M0 | 기반: 스캐폴딩 + 코어 태스크 모델·파서·직렬화 | ✅ 완료 | 2026-09-21 · 175 tests |
| M1 | 최소 사용 가능: 인덱스 + 토글 + 사이드바 트리 + 상태바 | ✅ 완료 | 2026-09-21 · unit 228 / integration 12 |
| M2 | 에디터 보조 UI: Decoration·CodeLens·Hover·자동완성·진단·QuickPick | ✅ 완료 | 2026-09-21 · unit 320 / integration 20 |
| M3 | 반복·커스텀 상태·의존성·긴급도 | ✅ 완료 | 2026-09-21 · unit 369 / integration 24 |
| M4 | 쿼리 엔진 + 저장된 쿼리 + 빠른 검색 (쿼리 빌더 → M6.4) | ✅ 완료 | 2026-09-21 · unit 437 / integration 26 |
| M5 | 마크다운 미리보기 연동 (렌더 전용 — D-1) | ✅ 완료 | 2026-09-21 · unit 445 / integration 27 |
| M6 | 웹뷰: 편집 모달 + 칸반 + 쿼리 빌더 | ✅ 완료 | 2026-09-21 · unit 447 / integration 31 |
| M7 | 추가 기능: 알림·아카이브·통계·캘린더·업데이트 확인 | ✅ 완료 | 2026-09-21 · unit 462 / integration 34 |
| M8 | 마감: i18n·성능·접근성·문서·패키징·게시 | 🟡 코드 완료 · 사용자 작업 대기 | 1.0.0 `.vsix` 생성됨 · 남은 것: 퍼블리셔/토큰 생성, 저장소 공개 여부, M8.7 수동 테스트 |
| M9 | 공개 API: 확장 API·명령·npm/CLI·MCP·URI | 🟡 M9.1–9.5 완료(1.3.0, npm 발행은 사용자 작업) · M9.6(선택)·9.7 남음 | docs/api-plan.md v0.2, docs/api.md |
| M10 | 렌더 보기 고도화: 기본 편집기 대체, 정렬·보기 툴바 | ✅ 완료(1.4.0) | post-release-changes 2.14 |
| M11 | 쿼리 결과 트리 표시 | ✅ 완료(1.6.0) | 이 문서 M11, design.md 7.10 |
| M12 | 대화상자 필드 순서·더보기, 렌더 보기 열 배치 | ✅ 완료(1.7.0) | 이 문서 M12, design.md 7.11 |

---

## M0. 기반 — 스캐폴딩 + 코어 태스크 모델

**목표**: `vscode`에 의존하지 않는 `core/task`가 Obsidian Tasks 문법의 한 줄을 정확히 읽고 쓸 수 있다.
**참조**: FR-1.1 ~ FR-1.9, D§3.2, D§4, D§4.1, NFR-7, NFR-8

**DoD**
- `pnpm install && pnpm typecheck && pnpm lint && pnpm test && pnpm build` 가 모두 성공한다.
- F5로 Extension Development Host가 뜨고 "Tasks: Reindex all tasks" 명령이 팔레트에 보인다(동작은 M1).
- 이모지/Dataview 포맷의 픽스처 100줄 이상에 대해 파싱 → 직렬화 라운드트립 테스트가 통과한다.
- Obsidian Tasks 저장소의 파서 테스트 케이스를 이식한 테스트가 통과한다.

### M0.1 프로젝트 스캐폴딩
- [x] `package.json` — 이름/퍼블리셔(`hastycapybara.tasks-for-markdown`)/engines/activationEvents/scripts
- [x] `tsconfig.json` (strict, noUncheckedIndexedAccess), `esbuild.config.mjs`, `vitest.config.ts`, `eslint.config.mjs`, `.prettierrc`
- [x] `.vscodeignore`, `.gitignore`, `.vscode/launch.json`, `.vscode/tasks.json`
- [x] `LICENSE`(MIT), `NOTICE.md`(Obsidian Tasks 고지), `CHANGELOG.md`, `README.md`
- [x] `package.nls.json` / `package.nls.ko.json` 스텁
- [x] `pnpm install` 실행 후 `pnpm-lock.yaml` 커밋
- [x] `src/extension.ts` 최소 구현 — `activate()`에서 `tasksmd.reindex` 명령 등록(로그만), `deactivate()`
- [x] `pnpm build` 로 `dist/extension.js` 생성 확인, F5로 확장 호스트 실행 확인
- [x] ESLint에 `no-restricted-imports` 규칙 추가 — `src/core/**` 에서 `vscode` import 금지 (D§3.1 의존성 규칙)
- [x] `l10n/bundle.l10n.json`, `l10n/bundle.l10n.ko.json` 빈 파일 생성 + `package.json`의 `l10n` 경로 확인
- [x] GitHub Actions `ci.yml` — push/PR마다 `pnpm typecheck && pnpm lint && pnpm test && pnpm build` (D§13)
- [x] `tests/fixtures/` 디렉토리 구조 정의 (`parser/*.md`, `workspace/**` )

### M0.2 코어 모델 (`src/core/task/`)
- [x] `StatusType` enum — `TODO | IN_PROGRESS | ON_HOLD | DONE | CANCELLED | NON_TASK`
- [x] `Status` — `symbol`, `name`, `nextSymbol`, `type`; `isCompleted()`(DONE 또는 CANCELLED) (FR-1.15)
- [x] `StatusRegistry` — 기본 4종(`[ ]`, `[x]`, `[/]`, `[-]`) 등록, `bySymbol()`, `next()`, 미등록 심볼은 TODO 타입 임시 상태로 반환
- [x] `Priority` enum + 이모지 매핑(🔺 ⏫ 🔼 없음 🔽 ⏬) + Dataview 이름 매핑(`highest…lowest`) + 정렬용 숫자
- [x] `DateField` — `{ raw: string; valid: boolean; date?: Dayjs }`; `YYYY-MM-DD` 엄격 파싱, `2026-13-40` 같은 값은 `valid:false`로 보존 (FR-3.17 진단 근거)
- [x] `TaskLocation` — `path`, `line`, `heading`, `frontmatterTags`, `depth`
- [x] `Task` 불변 클래스 — D§4 필드 전부, `with(...)`/`TaskBuilder`로 복제-수정, `isDone`, `happens()`(start/scheduled/due 중 가장 이른 값)
- [x] `Recurrence`, `OnCompletion`, `id`, `dependsOn`은 **문자열 그대로 보존**하는 자리만 만든다(해석은 M3)
- [x] 태그 추출 — `#tag`, 중첩 `#a/b`, 설명 안 어디든; URL 안의 `#`은 제외

### M0.3 파서 (`TaskParser`, `formats/emoji.ts`, `formats/dataview.ts`)
- [x] 태스크 줄 인식 정규식 — 마커 `-`, `*`, `+`, `1.`, `1)` + `[x]`(대괄호 안 정확히 1글자) (FR-1.1)
- [x] 들여쓰기·마커·심볼·본문 분리, `indentation`/`listMarker` 보존 (D§4.1)
- [x] 이모지 필드 정규식 — ➕ 🛫 ⏳(⌛ 허용) 📅 ✅ ❌ 🔁 🆔 ⛔ 🏁 + 우선순위 6종 (FR-1.2 표)
- [x] Dataview 필드 정규식 — `[key:: value]` 와 `(key:: value)` 둘 다, 키 11종 (FR-1.8)
- [x] **줄 끝에서부터** 필드를 반복해서 벗겨내는 루프 — 순서 무관, 한 줄에 두 포맷 혼합 허용 (FR-1.6, FR-1.8)
- [x] 블록 링크 `^abc123`을 가장 먼저 분리해 `blockLink`로 보존 (FR-1.7)
- [x] 남은 앞부분을 `description`으로, 마크다운(링크·굵게·인라인 코드) 그대로 보존 (FR-1.7)
- [x] 글로벌 필터 옵션 — 설정 시 해당 문자열이 없는 줄은 `null` 반환 (FR-1.4). 표시용 제거는 렌더링 층에서 처리(파일 라운드트립 보존)
- [x] `originalMarkdown` 보존 (stale 검사용, NFR-3)
- [x] 잘못된 날짜·알 수 없는 우선순위 등은 예외가 아니라 필드에 표시(`valid:false`)하고 파싱은 계속한다

### M0.4 직렬화 (`TaskSerializer`)
- [x] 이모지 포맷 — 고정 순서(Obsidian 동일): description → 🆔 → ⛔ → priority → 🔁 → 🏁 → ➕ → 🛫 → ⏳ → 📅 → ❌ → ✅ → blockLink (FR-1.6)
- [x] Dataview 포맷 — 같은 순서, 항상 `[]` 사용 (FR-1.9); 우선순위 `none`은 생략
- [x] 들여쓰기·마커·심볼 그대로 재현; 필드 사이 공백 1개; 원본에 없던 필드는 쓰지 않음
- [x] `format` 인자로 포맷 선택 (설정 `taskFormat`은 M1에서 연결)

### M0.5 테스트
- [x] 라운드트립: 이모지 픽스처 → parse → serialize → 원문과 동일 (정규화된 순서인 줄만)
- [x] 순서 무관: 필드 순서를 섞은 입력 → 같은 Task 객체
- [x] 혼합 포맷: `📅 2026-09-25 [priority:: high]` 한 줄
- [x] 비태스크 줄: `- [ ]` 없는 줄, `- [xx]`, `[ ]`만 있는 줄, 코드블록 안 줄(M1 FileParser에서 재검증)
- [x] 엣지: 설명이 비어 있는 태스크, 이모지 뒤 날짜 없음, 날짜 뒤 텍스트, 탭 들여쓰기, CRLF
- [x] Obsidian Tasks `tests/TaskSerializer/*.test.ts`, `tests/Task/*.test.ts` 케이스 이식 (NFR-7) — 이식한 파일 상단에 출처 주석
- [x] `tests/fixtures/parser/emoji.md`, `dataview.md`, `not-tasks.md` 작성 (mixed/edge 케이스는 `TaskParser.test.ts`·`obsidian-port.test.ts`에 인라인)

---

## M1. 최소 사용 가능 — 인덱스 + 토글 + 사이드바

**목표**: 워크스페이스의 모든 태스크가 사이드바에 보이고, 체크박스를 누르면 원본 파일이 바뀐다.
**참조**: FR-1.3 ~ FR-1.5, FR-1.18, FR-2.*, FR-5.1 ~ FR-5.4, FR-8.1, NFR-3, D§5.1, D§5.2, D§6.2, D§7.1

**DoD**
- 픽스처 워크스페이스(파일 50개, 태스크 500개)를 열면 3초 안에 사이드바 "미완료 전체"에 태스크가 나타난다.
- 사이드바 체크박스 → 원본 줄이 `[x]` + `✅ 오늘`로 바뀌고, `Cmd+Z` 하면 되돌아온다.
- 에디터에서 파일을 편집(저장 전)하면 사이드바가 300ms 안에 갱신된다.
- 외부에서 파일이 바뀐 뒤 stale 상태의 트리 항목을 토글하면 잘못된 줄을 덮어쓰지 않고 경고한다.
- 통합 테스트(`@vscode/test-electron`)가 CI에서 돈다.

### M1.1 설정 (`src/settings/Settings.ts`)
- [x] `package.json` `contributes.configuration` — `taskFormat`, `globalFilter`, `removeGlobalFilterFromDescription`, `include`, `exclude`, `respectGitignore`, `maxFileSizeKB`, `setCreatedDate`, `setDoneDate`, `setCancelledDate` (FR-9 표)
- [x] 타입 안전 접근 객체 `settings.get('taskFormat')` + `onDidChange(keys, cb)` (D§3.2)
- [x] 설명 문자열은 전부 `%key%` → `package.nls*.json`

### M1.2 파일 파서 (`src/core/file/FileParser.ts` — 순수 로직이라 core에 배치)
- [x] 파일 텍스트 → `Task[]`; 코드블록(```` ``` ````, `~~~`), 프론트매터, `<!-- -->` 안의 줄 제외 (FR-1.3)
- [x] 가장 가까운 상위 헤딩 추적 → `location.heading` (FR-1.5)
- [x] 프론트매터 `tags:` 파싱 → `location.frontmatterTags`
- [x] 들여쓰기 깊이로 부모-자식 관계 계산 → `depth`, 부모 줄 번호 (FR-1.2)
- [x] 글로벌 필터 적용 (FR-1.4)
- [x] 테스트: 코드블록 안 `- [ ]` 무시, 헤딩 중첩, 탭/스페이스 혼합 들여쓰기

### M1.3 인덱스 (`src/index/`)
- [x] `TaskIndex` (`src/core/index/`, 순수) — `Map<key, FileEntry>`, `all()`, `byPath()`, `byId()`, `version` 카운터 (D§5.1)
- [x] `WorkspaceScanner` — `workspace.findFiles(include, exclude)`, 멀티 루트, `.gitignore`/`files.exclude` 존중 (FR-2.1)
- [x] 50파일 청크 + `await` 양보, 진행률 콜백 (NFR-2, D§9)
- [x] `maxFileSizeKB` 초과 파일 건너뛰기 + 목록 보관 (FR-2.5)
- [x] `FileWatcher` — `FileSystemWatcher`(create/change/delete) + `onDidChangeTextDocument` 300ms 디바운스; 열린 문서는 `getText()` 우선 (FR-2.2)
- [x] 파일 단위 통째 교체 방식의 증분 갱신 (FR-2.3)
- [x] `IndexEvents` — `{ changed: string[], removed: string[] }` 이벤트 (FR-2.4)
- [x] 수명주기 상태 `Idle → Scanning → Ready → Updating` + 설정 변경(include/exclude/globalFilter) 시 재스캔 (D§6.2)
- [x] 테스트: 픽스처 워크스페이스 인덱싱 결과 수, 파일 생성/삭제, 열린 문서 편집 반영 (통합 테스트 4건)

### M1.4 편집 서비스 (`src/services/TaskEditService.ts`)
- [x] 유일한 쓰기 경로임을 주석/린트로 명시 (D§3.1)
- [x] `replaceLine(path, line, expectedOriginal, newText)` — 현재 줄이 `expectedOriginal`과 다르면 `StaleLineError` (NFR-3)
- [x] `insertLines(path, line, texts, position)` — 반복 태스크용 (M3에서 사용)
- [x] 여러 편집을 하나의 `WorkspaceEdit`로 원자적 적용, `applyEdit()` 결과 검사
- [x] `applyStatusChange(task, newStatus, today)` (core, `statusChange.ts`, 7 tests) — DONE 진입 ✅ 부여 / 이탈 시 제거, CANCELLED 동일(❌), 설정 `setDoneDate`/`setCancelledDate` 존중 (FR-1.18)
- [x] `toggle(task)` — `StatusRegistry.next()` → `applyStatusChange` → `replaceLine` (D§5.2)
- [x] stale 시 사용자 알림 + 해당 파일 재인덱스
- [x] 테스트: 통합 — 토글 후 파일 내용, 다중 선택, 닫힌 파일 저장, stale 감지 (5건; Undo는 수동 체크리스트)

### M1.5 명령어 (`src/commands/`)
- [x] `tasksmd.toggleDone` — 활성 에디터 커서 줄 또는 트리 항목 인자 (FR-8 표)
- [x] 컨텍스트 키 `tasksmd.onTaskLine` — 커서가 태스크 줄일 때 true (`setContext`), 키바인딩 `when` 조건
- [x] 키바인딩 `Cmd/Ctrl+Enter` — `editorTextFocus && editorLangId == markdown && tasksmd.onTaskLine` (Q-13)
- [x] `tasksmd.reindex`, `tasksmd.openSidebar`
- [x] 모든 명령 `category: "Tasks"` + 제목 nls 키 (FR-8.1)

### M1.6 사이드바 트리 (`src/views/TaskTreeProvider.ts`)
- [x] `contributes.viewsContainers.activitybar` — Tasks 아이콘(코디콘 `checklist` 또는 커스텀 SVG) + `views` 등록
- [x] 스마트 뷰 7종: 오늘 / 예정 7일 / 기한 초과 / 진행 중 / 차단됨(⛔ 기반, 이미 동작) / 미완료 전체 / 완료 30일 (FR-5.1) — `core/views/smartViews.ts`, M4 전까지 하드코딩 필터 (12 tests)
- [x] 각 스마트 뷰 카운트 뱃지(`description`)
- [x] 그룹 전환: 파일별 / 마감일별 / 우선순위별 / 태그별 / 헤딩별 / 상태별 — 뷰 타이틀 메뉴 (FR-5.2)
- [x] `TreeItemCheckboxState` 체크박스 → `toggleDone` (FR-5.3)
- [x] 항목 클릭 → 해당 파일·줄로 이동(`showTextDocument` + `revealRange`)
- [x] 컨텍스트 메뉴: 완료 / 취소 / 다시 열기 / 원본 열기 (`markDone`·`markCancelled`·`reopen` 명령; 우선순위·날짜·편집·삭제는 M2/M6에서 추가) (FR-5.3)
- [x] 필터 입력(뷰 타이틀 액션 → `InputBox`) 설명 텍스트 검색 (FR-5.4)
- [x] `IndexEvents` 구독 → 200ms 디바운스 refresh (D§5.1)
- [x] 그룹 노드 lazy `getChildren`, 5,000개 초과 시 "더 보기" 노드 (D§9)
- [x] 마지막 선택 스마트 뷰·그룹 기준을 `workspaceState`에 저장 (D§8)

### M1.7 상태바 (`src/views/StatusBar.ts`)
- [x] `$(checklist) 미완료 N · 오늘 M · 초과 K`, 클릭 → 사이드바 (FR-2.6)
- [x] 스캔 중 `$(sync~spin) Tasks: 1,234/5,000` 진행률 (D§6.2)
- [x] 건너뛴 대용량 파일 있으면 경고 아이콘 + 툴팁 목록 (FR-2.5)

### M1.8 테스트 인프라
- [x] `@vscode/test-electron` 설정, `tests/integration/` 러너, 픽스처 워크스페이스 `tests/fixtures/workspace/`
- [x] CI에 통합 테스트 잡 추가 (xvfb, Linux)
- [x] 이 문서(`docs/Tasks.md`)를 픽스처에 복사해 인덱싱 스모크 테스트에 사용

---

## M2. 에디터 보조 UI

**목표**: 문법을 외우지 않아도 에디터 안에서 태스크를 만들고 고칠 수 있다.
**참조**: FR-3.*, FR-8.2, D§7.2, D§7.7

**DoD**
- 태스크 줄에 커서를 두면 CodeLens(완료·우선순위·날짜·편집)가 뜨고 각 항목이 동작한다.
- `due` 타이핑 → 📅 + 날짜 후보가 자동완성으로 뜨고 선택하면 절대 날짜로 삽입된다.
- 기한 초과 줄은 배경색, 줄 끝에 "N일 지남"이 표시된다.
- `📅 2026-13-40` 은 Problems 패널에 경고로 뜬다.

### M2.1 날짜 코어 (`src/core/dates/`)
- [x] `Clock` 인터페이스(`now()`) — 모든 날짜 로직에 주입, 테스트에서 고정 (D§12)
- [x] `DateParser` — `today`, `tomorrow`, `yesterday`, `next monday`, `last friday`, `in 3 days`, `next week`, `6 oct`, `2026-09-25`; 라이브러리 결정: **자체 구현** (chrono-node 미사용 — 번들·결정성; 영어 + 한국어 기본형 지원)
- [x] `DateRange` — `this|last|next week|month|quarter|year`, `YYYY-Www`, `YYYY-MM`, `YYYY-Qn`, `YYYY`, `<date> <date>`; 주 시작 월요일 (Q-16)
- [x] `Relative` — `{ key: 'daysLeft' | 'daysOver' | 'today' | 'tomorrow' …, n }` 반환 (i18n은 렌더링 층) (D§11)
- [x] 테스트: 고정 `today`로 표 기반 케이스 50개 이상

### M2.2 Decoration (`src/editor/TaskDecorations.ts`)
- [x] 줄 끝 가상 텍스트 — 상대 날짜(`📅 3일 남음`), 기한 초과(`⚠ 2일 지남`), 반복 요약, 차단(M3) (FR-3.1)
- [x] 기한 초과 줄 배경/텍스트 색, 오늘 마감 별도 색 — `ThemeColor` 사용 (FR-3.2, D§7.7)
- [x] DONE/CANCELLED 취소선 또는 흐리게 (FR-3.3)
- [x] 거터 상태 아이콘 (FR-3.4)
- [x] 필드 부분(이모지+값) 옅은 색 — `display:none` 해킹 금지 (FR-3.5)
- [x] `visibleRanges` ±50줄만 계산, 100ms 디바운스, 활성 에디터 변경·인덱스 이벤트에 반응 (FR-3.6)
- [x] 설정 `decorations.relativeDates`, `decorations.overdueHighlight`, `decorations.strikeDone`, `decorations.gutterIcons`, `decorations.dimFields`
- [x] `contributes.colors` — `tasksmd.overdueBackground`, `tasksmd.dueTodayForeground` 등 커스텀 색 토큰

### M2.3 CodeLens (`src/editor/TaskCodeLensProvider.ts`)
- [x] 렌즈 항목: `✔ 완료` · `우선순위: 높음 ▾` · `📅 9/25 ▾` · `🔁 매주 ▾`(M3) · `✎ 편집` (FR-3.7)
- [x] 모드 설정 `codeLens.mode: off | cursorLine | all`, 기본 `cursorLine`; 커서 이동 시 `onDidChangeCodeLenses` (FR-3.8)
- [x] 각 렌즈 → 해당 명령(QuickPick 또는 편집 모달; M6 전까지 편집은 QuickPick 순차 입력으로 대체). 렌즈 항목: 완료/다시 열기 · 우선순위 · 📅 마감(+상대) · ⏳ 예정 · 🔁 · 미루기 · 편집

### M2.4 Hover (`src/editor/TaskHoverProvider.ts`)
- [x] 카드: 상태·우선순위·모든 날짜(절대+상대)·반복·의존성 링크·긴급도(M3) (FR-3.9)
- [x] `command:` 링크로 완료/편집/우선순위 변경 — `MarkdownString.isTrusted` (FR-3.10)
- [x] 의존성 링크 클릭 → 해당 태스크 위치로 이동

### M2.5 자동완성 (`src/editor/TaskCompletionProvider.ts`)
- [x] 태스크 줄에서만 활성 (FR-3.11)
- [x] 키워드 제안: due/scheduled/start/created/priority(5종)/every…/id/depends on/on completion (FR-3.12)
- [x] 날짜 이모지 뒤: today/tomorrow/next monday/in 3 days/next week 등 → 절대 날짜로 치환 (FR-3.13)
- [x] `autoSuggest.enabled`, `autoSuggest.minMatch`(0–3), `autoSuggest.maxItems`(3–20) (FR-3.14)
- [x] `taskFormat: dataview`면 `[due:: ]` 형태로 삽입 (FR-3.15)
- [x] 마크다운은 `quickSuggestions`가 기본 off → 스페이스를 트리거 문자로 등록(Obsidian과 유사), `Ctrl+Space`는 항상 동작. 키워드는 뒤쪽 1~3단어로 매칭("every w", "on completion d")

### M2.6 QuickPick (`src/editor/quickpicks/`)
- [x] `StatusPick` — 등록된 상태 목록, 현재 표시
- [x] `PriorityPick` — 6단계
- [x] `DatePick` — 입력란(자연어) + 후보(오늘/내일/이번 주 금요일/다음 주/날짜 없음), 해석 결과를 `detail`에 미리 표시
- [x] `PostponePick` — 내일/+2일/다음 주 월/다음 달 → 마감·예정일 이동 (FR-8 `tasksmd.postpone`)
- [x] 명령: `tasksmd.setStatus`, `setPriority`, `setDueDate`, `setScheduledDate`, `setStartDate`, `postpone`, `createOrEdit`(임시: QuickPick 순차) (FR-3.16)
- [x] 에디터 컨텍스트 메뉴 하위 메뉴 "Tasks" — `tasksmd.onTaskLine`일 때만 (FR-8.2)
- [x] 트리 컨텍스트 메뉴에 우선순위/날짜/미루기/상태/편집 항목 추가 (M1.6 보강)

### M2.7 진단 (`src/editor/TaskDiagnostics.ts`)
- [x] `DiagnosticCollection` — 잘못된 날짜, 없는 ID 참조, 날짜 없는 반복, 파싱 불가 반복, 순환 의존성 (FR-3.17)
- [x] Quick Fix(`CodeActionProvider`): 잘못된 날짜 → 오늘로 / 제거, 없는 의존성 제거, 반복에 오늘 마감 추가 / 반복 제거
- [x] 열린 문서만 대상, 인덱스 이벤트 시 갱신

---

## M3. 반복 · 커스텀 상태 · 의존성 · 긴급도

**목표**: Obsidian Tasks의 핵심 동작(반복 생성, 상태 순환, 차단 관계)이 동일하게 동작한다.
**참조**: FR-1.10 ~ FR-1.23, D§5.3, D§6.1, D-4

**DoD**
- `🔁 every week 📅 2026-09-25` 완료 → 위 줄에 `📅 2026-10-02` 새 태스크가 생기고 원본은 `[x] ✅ 오늘`.
- `when done`, `every month on the last`, `every weekday` 등 반복 케이스 표가 통과한다.
- ITS 프리셋을 불러오면 `[/]`, `[-]`, `[>]` 등이 설정에 들어가고 토글이 프리셋 규칙대로 순환한다.
- `⛔`로 막힌 태스크가 사이드바 "차단됨"에 나타나고, 선행 태스크를 완료하면 사라진다.

### M3.1 반복 엔진 (`src/core/recurrence/`)
- [x] `rrule` 도입 (D-4: 번들 측정은 M3.2 빌드 후 기록); Obsidian `Recurrence.ts`/`Occurrence.ts` 이식, UTC 자정 Date로 시간대 문제 회피, rrule이 무시하는 오타 단어 검출 추가
- [x] `every …` 문법 파서 — day/days/weekday/week on Mon,Fri/2 weeks/month on the 15th/month on the last/month on the last Friday/year/January on the 4th (FR-1.10)
- [x] `when done` 플래그 (FR-1.12)
- [x] `next(referenceDates, today)` — 기준일 due → scheduled → start, 나머지 날짜 상대 간격 유지 (FR-1.11)
- [x] 새 인스턴스 생성 규칙 — `[ ]`, ✅/❌ 제거, ➕ 갱신(설정), 🆔 `keep|new|remove`(기본 keep), ⛔ 복사(기본 true) (FR-1.13)
- [x] `🏁 delete` — 완료 시 원본 삭제 + 새 인스턴스만 삽입 (D§5.3)
- [x] 날짜 없는 반복 태스크 경고 (FR-1.14) — M2.7 진단에 이미 포함
- [x] 테스트: Obsidian Tasks `tests/Recurrence*.test.ts` 이식 + 표 기반 케이스

### M3.2 편집 서비스 확장
- [x] `toggle()`에서 DONE 진입 + 반복 → `insertLines(above|below)` (설정 `recurrence.insertPosition`) — `TaskEditService.toggle` → `replaceLine(…, insert)`
- [x] 설정 `recurrence.insertPosition`, `recurrence.idHandling`, `recurrence.copyDependsOn`, `recurrence.removeScheduledDate`(이름 확정) — `schema.ts` + package.json
- [x] 하나의 `WorkspaceEdit`로 치환+삽입 원자 적용 (`replaceLine`) — Undo 한 번 복구는 헤드리스에서 구동 불가, M8.7 수동 항목으로 이관

### M3.3 커스텀 상태
- [x] 설정 `statuses[]` 스키마 — `{ symbol, name, nextSymbol, type }` (FR-1.16)
- [x] `StatusRegistry`가 설정에서 로드, 변경 시 재로드
- [x] 프리셋 Core / Minimal / ITS / Things — 명령 `tasksmd.loadStatusPreset` (추가 또는 교체) (FR-1.17, Q-7)
- [x] `NON_TASK` 타입 심볼은 스마트 뷰·상태바에서 제외, 인덱스에는 유지(쿼리 `status.type is NON_TASK`로 조회 가능) (FR-1.19)
- [x] 명령 `tasksmd.changeStatusTo` — QuickPick (Obsidian 7.24 동등)
- [x] 타입 전이 기반 날짜 처리 재검증 — `[X]`, `[>]` 등 커스텀 심볼에서도 ✅ 동작 (D§6.1)

### M3.4 의존성
- [x] ID 생성기 — 영숫자 6자, 인덱스 내 중복 회피 (M2.5에서 구현)
- [x] `core/index/dependencies.ts`: `dependencies`/`dependants`/`isBlocked`/`isBlocking`/`findDependencyCycle` — 완료/취소된 선행 태스크는 제외 (FR-1.20, FR-1.21)
- [x] 순환 의존성 감지 (FR-1.22) → 진단
- [x] `DependencyPick` — 설명 텍스트 퍼지 검색, 다중 선택, 선택 시 상대에 🆔 없으면 발급
- [x] 명령 `tasksmd.setDependencies`
- [x] 사이드바 "차단됨" 스마트 뷰 실제 동작, 장식 `⛔ 대기 중(N)`, Hover 링크

### M3.5 긴급도
- [x] Obsidian Tasks `Urgency.ts` 공식 이식 (FR-1.23) — 마감/예정/시작/우선순위 가중치
- [x] Hover와 트리 정렬(기본)에 사용
- [x] 테스트: 원본 테스트 케이스 이식

### M3.6 진단·자동완성 보강
- [x] 진단: 반복 규칙 파싱 실패, 없는 ID 참조, 순환(Error), 날짜 없는 반복 + Quick Fix
- [x] 자동완성: `every` 프리셋, `id` 자동 발급 (M2.5); `depends on` 검색은 `setDependencies` 명령으로
- [x] CodeLens `🔁 매주 ▾` → `RecurrencePick`(프리셋 + 자유 입력 + 유효성)

---

## M4. 쿼리 엔진 + 저장된 쿼리 + 빠른 검색

**목표**: Obsidian Tasks 쿼리 문법이 그대로 동작하고, 사이드바에서 쿼리를 저장·편집·조립할 수 있다.
**참조**: FR-7.*, FR-5.5 ~ FR-5.7, FR-5.12, NFR-4, D§5.4, D§10

**DoD**
- Obsidian Tasks 문서의 필터/정렬/그룹 예시 쿼리들이 파싱 오류 없이 실행된다.
- 잘못된 명령 줄은 줄 번호와 이유가 표시된다.
- `.tasks/queries/이번주.md`를 만들면 사이드바 "저장된 쿼리"에 나타나고, 파일을 고치면 갱신된다.
- 50,000 태스크 벤치마크에서 대표 쿼리 5개가 100ms 이내.
- `filter by function`은 설정 off 또는 신뢰되지 않은 워크스페이스에서 실행되지 않는다.

### M4.1 토크나이저·파서 (`src/core/query/`)
- [x] `Tokenizer` — 줄 분리, `#` 주석, 줄 끝 `\` 연속, 빈 줄 무시 (FR-7.14)
- [x] 플레이스홀더 `{{query.file.path|folder|filename|root}}` 치환 (FR-7.9)
- [x] `Query` — 각 줄을 Instruction 매처 목록에 순서대로 시도, 실패 시 `QueryError { line, text, reason }` 누적 (FR-7.15)
- [x] `explain` 출력 생성 — 각 필터의 사람이 읽는 설명 + 기본 정렬 명시 (FR-7.13); `limit`/`hide|show`/`short mode` 파서 포함

### M4.2 필터 (`filters/`) — 명령어 하나 = 파일 하나
- [x] 상태: `done`, `not done`, `status.type is|is not …`, `status.name includes|does not include`, `status.symbol …` (FR-7.1)
- [x] 날짜 6종 + `happens`: `on|before|after|on or before|on or after <date>`, `in|before|after|in or before|in or after <range>`, `has|no <field> date`, `<field> date is invalid` (FR-7.2)
- [x] 우선순위: `priority is|is above|is below|is not …` (FR-7.3)
- [x] 반복: `is recurring`, `is not recurring`, `recurrence includes|does not include` (FR-7.4)
- [x] 의존성: `is blocked|is not blocked|is blocking|is not blocking|has id|no id|has depends on|no depends on|id includes` (FR-7.5)
- [x] 텍스트: `description|heading|path|folder|filename|root includes|does not include`, `… regex matches|does not match /…/flags` (FR-7.6)
- [x] 태그: `tags include|do not include`, `tag regex …`, `has tags`, `no tags`
- [x] 구조: `exclude sub-items` (FR-7.7)
- [x] 불리언: `AND OR NOT AND NOT OR NOT XOR` + 괄호(중첩), 피연산자는 완전한 필터 (FR-7.8) — 자체 재귀 하강 파서(우선순위 NOT > AND > XOR > OR)
- [x] regex 필터: 컴파일 1회, 길이 제한 + 중첩 수량자 패턴 거부 (Obsidian 8.3 동등)

### M4.3 정렬·그룹·제한·레이아웃
- [x] `sort by <field> [reverse]` 전 필드 + 기본 정렬 status.type → urgency → due → priority → path (FR-7.10)
- [x] `group by <field> [reverse]` 전 필드 + `backlink`, `root`; 다단계 → `GroupNode` 트리 (FR-7.11)
- [x] `limit N`, `limit groups N` (FR-7.12)
- [x] `hide|show <element>` 전 항목, `short mode`, `full mode`, `hide nested backlink` → `Layout` 객체 (FR-7.13) (M4.1에서 구현)
- [x] `QueryResult { root: GroupNode, totalCount, explain, errors }`

### M4.4 JS 함수 (`filter|sort|group by function`)
- [x] 설정 `query.allowFunctions`(기본 false) + `workspace.isTrusted` 둘 다 참일 때만 컴파일 (FR-7.7, NFR-4)
- [x] `new Function('task','query', …)`; `task`는 읽기 전용 프록시 (D§10)
- [x] 쿼리 실행당 누적 시간 상한(2s) 초과 시 함수 비활성 + 경고 (태스크당이 아닌 실행당 예산으로 변경)
- [x] 예외는 해당 태스크만 제외하고 오류 목록에 누적
- [x] `capabilities.untrustedWorkspaces: { supported: 'limited' }` 선언

### M4.5 QueryService · 저장된 쿼리
- [x] `QueryService.run(text, context)` — `(text, indexVersion)` 캐시, 인덱스 이벤트로 무효화 (FR-7.16, FR-7.17)
- [x] 열린 쿼리 결과 자동 재실행 200ms 디바운스
- [x] `SavedQueryStore` — (1) `tasksmd.savedQueries` 설정 (2) `.tasks/queries/*.md`(첫 ` ```tasks ` 블록) 병합, 파일 워처 (FR-5.5)
- [x] `SavedQueryTreeProvider` — 출처 아이콘 구분, 결과(중첩 그룹)를 하위 노드로 펼침, 체크박스·이동·컨텍스트 메뉴, 오류 노드
- [x] 쿼리 편집: 파일 기반은 `.md` 열기, 설정 기반은 settings.json; `explain`은 출력 채널; 오류는 트리에 줄 번호와 함께 (FR-5.7)
- [x] 쿼리 빌더(Webview → M6.4 완료) — 필터 종류 드롭다운 조립 → 텍스트 생성 (FR-5.6); M6 전까지는 텍스트 편집만
- [x] 스마트 뷰 7종을 쿼리 텍스트로 재정의 (`SMART_VIEW_QUERIES`; 하드코딩 필터 제거)

### M4.6 빠른 검색·명령
- [x] `tasksmd.quickSearch` — QuickPick 퍼지 검색, 미완료 전체, 선택 시 이동 / 버튼으로 완료·편집 (FR-5.12), 키 `Cmd/Ctrl+Shift+;`
- [x] `tasksmd.insertQueryBlock` — ` ```tasks ` 스니펫
- [x] `tasksmd.explainQuery` — 커서가 있는 ` ```tasks ` 블록 설명을 출력 채널/알림으로

### M4.7 테스트
- [x] 명령어별 단위 테스트 + `explain` 검증 (tokenizer 4 · skeleton 4 · filters 23 · sort/group 18 · functions 10)
- [x] Obsidian Tasks `tests/Query/**` 케이스 이식 (호환성 회귀 방지) — `tests/core/query/obsidian-compat.test.ts` 224 케이스(due/created/done/cancelled/happens 날짜, 우선순위, 상태, 반복, 설명·태그 정규식, path/folder/filename/heading, id/dependsOn, 불리언 구분자). 이식 중 발견해 고친 차이 3건: `in two weeks` 숫자 단어, `id includes` 대소문자 무시, 불리언 구분자 `[ ]`·`{ }`·`" "`
- [x] 벤치마크 스크립트 — `BENCH=1 pnpm vitest run tests/perf`: 50,000 태스크에서 not done 55ms · group by folder/due 61ms · function filter 98ms (정렬 키 사전 계산으로 780ms→55ms); CI는 완화된 상한만 검사

---

## M5. 마크다운 미리보기 연동

**목표**: VS Code 기본 미리보기가 Obsidian "읽기 모드" 역할을 한다 — 체크박스 클릭, 뱃지, ` ```tasks ` 렌더링.
**참조**: FR-4.*, D§5.5, D-1, D-2

**DoD**
- 미리보기에서 체크박스 클릭 → 원본 줄 토글 → 미리보기 자동 갱신.
- ` ```tasks ` 블록이 그룹 헤딩·카운트·체크박스가 있는 결과 목록으로 렌더링된다.
- 라이트/다크/하이 컨트라스트에서 색이 깨지지 않는다.
- Cursor에서도 동일하게 동작한다(또는 미지원 사항이 문서화되어 있다).

### M5.0 스파이크 (완료 — 결론은 design.md D-1/D-2)
- [x] D-1: 클래식 미리보기 → 확장 채널 실험(`acquireVsCodeApi`, `command:` 링크 클릭) → 둘 다 불가. VS Code 1.138 마크다운 확장 소스 분석: 미리보기는 `revealLine`/`didClick`/`openLink`만 처리, `enableCommandUris` 없음
- [x] D-2: Cursor 3.12.10 = 클래식 미리보기만(`codeBlockEditors`·내장 Markdown Editor 없음) → 렌더 시점 통합이 공통 기준선
- [x] 대안 확정: markdown-it 플러그인(확장 프로세스)에서 태스크 뱃지 + ` ```tasks ` 결과 HTML 생성, 인덱스 변경 시 `markdown.preview.refresh`; 체크박스 표시 전용; 링크 `file.md#L<n>`. 상호작용형은 VS Code 내장 Markdown Editor + `codeBlockEditors`(v1.x)

### M5.1 markdown-it 플러그인 (`src/preview/markdownItPlugin.ts`, 렌더러는 `src/core/render/html.ts`)
- [x] `contributes.markdown.markdownItPlugins: true` + API의 `extendMarkdownIt()` (`PreviewIntegration`)
- [x] 태스크 줄 → `<li class="tfm-task …" data-tfm-line>` + 표시 전용 체크박스 + 필드 뱃지(우선순위 색, 상대 날짜, 기한 초과, 반복, id, 의존성, 태그) (FR-4.2)
- [x] 원본 이모지 표시 옵션 `preview.renderBadges: false` (FR-4.2)
- [x] ~~✎ 편집 아이콘~~ → 결과 항목에 원본 링크 `file.md#L<n>` (FR-4.3, 0.5 변경)
- [x] ` ```tasks ` 블록 → 렌더 시점에 `QueryService` 실행 → 그룹 헤딩·카운트·뱃지·링크·`explain`·오류 HTML (FR-4.4, FR-4.5)
- [x] `hide|show`/`short mode`/`hide task count` 레이아웃 반영
- [x] 완료 태스크 스타일, 기한 초과 색 — `media/preview.css`, `--vscode-*` 변수만 사용 (FR-4.6)

### M5.2 갱신 · 설정
- [x] 인덱스 변경 시 `markdown.preview.refresh` (500ms 디바운스) — 확장→미리보기 push는 불가하므로 재렌더로 대체 (FR-7.17)
- [x] 설정 `preview.enabled`, `preview.renderBadges`
- [x] 서드파티 미리보기 확장 비호환 문서화 (FR-4.7) — requirements 0.5
- [x] 테스트: markdown-it 단위 8건(체크박스·뱃지·중첩·fence·오류·explain·레이아웃), 통합 1건(`extendMarkdownIt` 경유 렌더 + 상대 링크)
- [ ] (v1.x) VS Code 내장 Markdown Editor의 `markdown.codeBlockEditors`로 상호작용형 ` ```tasks ` 렌더러 (Cursor가 해당 버전을 따라잡은 뒤)


---

## M6. 웹뷰 — 편집 모달 + 칸반

**목표**: Obsidian의 편집 모달과 8.4 컬럼 뷰에 해당하는 UI가 있다.
**참조**: FR-6.*, FR-5.8 ~ FR-5.11, D§5.6, D§7.3, D§7.4, D§10, D-3

**DoD**
- `Cmd/Ctrl+Shift+T` → 모달에서 자연어 날짜·반복·의존성을 채우고 Enter → 정규화된 줄로 치환.
- 칸반에서 카드를 "진행 중" 컬럼으로 드래그하면 원본이 `[/]`로 바뀐다.
- 웹뷰가 CSP 위반 없이 로드되고(콘솔 오류 0), 키보드만으로 모달을 조작할 수 있다.

### M6.1 웹뷰 인프라 (`src/webviews/shared/`, `WebviewHost`)
- [x] esbuild 두 번째 엔트리 — Svelte 컴파일, `dist/webviews/<app>.js|css`, watch 모드 (D§13)
- [x] `WebviewHost`(`src/webviewHost/`) — HTML 생성(CSP nonce, `localResourceRoots: dist/webviews`), 메시지 라우팅(query/run, task/toggle·setField(s)·create·open·load, ui/state·notify·close), 인덱스 변경 → `index/changed`, 설정/저장 쿼리 변경 → `state/patch` (D§5.6, D§10)
- [x] `protocol.ts` — discriminated union 메시지 타입, 양쪽에서 import (D§5.6 표)
- [x] `tokens.css` — `--vscode-*` 기반 우선순위/기한 색, editor/와 동일 매핑 (D§7.7)
- [x] `state/init`에 l10n 번들 포함, Svelte `t(key)` (D§11)
- [x] 공통 컴포넌트: `TaskCard`, `DateInput`(자연어 해석 미리보기); 칩은 `tokens.css` 클래스
- [x] `retainContextWhenHidden: false`, UI 상태는 `ui/state`로 `workspaceState`에 저장 (NFR-4)

- [x] 웹뷰 왕복 검증은 편집 모달 통합 테스트로 (`ui/ready` → `state/init` → `task/load` → `task/setFields`)

### M6.2 편집 모달 (`webviews/edit-modal/`)
- [x] 필드 전부: 설명(멀티라인·글로벌 필터 자동), 우선순위, 반복(텍스트+프리셋+호스트 rrule 검증+when done), 시작/예정/마감(자연어+네이티브 피커), 접힌 생성/완료/취소일, 상태, 의존성(검색·다중 선택, id 없는 태스크는 적용 시 자동 발급; 역방향 '막고 있는 태스크'는 표시 전용), 완료 시 동작 (FR-6.1)
- [x] 열기 규칙: 커서가 태스크 줄이면 편집, 아니면 그 위치에 새 태스크; 미리보기·트리·칸반에서 호출 (FR-6.2)
- [x] 적용(Enter/버튼) → `task/setField`·`task/create` → 정규화 줄 치환; Esc 취소 (FR-6.3)
- [x] 액세스 키(Alt+글자), 설정 `editModal.accessKeys`, `editModal.hiddenFields` (FR-6.4)
- [x] 하단 실시간 마크다운 미리보기 줄 (FR-6.5)
- [x] 기존 `createOrEdit` QuickPick 임시 구현 교체, CodeLens ✎·Hover·트리·미리보기 연결
- [x] 키보드 탐색·ARIA·포커스 트랩 점검 (NFR-5) — 칸반 `Alt+←/→` 컬럼 이동 + `aria-live` 안내, `role=group/list`; 캘린더 `role=grid`, roving tabindex, 화살표/Enter; 결과 패널·편집 대화상자 오류 `role=alert`; 렌더 보기 `focus-within` 버튼·aria-label; `.sr-only` 유틸. 포커스 트랩은 패널이 독립 문서라 불필요(Escape로 닫힘)

### M6.3 칸반 / 컬럼 뷰 (`webviews/kanban/`)
- [x] D-3: **네이티브 HTML5 드래그앤드롭** 채택(의존성 없음, 웹뷰에서 안정적) — design.md D-3
- [x] 컬럼 기준: 상태 / 마감 버킷(지남·오늘·이번주·다음주·이후·없음) / 우선순위 / 파일 (FR-5.8)
- [x] 드래그 → `task/setField` 변환 규칙 (상태→status, 버킷→due, 우선순위→priority) (FR-5.9)
- [x] 카드 클릭 → 편집 모달, 더블클릭 → 원본 이동 (FR-5.10)
- [x] 데이터 소스: 저장된 쿼리 선택 (FR-5.11)
- [x] 두 호스트: 사이드바 `WebviewView`(컬럼을 탭으로) + 에디터 패널 `WebviewPanel`(전체 컬럼) — 같은 Svelte 컴포넌트 (Q-12)
- [x] 가상 스크롤(컬럼당 카드 500개 이상) (D§9) — 칸반 컬럼 150장 이상 윈도잉(`windowFor`, 64px 추정 + 6장 오버스캔, 스페이서), 결과 패널·렌더 보기 목록 `content-visibility: auto`. jsdom 테스트: 1,000장 → 60장 미만 렌더
- [x] 명령 `tasksmd.openKanban`, 마지막 컬럼 기준·쿼리를 `workspaceState`에 저장

### M6.4 쿼리 빌더 (`webviews/query-builder/`) — M4.5에서 미뤄둔 항목
- [x] 필터 행 추가/삭제, 종류별 입력 위젯(날짜·우선순위·텍스트·태그), 정렬/그룹/제한 섹션
- [x] 텍스트 ↔ 빌더 양방향 — 지원 문법은 행으로, 그 외(불리언·function 등)는 'raw' 행으로 유지 (`rows.ts`, 2 tests)
- [x] `explain`·일치 수 실시간 표시(호스트 `query/explain`), 저장 → 파일/설정(신규·업데이트), 노트에 ` ```tasks ` 삽입, 저장된 쿼리 트리 '쿼리 빌더에서 열기'

---

## M7. 추가 기능 — 알림 · 아카이브 · 통계 · 캘린더 · 업데이트 확인

**목표**: 요구사항 11-2장의 다섯 기능이 모두 동작한다.
**참조**: FR-10.*, D§7.5, D§7.6, D-5

**DoD**
- 확장 시작 시 "오늘 마감 N / 초과 M" 토스트 + OS 알림이 뜬다(설정 off 가능).
- `Tasks: Archive completed tasks` → 대상 미리보기 → `Archive.md`로 이동, Undo 한 번에 복구.
- 통계 패널에 최근 12주 막대/선 그래프가 그려진다.
- 캘린더 월간/주간에서 드래그로 날짜가 바뀐다.
- `updateCheckUrl`에 더 높은 버전의 `latest.json`을 두면 알림이 뜬다.

### M7.1 알림 (`services/NotificationService.ts`)
- [x] 시작 시 + 매일 `notifications.dailyTime`(기본 09:00) 요약 토스트, "오늘 보기" 버튼 → 사이드바 (FR-10.1, FR-10.2)
- [x] OS 알림 — macOS `osascript`, Windows PowerShell 토스트, Linux `notify-send`; `execFile` 인자 배열, 실패 시 조용히 토스트만 (FR-10.2, D§10, D-5)
- [x] 마감 임박(D-N) 일 1회 묶음 알림, 스누즈(내일/일주일; 묶음 단위) → `globalState` (FR-10.3)
- [x] 설정 `notifications.enabled|os|dailyTime|dueWithinDays` (FR-10.4)
- [x] Workspace Trust 없으면 OS 알림 비활성 (NFR-4)

### M7.2 아카이브 (`core/archive/ArchivePlanner.ts`, `services/ArchiveService.ts`)
- [x] `ArchivePlanner` (core) — 완료/취소 후 N일 지난 태스크 선별, 하위 항목 포함, 아카이브 텍스트 생성 (FR-10.5, FR-10.7)
- [x] 아카이브 파일 형식: `## YYYY-MM-DD` 헤딩 + 원본 링크(`[[파일#헤딩]]` 또는 상대 링크, 설정) + 원문 줄 (FR-10.6)
- [x] 명령 `tasksmd.archiveCompleted` — QuickPick 다중 선택(기본 전체 선택) → 하나의 `WorkspaceEdit`로 여러 파일 삭제 + 아카이브 추가 (FR-10.7, NFR-3)
- [x] 설정 `archive.file`, `archive.afterDays`, `archive.linkStyle`; 자동 실행 없음 (FR-10.8)
- [x] 테스트: planner 단위 5건, 통합 1건(QuickPick 스텁; Undo는 수동 체크리스트)

### M7.3 주간 통계 (`core/stats/WeeklyStats.ts`, `webviews/stats/`)
- [x] `WeeklyStats` (core) — 월요일 시작 12주 버킷: 완료(✅), 신규(➕), 기한 초과, 주말 시점 잔량; 날짜 없는 태스크 수 (FR-10.9, FR-10.10)
- [x] 태그·폴더 필터
- [x] Svelte 차트(외부 차트 라이브러리 없이 SVG 직접 렌더 — 번들 최소화), 요약 타일 4개 (D§7.6)
- [x] 명령 `tasksmd.openStats`

### M7.4 캘린더 (`webviews/calendar/`)
- [x] 월간/주간 전환, 표시 필드 토글(📅 ⏳ 🛫), 주 시작 월요일 (FR-10.11)
- [x] 항목 클릭 → 편집 모달, 더블클릭 → 원본, 드래그 → 해당 날짜 필드 `task/setField` (FR-10.12)
- [x] 빈 칸 더블클릭 → 마감일 채운 새 태스크, 대상 파일 `calendar.newTaskFile` (FR-10.13)
- [x] 데이터 소스 저장된 쿼리 (FR-10.14)
- [x] 명령 `tasksmd.openCalendar`, 마지막 위치 `workspaceState`

### M7.5 업데이트 확인 (`services/UpdateCheckService.ts`)
- [x] `updateCheckUrl`(파일 경로/HTTP) → `latest.json { version, vsix, notes }` 하루 1회 비교, 새 버전이면 토스트 + 경로 열기/복사 (FR-10.15)
- [x] Marketplace 설치본(`extension.packageJSON.__metadata` 또는 설치 소스)에서는 비활성 (FR-10.16)
- [x] 마지막 확인 시각 `globalState`; 신뢰되지 않은 워크스페이스에서는 무시 (NFR-4)

---

## M8. 마감 — i18n · 성능 · 접근성 · 문서 · 패키징 · 게시

**목표**: v1.0을 Marketplace/Open VSX에 게시하고 `.vsix`도 배포한다.
**참조**: NFR-1 ~ NFR-9, D§9, D§11, D§13

**DoD**
- 한국어 로케일에서 명령·설정·UI·상대 날짜가 모두 한국어로 보인다.
- 5,000 파일 / 50,000 태스크 합성 워크스페이스: 초기 스캔 < 5초, 파일 갱신 < 50ms, 쿼리 < 100ms.
- VS Code(mac/win/linux) + Cursor(mac/win)에서 수동 체크리스트 통과.
- `vsce publish`, `ovsx publish`가 CI 태그 푸시로 실행되고 Release에 `.vsix` + `latest.json`이 첨부된다.

### M8.1 국제화 (NFR-6)
- [x] 확장 측 모든 사용자 문자열 `vscode.l10n.t()`, `bundle.l10n.ko.json` 완성 — `tests/l10n-coverage.test.ts`가 소스의 226개 키 전부에 번역이 있는지·플레이스홀더가 맞는지 검사
- [x] `package.nls.ko.json` 완성(명령·설정·뷰 이름) — `tests/settings/schema.test.ts`가 `%key%` 누락 검사
- [x] 웹뷰 `t()` 키 전부 채움 (같은 검사에 포함)
- [x] 상대 날짜 표기 ko/en (`3일 남음` / `in 3 days`), 요일·월 이름
- [-] 설정 `language` — `vscode.l10n`은 VS Code 표시 언어를 따르며 확장별 재정의 API가 없어 제외 (요구사항 표에서 삭제)

### M8.2 성능 (NFR-2, D§9)
- [x] 합성 워크스페이스(5,000 파일/65,000 태스크) — `tests/perf/parse.bench.test.ts`
- [x] 파싱·재인덱스·쿼리 측정 → `docs/perf.md` (265 ms / 0.12 ms / 21~105 ms)
- [x] 병목 튜닝 — 정렬 키 사전 계산, 그룹명 캐시, urgency 할당 제거 (M4.7)
- [x] 메모리 확인 — 65k 태스크 ≈ 60 MB

### M8.3 접근성·안정성 (NFR-3, NFR-5)
- [x] 색상만으로 정보 전달하는 곳 없는지 점검 — 뱃지·칩·장식 모두 이모지/텍스트 병행, 기한 초과는 ⚠ 텍스트
- [ ] 하이 컨트라스트 테마 스크린샷 점검 (에디터 장식, 미리보기, 웹뷰) — 수동(색은 모두 `--vscode-*`/`ThemeColor`, `contributes.colors`에 hc 기본값 정의)
- [x] 웹뷰 키보드 탐색·ARIA — 카드/항목 `role=button tabindex=0` + Enter/Space, 모달 Esc/Enter·label·radiogroup, 칸반 탭 `role=tablist`; Svelte a11y 경고 0
- [ ] Remote SSH / WSL / Codespaces 동작 확인 (NFR-1) — 수동; 코드상 `workspace.fs`·`Uri` 기반이라 원격 호환
- [x] 오류 보고: 출력 채널 "Tasks for Markdown"(활성화 환경 정보 기록) + `tasksmd.showLogs` 명령

### M8.4 Dataview 쓰기 검증 (FR-1.9)
- [x] `taskFormat: dataview`에서 토글·편집·반복·아카이브 전 경로가 `[key:: value]`로 쓰는지 통합 테스트
- [x] 이모지 ↔ Dataview 변환 명령 `tasksmd.convertFormat`(파일 단위, 코드블록 제외)

### M8.5 문서
- [x] `README.md` — 기능 소개, 시작하기, 명령·단축키 표, 설정 표, 미리보기 제한, Obsidian 호환 (스크린샷/GIF는 사용자가 F5로 확인 후 추가)
- [x] `docs/user-guide.md` — 상세 사용법(한국어), FAQ
- [x] `CHANGELOG.md` 1.0.0 정리, `package.json` version 1.0.0
- [x] design.md 열린 이슈 D-1~D-5 결론 기록(각 마일스톤에서 완료), requirements.md 0.5

### M8.6 패키징·게시 (NFR-9, D§13)
- [x] `pnpm package` → `tasks-for-markdown-1.0.0.vsix` (minified, ~370KB, 23파일), `.vscodeignore` 검증
- [ ] **(사용자 작업)** Marketplace 퍼블리셔 `hastycapybara` 생성/PAT 발급 → Secrets `VSCE_PAT` — `docs/release.md`
- [ ] **(사용자 작업)** Open VSX 네임스페이스 생성/토큰 → Secrets `OVSX_PAT`
- [x] GitHub Actions `release.yml` — 태그 `v*` → 빌드·테스트·패키징·Release 첨부·(시크릿 있으면) 게시
- [x] `latest.json` 생성 스크립트 + `docs/release.md`(사내 배포 절차)
- [ ] **(사용자 결정)** 저장소 public 전환 여부 (Marketplace 게시 시점)

### M8.7 수동 테스트 체크리스트 (릴리스 전)
- [ ] VS Code macOS / Windows / Linux — 설치, 인덱싱, 토글(+`Cmd+Z` undo 복구 — 자동 테스트 불가), CodeLens, 자동완성, 미리보기 클릭, 칸반 DnD, 캘린더 DnD, 알림, 아카이브, 업데이트 확인
- [ ] Cursor macOS / Windows — 위와 동일 (특히 미리보기, 키바인딩 충돌)
- [ ] 라이트/다크/하이 컨트라스트
- [ ] 멀티 루트 워크스페이스, 신뢰되지 않은 워크스페이스
- [ ] Obsidian 볼트 샘플 파일을 열어 파싱 결과가 Obsidian과 같은지 대조 (호환성 확인용, 병행 사용은 범위 밖)

---

## 횡단 관심사 (모든 마일스톤에서 계속)

- [x] 커밋마다 `pnpm typecheck && pnpm lint && pnpm test` 통과 (CI 강제) — `.github/workflows/ci.yml` (+ xvfb 통합 테스트)
- [x] `core/`에 `vscode` import가 없는지 린트로 강제 (M0.1) — `eslint.config.mjs` no-restricted-imports
- [x] (상시 규칙) 새 설정 키는 `package.json` + `schema.ts` + nls(en/ko) + README 설정 표를 같이 갱신 — `tests/settings/schema.test.ts`가 package.json↔schema 불일치를 잡음
- [x] (상시 규칙) 새 명령은 `package.json` + 등록 코드 + nls + README 명령 표를 같이 갱신
- [x] (상시 규칙) Obsidian Tasks에서 이식한 파일에는 출처·라이선스 주석, `NOTICE.md` 유지 (NFR-8)
- [x] (상시 규칙) 마일스톤 종료 시 이 문서의 "진행 현황" 표와 `CHANGELOG.md` 갱신 — 1.0 이후 변경은 `docs/post-release-changes.md`
- [x] (상시 규칙) 설계 변경이 생기면 design.md와 SVG(`docs/imgs/`) 재생성 — design.md 0.5: 3.2 트리 현행화, 5.6 추가 메시지, 5.7 렌더 보기 시퀀스(`05-7-rendered-view.svg`), 7.8/7.9 목업(`07-8-rendered.svg`, `07-9-query-results.svg`), 7.4/7.5/9/14 보강

## M9. 공개 API (docs/api-plan.md v0.2)

### M9.1 (A1) API 코어 `src/api/`
- [x] `types.ts`: `TasksApi` v1 인터페이스, `TaskRef {path,line,expectedText?}`, `TaskDto` 재사용, `ApiError {code,message,details?}` (코드 7종)
- [x] `TasksApiImpl`: `query.run/explain/get/list/saved`, `edit.create/update/setStatus/toggle/postpone/remove/batch`, `events.onDidChangeTasks/onDidCompleteTask`, `ui.openEdit/openKanban/openCalendar/openQueryResults/reveal` — `createTasksApi(deps, caller)`
- [x] 쓰기 정책: 설정 `tasksmd.api.writePolicy` (`confirm` 기본 | `allow` | `deny`), `tasksmd.api.allowedWriters`(기억된 허용 목록), 첫 쓰기 시 확인 대화상자, 신뢰되지 않은 워크스페이스는 `UNTRUSTED`
- [x] `batch`: 순차 실행, 상한 `tasksmd.api.batchLimit`(200), 첫 실패에서 중단하고 `details.completed/results` 반환 — 단일 WorkspaceEdit 원자성은 줄 번호가 앞선 작업에 따라 바뀌어 v1에서 보류(문서에 명시)
- [x] 호출 로그 `api <caller> <method> <path>:<line>` 출력 채널
- [x] 통합 테스트 `tests/integration/api.test.ts`(getAPI(1)·버전 거부·읽기·생성·수정·상태(반복 다음 회차)·연기·batch·삭제·STALE_LINE·NOT_FOUND·이벤트·deny·명령 표면), 단위 `tests/api-commands.test.ts`(명령 선언 일치)

### M9.2 (A2) 노출과 타입
- [x] `activate()` 반환을 `{ getAPI(version), extendMarkdownIt, __internal }`로 교체(통합 테스트는 `__internal`)
- [x] `dist/api-types/api/types.d.ts` 생성(`tsconfig.api.json`, `pnpm build:api-types`, `package` 스크립트에 포함), `.vsix`에 포함
- [x] `docs/api.md`(한국어) + `docs/api.en.md`(영문): 시작 코드, 메서드 표, 명령 표, 쓰기 정책, 오류 코드, 라이브러리·CLI·MCP, 호환 정책. README 양쪽에 "API와 자동화" 절
- [x] CHANGELOG "API" 절 (1.1.0) — requirements FR-API 표는 D1 때 함께

### M9.3 (B1) 명령 표면
- [x] `tasksmd.api.<ns>.<method>` 명령 17개(`API_COMMANDS`), 인자 1개(JSON), 반환 JSON, 오류는 `{error:{code,message}}`
- [x] `commandPalette` 숨김(`when: false`, `enablement: false`), 선언 일치 단위 테스트(`tests/api-commands.test.ts`) — 생성 스크립트 대신 테스트로 강제
- [x] 통합 테스트: `executeCommand('tasksmd.api.query.run', {query, limit})`, `edit.create` 거부 시 `{error}`

### M9.4 (D1) npm 라이브러리 + CLI
- [x] pnpm workspace: `packages/core`(`src/core`를 `tsc`로 CJS 빌드, 엔트리 `src/core/main.ts`), `packages/cli`(esbuild 단일 파일 `dist/tasksmd.cjs`)
- [x] 폴더 스캐너(`.gitignore`·`tasksmd.exclude`·node_modules·.git), 파일 쓰기 `store.ts`(7-a: 줄 원문 검사 → `STALE_LINE`, 반복 삽입 위치, EOL 보존)
- [x] CLI: `query`, `explain`, `list`, `add`, `done`, `status`, `set`, `postpone`, `remove`, `--json|--md`, `--root`, `--today`, `--expect`, `.vscode/settings.json` 읽기 — `mcp`는 M9.5
- [ ] **(사용자 작업)** 발행: npm 스코프 `hastycapybara` 생성 후 `pnpm --filter … publish --access public` (docs/release.md); 불가 시 `.tgz` 릴리스 첨부
- [x] 테스트: `tests/cli.test.ts` 임시 폴더 픽스처 5건(스캔·출력 형식, 쿼리 오류, add/done(반복)/set/postpone/remove/STALE_LINE/NOT_FOUND, settings.json JSONC, help) + 빌드 산출물 스모크(examples/)

### M9.5 (C1) MCP 서버 (주 대상 Claude Code)
- [x] `tasksmd mcp --root <dir>` stdio 서버(`@modelcontextprotocol/sdk` 1.30, zod), 도구 10개(`tasks_query`, `tasks_explain_query`, `tasks_get`, `tasks_list_saved_queries`, `tasks_create`, `tasks_update`, `tasks_set_status`, `tasks_postpone`, `tasks_remove`, `tasks_syntax_reference`) + 리소스 `tasks://syntax`
- [x] 서버 안내문·도구 설명에 "저장 후 사용"과 `expectedText` 권고(필수는 아님: 에이전트가 방금 조회한 값을 넣도록 유도)
- [x] 등록 문서: docs/api.md 8절(Claude Code `claude mcp add`, Cursor `.cursor/mcp.json`, VS Code `.vscode/mcp.json`), packages/cli/README.md
- [x] 테스트: `tests/mcp.test.ts` 인메모리 전송으로 도구 목록·리소스·조회·저장 쿼리·생성→수정→상태(반복)→연기→삭제·STALE_LINE·NOT_FOUND; 빌드 산출물로 stdio 왕복 스모크(examples/) — Claude Code 실제 시나리오는 사용자 수동 확인(docs/manual-checklist.md 2-8)

### M9.6 (C2, 선택) 편집기 위임 (7-b)
- [ ] 확장이 로컬 소켓을 열고 토큰 파일로 인증, CLI/MCP는 편집기가 떠 있으면 위임

### M9.7 (F1) URI 핸들러
- [ ] `vscode://hastycapybara.tasks-for-markdown/open?path=…&line=…`, `/query?text=…`

## M10. 렌더 보기 고도화 (1.4.0)

- [x] `tasksmd.renderedAsDefault`: `workbench.editorAssociations["*.md"]` 설정/해제 QuickPick, 첫 렌더 보기에서 1회 제안
- [x] 태스크 없는 노트는 텍스트 편집기로(`rendered.sourceWhenNoTasks`), 명시적 열기는 예외
- [x] 정렬(문서 순·마감일·생성일·우선순위·긴급도)·보기(전체·미완료만·오늘·이번 주·다음 주까지·기한 초과) 툴바 — 화면만, 파일별 기억
- [x] 플러그인 `data-tfm-*` 속성, `view.ts` 단위 테스트, 통합 테스트(기본 편집기 연결 시 태스크 노트는 렌더·없는 노트는 텍스트)
- [x] 문서: user-guide, README, design.md 7.8, post-release-changes 2.14(결정 기록)

## M11. 쿼리 결과 트리 표시 (계획 확정 2026-09-28)

**목표.** 쿼리 결과에서 하위 태스크를 부모 태스크 밑에 들여써 보여 준다. 지금은 모든 결과가 평평한 목록이라 "여행 계획 세우기"의 하위인 "항공권 검색"이 따로 떨어져 나온다.

**규칙** (Obsidian Tasks의 `show tree`를 따름):
- 같은 그룹 안에서, 부모 태스크(같은 파일, 바로 위 목록 항목이 태스크인 경우)가 결과에 있으면 자식은 최상위가 아니라 부모 밑에 들어간다. 최상위 순서는 정렬 결과 그대로, 자식은 파일 순서.
- 결과에 든 태스크의 **자식은 필터와 무관하게 함께 보인다**(맥락 표시). 필터에 맞지 않는 자식은 흐리게 그린다. 개수(`N of M tasks`)와 `limit`은 필터에 맞은 태스크만 센다.
- 부모가 결과에 없고 자식만 맞으면 자식이 최상위에 나온다(백링크로 위치 확인).
- 부모가 태스크가 아닌 일반 글머리표이면 트리로 잇지 않는다(인덱스는 태스크 줄만 보관).
- 기본값: 설정 `tasksmd.query.showTree`(기본 켜짐). 쿼리마다 `show tree` / `hide tree`로 덮어쓴다. Obsidian은 기본 꺼짐이라 Obsidian에서 같은 블록을 보면 평평하게 나온다(결과 집합은 동일).
- 트리 안의 자식은 부모와 파일이 같으므로 백링크를 생략한다.

**적용 화면.** 렌더 보기의 쿼리 블록, VS Code 클래식 미리보기, 쿼리 결과 패널. 사이드바 트리 뷰·칸반·캘린더는 대상 아님(칸반·캘린더는 평평한 목록이 맞음, 사이드바는 후속 검토).

**구현.**
- [x] `src/core/query/tree.ts`: `buildTaskTree(tasks, index, { includeContext })` → `TreeNode { task, matched, children }[]`
- [x] `Query.run`: 트리가 켜졌으면 각 그룹 노드에 `tree` 부착. `QueryContext.showTree`(설정 기본값), `layout.tree`(`show/hide tree`의 명시값, 없으면 null)
- [x] HTML 렌더(`renderQueryResult`): 트리면 `ul.tfm-list > li > ul` 중첩, 맥락 자식은 `.tfm-context`로 흐리게, 자식 백링크 생략
- [x] DTO: `GroupDto.tree?: TreeDto[]`(`{ task, matched, children }`), `TaskDto.parentLine`, `TaskDto.depth` 추가(추가만이라 API v1 호환)
- [x] 쿼리 결과 패널(Svelte): `tree`가 있으면 들여쓴 카드로
- [x] 설정 `tasksmd.query.showTree`, CLI·MCP도 같은 기본값(`.vscode/settings.json` 읽기)
- [x] 테스트: 트리 구성(부모·자식·손자, 부모 없는 자식, 글머리표 부모, 맥락 자식, limit), HTML 중첩, 패널 컴포넌트, 통합 1건
- [x] 문서: user-guide 4장, README 설정 표, api.md(DTO 필드), CHANGELOG

## M12. 필드 우선순위에 맞춘 대화상자와 렌더 보기 열 배치 (계획 확정 2026-09-29)

**배경.** 필드 중요도를 1~12위로 매긴 결과(설명·마감·상태 > 우선순위·태그·반복 > 예정·시작·의존/ID > 생성·완료 시 동작·완료/취소일)에 맞춰, 자주 쓰는 것은 앞에 두고 드문 것은 접는다.

### 만들기/편집 대화상자
- 기본으로 보이는 순서: **상태 → 설명 → 우선순위 → 마감일 → 태그 → 반복**.
- **"더보기"**(접힘): 예정일 ⏳, 시작일 🛫, 의존 ⛔(ID는 자동), 생성일 ➕, 완료 시 동작 🏁. 편집하는 태스크에 이 중 값이 하나라도 있으면 처음부터 펼쳐서 보여 준다(값이 숨어 있지 않게).
- **완료일 ✅ / 취소일 ❌**: 기존 태스크를 **편집할 때만** "더보기" 안에 나온다. 새로 만들 때는 없음(완료·취소 시 자동 기록되므로).
- **태그 칸(신설)**: 설명 **끝에 붙은** 태그(`… #업무 #프로젝트A`)를 떼어 이 칸에 보여 주고, 적용할 때 설명 끝에 다시 붙인다. 문장 중간의 태그는 설명에 그대로 둔다(글을 바꾸지 않기 위해). 입력은 공백 구분, `#` 생략 가능.
- `tasksmd.editModal.hiddenFields`는 그대로 동작(새 값 `tags` 추가).

### 렌더 보기 열 배치 (`tasksmd.rendered.fieldsAlign: "columns"`, 새 기본값)
| 열 | 내용 | 폭 |
|---|---|---|
| 1 | 상태(체크박스) | 고정 |
| 2 | 설명 + 우선순위 아이콘 + 태그 (쿼리 결과 행은 그 뒤에 백링크) | 남는 폭 전부 |
| 3 | 마감일 📅 (지나면 붉게) | 고정 |
| 4 | 반복 🔁 | 고정 |
| 5 | 작성일 ➕ (흐리게) | 고정 |
| 6 | 더보기: 나머지 필드(⏳ 🛫 ⛔ 🆔 🏁 ✅ ❌), 작게·흐리게 | 고정, 넘치면 줄바꿈 |

(2026-09-29 수정: 처음엔 4열 태그·5열 반복이었으나, 태그를 설명 칸으로 옮기고 빈 자리에 작성일 열을 둠 — 사용자 요청)
- 열 모드에서는 쿼리 결과 행도 원문식(날짜만, 상대 날짜는 툴팁)으로 표시해 칸 안에 들어가게 한다.
- 줄마다 같은 열 폭을 쓰는 CSS 그리드라서 위아래 줄의 날짜·태그·반복이 세로로 정렬된다. 설명 열만 늘고 줄어들어, 하위 태스크(들여쓰기)도 오른쪽 열은 같은 위치에 선다.
- 열 모드에서 태그는 설명 글 속에서 빼 설명·우선순위 뒤에 모아 보여 준다(**표시만**, 파일은 그대로).
- 빈 칸도 자리를 차지해 열이 흐트러지지 않는다. 각 칸에 툴팁(마감일/태그/반복).
- 창이 좁으면(약 640px 미만) 열을 접고 기존 "오른쪽 정렬" 배치로 돌아간다.
- 본문 태스크 줄과 쿼리 결과 행 모두 적용. 클래식 미리보기(`Cmd+K V`)는 대상 아님.
- 기존 값 `right`(오른쪽 정렬), `inline`(원문처럼)은 그대로 선택 가능.

### 할 일
- [x] 대화상자: 순서 변경, "더보기" 접기(값 있으면 자동 펼침), 완료·취소일은 편집 시에만, 태그 칸(끝 태그 추출·재부착), 컴포넌트 테스트
- [x] 코어 렌더: `renderColumns(task, o)` → 우선순위·마감·태그·반복·더보기 칸 HTML, 플러그인·쿼리 행이 열 모드일 때 사용, 설명 글에서 태그 제거(표시만)
- [x] 렌더 보기: `fieldsAlign: columns` 기본값, 그리드 CSS·좁은 창 대응, 행 버튼(✎ ⏩)을 설명 칸 안으로
- [x] 테스트: 열 HTML(빈 칸 유지, 태그 제거, 우선순위 위치), 대화상자(순서·더보기·편집 전용 필드·태그 왕복)
- [x] 문서: user-guide, README 설정 표, CHANGELOG

## 향후 후보 (미착수)

### 한글 쿼리 문법 (2026-09-27 보류)
영어 쿼리와 기능이 같은 한글 줄을 파싱 전에 영어로 치환하는 번역 층. 사용자 결정: "나중에 해볼 만한 일". 초안:

| 한글 | 영어 |
|---|---|
| `미완료` / `완료` | `not done` / `done` |
| `마감일이 오늘 이전` · `마감일이 내일 이후` · `마감일이 2026-10-01` · `마감일이 이번 주` · `마감일 없음` | `due before today` · `due after tomorrow` · `due on 2026-10-01` · `due this week` · `no due date` |
| `예정일이 …` · `시작일이 …` · `생성일이 …` · `완료일이 …` · `일정이 …` | `scheduled` · `start` · `created` · `done` · `happens` |
| `우선순위가 높음` · `우선순위가 보통 이상` | `priority is high` · `priority is above none` |
| `설명에 X 포함` · `설명에 X 미포함` · `설명이 /re/ 일치` | `description includes/does not include/regex matches` |
| `태그에 #X 포함` · `태그 없음` · `경로에 X 포함` · `폴더에 X 포함` · `파일명에 X 포함` · `제목에 X 포함` | `tags include` · `no tags` · `path/folder/filename/heading includes` |
| `반복 태스크` · `차단됨` · `하위 항목 제외` | `is recurring` · `is blocked` · `exclude sub-items` |
| `(A) 그리고 (B)` · `또는` · `아닌` | `AND` · `OR` · `NOT` |
| `마감일 순 정렬` · `마감일 역순 정렬` · `폴더별 그룹` · `20개까지` · `백링크 숨김` · `짧게` | `sort by due` · `sort by due reverse` · `group by folder` · `limit 20` · `hide backlink` · `short mode` |

- [ ] 번역 층 + 사전, 한국어 `explain`, 자동완성 한글 항목, 쿼리 빌더 한글 출력, 영어 224건과 대조하는 한글 호환 테스트
- [ ] `Tasks: 쿼리를 영어로 변환` 명령(Obsidian 호환용) — 한글 쿼리는 Obsidian에서 동작하지 않음을 문서에 명시

## 열린 설계 이슈 추적

- [x] D-1 기본 미리보기 양방향 메시지 채널 — M5.0 스파이크: 채널 없음(`openLink`만) → 렌더 전용 + 1.0.4 렌더 보기(커스텀 에디터)로 상호작용 제공. design.md 변경 이력 0.4
- [x] D-2 Cursor `markdown.previewScripts` 지원 — M5.0: 계약 동일, 단 Cursor Preview 토글은 자체 WYSIWYG(Tiptap)라 확장 불가 → 렌더 보기로 대체
- [x] D-3 칸반/캘린더 DnD 라이브러리 — M6.3: 네이티브 HTML5 DnD, 라이브러리 없음
- [x] D-4 `rrule` 번들 크기 vs 반복 파서 이식 범위 — M3.1: `rrule` 번들(≈60KB) + Obsidian의 반복 텍스트 파서 이식
- [x] D-5 OS 알림 Linux 지원 범위 — M7.1: `notify-send` 있으면 사용, 없으면 토스트

## 변경 이력

| 날짜 | 버전 | 내용 |
|---|---|---|
| 2026-09-21 | 1.0 | M0~M8 구현 완료 기록 (unit 466 / integration 36 / CI green), 사용자 작업 항목 표시 |
| 2026-09-21 | 0.1 | 초안 — M0~M8 체크리스트, DoD, 횡단 관심사, 열린 이슈 |
