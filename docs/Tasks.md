# Tasks for Markdown — 개발 체크리스트

- 문서 버전: 0.1
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
| M4 | 쿼리 엔진 + 저장된 쿼리 + 쿼리 빌더 + 빠른 검색 | 🟡 진행 중 | |
| M5 | 마크다운 미리보기 연동 | ⬜ 대기 | D-1, D-2 스파이크 선행 |
| M6 | 웹뷰: 편집 모달 + 칸반 | ⬜ 대기 | D-3 |
| M7 | 추가 기능: 알림·아카이브·통계·캘린더·업데이트 확인 | ⬜ 대기 | D-5 |
| M8 | 마감: i18n·성능·접근성·문서·패키징·게시 | ⬜ 대기 | v1.0 |

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
- [x] `package.json` — 이름/퍼블리셔(`HMCVECDT.tasks-for-markdown`)/engines/activationEvents/scripts
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
- [ ] `toggle()`에서 DONE 진입 + 반복 → `insertLines(above|below)` (설정 `recurrence.insertPosition`)
- [ ] 설정 `recurrence.insertPosition`, `recurrence.idHandling`, `recurrence.copyDependsOn`, `recurrence.removeScheduledOnRecur`
- [ ] 하나의 `WorkspaceEdit`로 치환+삽입 원자 적용, Undo 한 번에 되돌아오는지 검증

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
- [ ] `QueryService.run(text, context)` — `(text, indexVersion)` 캐시, 인덱스 이벤트로 무효화 (FR-7.16, FR-7.17)
- [ ] 열린 쿼리 결과 자동 재실행 200ms 디바운스
- [ ] `SavedQueryStore` — (1) `tasksmd.savedQueries` 설정 (2) `.tasks/queries/*.md`(첫 ` ```tasks ` 블록) 병합, 파일 워처 (FR-5.5)
- [ ] `SavedQueryTreeProvider` — 출처 아이콘 구분, 결과를 하위 노드로 펼침, 체크박스·이동·편집
- [ ] 쿼리 편집: 텍스트(`InputBox` 멀티라인 대안 → 임시 문서 열기) + `explain` 미리보기 + 오류 줄 번호 (FR-5.7)
- [ ] 쿼리 빌더(Webview, M6 인프라 선행 ⚠) — 필터 종류 드롭다운 조립 → 텍스트 생성 (FR-5.6); M6 전까지는 텍스트 편집만
- [ ] 스마트 뷰 7종을 쿼리 텍스트로 재정의 (M1 하드코딩 제거)

### M4.6 빠른 검색·명령
- [ ] `tasksmd.quickSearch` — QuickPick 퍼지 검색, 미완료 전체, 선택 시 이동 / 버튼으로 완료·편집 (FR-5.12), 키 `Cmd/Ctrl+Shift+;`
- [ ] `tasksmd.insertQueryBlock` — ` ```tasks ` 스니펫
- [ ] `tasksmd.explainQuery` — 커서가 있는 ` ```tasks ` 블록 설명을 출력 채널/알림으로

### M4.7 테스트
- [ ] 명령어별 단위 테스트 + `explain` 스냅샷
- [ ] Obsidian Tasks `tests/Query/**` 케이스 이식 (호환성 회귀 방지)
- [ ] 벤치마크 스크립트 — 50,000 태스크 합성 인덱스에서 대표 쿼리 시간 측정, CI에서 임계값 경고

---

## M5. 마크다운 미리보기 연동

**목표**: VS Code 기본 미리보기가 Obsidian "읽기 모드" 역할을 한다 — 체크박스 클릭, 뱃지, ` ```tasks ` 렌더링.
**참조**: FR-4.*, D§5.5, D-1, D-2

**DoD**
- 미리보기에서 체크박스 클릭 → 원본 줄 토글 → 미리보기 자동 갱신.
- ` ```tasks ` 블록이 그룹 헤딩·카운트·체크박스가 있는 결과 목록으로 렌더링된다.
- 라이트/다크/하이 컨트라스트에서 색이 깨지지 않는다.
- Cursor에서도 동일하게 동작한다(또는 미지원 사항이 문서화되어 있다).

### M5.0 스파이크 (⚠ 먼저)
- [ ] D-1: 기본 미리보기 ↔ 확장 양방향 메시지 채널 확인 — `markdown.previewScripts` + `acquireVsCodeApi().postMessage`가 확장의 어떤 API로 도착하는지, 현재 VS Code 버전 기준 실험 → 결과를 design.md D-1에 기록
- [ ] D-2: Cursor에서 `markdown.previewScripts`·`markdownItPlugins` 지원 확인
- [ ] 미지원 시 대안 확정: 태스크 줄을 `command:` 링크로 렌더링 (체크박스 토글은 이 경로로 충분)

### M5.1 markdown-it 플러그인 (`src/preview/markdownItPlugin.ts`)
- [ ] `contributes.markdown.markdownItPlugins: true` + `extendMarkdownIt()` 반환
- [ ] 태스크 줄 → `<li class="tfm-task" data-path data-line>` + 체크박스 + 필드 뱃지(우선순위 색, 상대 날짜, 반복, 태그) (FR-4.2)
- [ ] 원본 이모지 표시 옵션 `preview.renderBadges: false` (FR-4.2)
- [ ] ✎ 편집 아이콘 (FR-4.3) — M6 전까지는 QuickPick 편집
- [ ] ` ```tasks ` 블록 → `<div class="tfm-query" data-query>` 플레이스홀더 (FR-4.4)
- [ ] 완료 태스크 스타일, 기한 초과 색 — `contributes.markdown.previewStyles` CSS, `--vscode-*` 변수만 사용 (FR-4.6, D§7.7)

### M5.2 미리보기 스크립트 · 브리지
- [ ] `contributes.markdown.previewScripts` — 체크박스 클릭 → `task/toggle`, 로드 시 `query/run` (FR-4.1)
- [ ] `PreviewBridge` — 메시지 수신 → `TaskEditService.toggle` / `QueryService.run` → `query/result` HTML 회신 (D§5.5)
- [ ] 결과 HTML: 그룹 헤딩, 태스크 수, `explain`, 체크박스, 원본 이동 링크 (FR-4.5)
- [ ] 인덱스 변경 시 열린 미리보기의 쿼리 결과 재전송 (FR-7.17)
- [ ] 설정 `preview.enabled` (FR-9 표)
- [ ] 서드파티 미리보기 확장 비호환 문서화 (FR-4.7)

---

## M6. 웹뷰 — 편집 모달 + 칸반

**목표**: Obsidian의 편집 모달과 8.4 컬럼 뷰에 해당하는 UI가 있다.
**참조**: FR-6.*, FR-5.8 ~ FR-5.11, D§5.6, D§7.3, D§7.4, D§10, D-3

**DoD**
- `Cmd/Ctrl+Shift+T` → 모달에서 자연어 날짜·반복·의존성을 채우고 Enter → 정규화된 줄로 치환.
- 칸반에서 카드를 "진행 중" 컬럼으로 드래그하면 원본이 `[/]`로 바뀐다.
- 웹뷰가 CSP 위반 없이 로드되고(콘솔 오류 0), 키보드만으로 모달을 조작할 수 있다.

### M6.1 웹뷰 인프라 (`src/webviews/shared/`, `WebviewHost`)
- [ ] esbuild 두 번째 엔트리 — Svelte 컴파일, `dist/webviews/<app>.js|css`, watch 모드 (D§13)
- [ ] `WebviewHost<T>` — HTML 생성(CSP nonce, `localResourceRoots: dist/webviews`), 메시지 라우팅, 인덱스 이벤트 → `state/patch` (D§5.6, D§10)
- [ ] `protocol.ts` — discriminated union 메시지 타입, 양쪽에서 import (D§5.6 표)
- [ ] `tokens.css` — `--vscode-*` 기반 우선순위/기한 색, editor/와 동일 매핑 (D§7.7)
- [ ] `state/init`에 l10n 번들 포함, Svelte `t(key)` (D§11)
- [ ] 공통 컴포넌트: TaskCard, Chip, DateInput(자연어 해석 미리보기), StatusSelect
- [ ] `retainContextWhenHidden` 최소화, 숨김 시 상태를 `workspaceState`에 저장 (NFR-4)

### M6.2 편집 모달 (`webviews/edit-modal/`)
- [ ] 필드 전부: 설명(멀티라인·글로벌 필터 자동), 우선순위, 반복(텍스트+프리셋+유효성+when done), 시작/예정/마감(자연어+피커), 접힌 생성/완료/취소일, 상태, 의존성(전/후 양방향 검색), 완료 시 동작 (FR-6.1)
- [ ] 열기 규칙: 커서가 태스크 줄이면 편집, 아니면 그 위치에 새 태스크; 미리보기·트리·칸반에서 호출 (FR-6.2)
- [ ] 적용(Enter/버튼) → `task/setField`·`task/create` → 정규화 줄 치환; Esc 취소 (FR-6.3)
- [ ] 액세스 키(Alt+글자), 설정 `editModal.accessKeys`, `editModal.hiddenFields` (FR-6.4)
- [ ] 하단 실시간 마크다운 미리보기 줄 (FR-6.5)
- [ ] 기존 `createOrEdit` QuickPick 임시 구현 교체, CodeLens ✎·Hover·트리·미리보기 연결
- [ ] 키보드 탐색·ARIA·포커스 트랩 (NFR-5)

### M6.3 칸반 / 컬럼 뷰 (`webviews/kanban/`)
- [ ] D-3: DnD 라이브러리 결정(`svelte-dnd-action` vs 자체) → 기록
- [ ] 컬럼 기준: 상태 / 마감 버킷(지남·오늘·이번주·다음주·이후·없음) / 우선순위 / 파일 (FR-5.8)
- [ ] 드래그 → `task/setField` 변환 규칙 (상태→status, 버킷→due, 우선순위→priority) (FR-5.9)
- [ ] 카드 클릭 → 편집 모달, 더블클릭 → 원본 이동 (FR-5.10)
- [ ] 데이터 소스: 저장된 쿼리 선택 (FR-5.11)
- [ ] 두 호스트: 사이드바 `WebviewView`(컬럼을 탭으로) + 에디터 패널 `WebviewPanel`(전체 컬럼) — 같은 Svelte 컴포넌트 (Q-12)
- [ ] 가상 스크롤(컬럼당 카드 500개 이상) (D§9)
- [ ] 명령 `tasksmd.openKanban`, 마지막 컬럼 기준·쿼리를 `workspaceState`에 저장

### M6.4 쿼리 빌더 (`webviews/query-builder/`) — M4.5에서 미뤄둔 항목
- [ ] 필터 행 추가/삭제, 종류별 입력 위젯(날짜·우선순위·텍스트·태그), 정렬/그룹/제한 섹션
- [ ] 텍스트 ↔ 빌더 양방향(파싱 가능한 범위만; 불가능하면 텍스트 모드 고정)
- [ ] `explain` 실시간 표시, 저장 → `SavedQueryStore`

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
- [ ] 시작 시 + 매일 `notifications.dailyTime`(기본 09:00) 요약 토스트, "오늘 보기" 버튼 → 사이드바 (FR-10.1, FR-10.2)
- [ ] OS 알림 — macOS `osascript`, Windows PowerShell 토스트, Linux `notify-send`; `execFile` 인자 배열, 실패 시 조용히 토스트만 (FR-10.2, D§10, D-5)
- [ ] 마감 임박(D-N) 일 1회 묶음 알림, 태스크별 스누즈(내일/다음주) → `globalState` (FR-10.3)
- [ ] 설정 `notifications.enabled|os|dailyTime|dueWithinDays` (FR-10.4)
- [ ] Workspace Trust 없으면 OS 알림 비활성 (NFR-4)

### M7.2 아카이브 (`core/archive/ArchivePlanner.ts`, `services/ArchiveService.ts`)
- [ ] `ArchivePlanner` (core) — 완료/취소 후 N일 지난 태스크 선별, 하위 항목 포함, 아카이브 텍스트 생성 (FR-10.5, FR-10.7)
- [ ] 아카이브 파일 형식: `## YYYY-MM-DD` 헤딩 + 원본 링크(`[[파일#헤딩]]` 또는 상대 링크, 설정) + 원문 줄 (FR-10.6)
- [ ] 명령 `tasksmd.archiveCompleted` — QuickPick 다중 선택(기본 전체 선택) → 하나의 `WorkspaceEdit`로 여러 파일 삭제 + 아카이브 추가 (FR-10.7, NFR-3)
- [ ] 설정 `archive.file`, `archive.afterDays`, `archive.linkStyle`; 자동 실행 없음 (FR-10.8)
- [ ] 테스트: planner 단위, 통합 Undo

### M7.3 주간 통계 (`core/stats/WeeklyStats.ts`, `webviews/stats/`)
- [ ] `WeeklyStats` (core) — 월요일 시작 12주 버킷: 완료(✅), 신규(➕), 기한 초과, 주말 시점 잔량; 날짜 없는 태스크 수 (FR-10.9, FR-10.10)
- [ ] 태그·폴더 필터
- [ ] Svelte 차트(외부 차트 라이브러리 없이 SVG 직접 렌더 — 번들 최소화), 요약 타일 4개 (D§7.6)
- [ ] 명령 `tasksmd.openStats`

### M7.4 캘린더 (`webviews/calendar/`)
- [ ] 월간/주간 전환, 표시 필드 토글(📅 ⏳ 🛫), 주 시작 월요일 (FR-10.11)
- [ ] 항목 클릭 → 편집 모달, 더블클릭 → 원본, 드래그 → 해당 날짜 필드 `task/setField` (FR-10.12)
- [ ] 빈 칸 더블클릭 → 마감일 채운 새 태스크, 대상 파일 `calendar.newTaskFile` (FR-10.13)
- [ ] 데이터 소스 저장된 쿼리 (FR-10.14)
- [ ] 명령 `tasksmd.openCalendar`, 마지막 위치 `workspaceState`

### M7.5 업데이트 확인 (`services/UpdateCheckService.ts`)
- [ ] `updateCheckUrl`(파일 경로/HTTP) → `latest.json { version, vsix, notes }` 하루 1회 비교, 새 버전이면 토스트 + 경로 열기/복사 (FR-10.15)
- [ ] Marketplace 설치본(`extension.packageJSON.__metadata` 또는 설치 소스)에서는 비활성 (FR-10.16)
- [ ] 마지막 확인 시각 `globalState`; 신뢰되지 않은 워크스페이스에서는 무시 (NFR-4)

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
- [ ] 확장 측 모든 사용자 문자열 `vscode.l10n.t()` 로 교체, `bundle.l10n.ko.json` 완성
- [ ] `package.nls.ko.json` 완성(명령·설정·뷰 이름)
- [ ] 웹뷰 `t()` 키 전부 채움
- [ ] 상대 날짜 표기 ko/en (`3일 남음` / `in 3 days`), 요일·월 이름
- [ ] 설정 `language: auto | en | ko` (VS Code 로케일 우선)

### M8.2 성능 (NFR-2, D§9)
- [ ] 합성 워크스페이스 생성 스크립트(5,000 파일/50,000 태스크)
- [ ] 초기 스캔·파일 갱신·쿼리·장식 시간 측정 스크립트, 결과를 `docs/perf.md`에 기록
- [ ] 병목 프로파일링 후 튜닝 (파서 프리체크, 캐시, 청크 크기)
- [ ] 메모리 상한 확인 (Task ≈ 1KB × 50,000)

### M8.3 접근성·안정성 (NFR-3, NFR-5)
- [ ] 색상만으로 정보 전달하는 곳 없는지 점검 (아이콘/텍스트 병행)
- [ ] 하이 컨트라스트 테마 스크린샷 점검 (에디터 장식, 미리보기, 웹뷰)
- [ ] 웹뷰 키보드 탐색·ARIA 검토
- [ ] Remote SSH / WSL / Codespaces 동작 확인 (NFR-1)
- [ ] 오류 보고: 출력 채널 "Tasks for Markdown" + `tasksmd.showLogs` 명령

### M8.4 Dataview 쓰기 검증 (FR-1.9)
- [ ] `taskFormat: dataview`에서 토글·편집·반복·아카이브 전 경로가 `[key:: value]`로 쓰는지 통합 테스트
- [ ] 이모지 → Dataview 변환 명령 `tasksmd.convertFormat`(파일 단위, 선택 사항)

### M8.5 문서
- [ ] `README.md` — 기능 소개, 스크린샷/GIF, 설치, 문법 요약, 쿼리 요약, 설정 표, Obsidian 호환 범위
- [ ] `docs/user-guide.md` — 상세 사용법(한국어), FAQ
- [ ] `CHANGELOG.md` v1.0.0 정리
- [ ] design.md 열린 이슈 D-1~D-5 결론 기록, requirements.md 최종 상태 갱신

### M8.6 패키징·게시 (NFR-9, D§13)
- [ ] `pnpm package` → `.vsix` 생성, `.vscodeignore` 검증(번들 크기 확인)
- [ ] Marketplace 퍼블리셔 `HMCVECDT` 생성/토큰 발급, `vsce publish` 시험 (pre-release 채널로 먼저)
- [ ] Open VSX 네임스페이스 생성, `ovsx publish` 시험
- [ ] GitHub Actions `release.yml` — 태그 `v*` → 빌드·테스트·패키징·Release 첨부·(시크릿 있으면) 게시
- [ ] `latest.json` 생성 스크립트 + 사내 공유 경로 안내 문서
- [ ] 저장소 public 전환 여부 결정 (Marketplace 게시 시점)

### M8.7 수동 테스트 체크리스트 (릴리스 전)
- [ ] VS Code macOS / Windows / Linux — 설치, 인덱싱, 토글(+`Cmd+Z` undo 복구 — 자동 테스트 불가), CodeLens, 자동완성, 미리보기 클릭, 칸반 DnD, 캘린더 DnD, 알림, 아카이브, 업데이트 확인
- [ ] Cursor macOS / Windows — 위와 동일 (특히 미리보기, 키바인딩 충돌)
- [ ] 라이트/다크/하이 컨트라스트
- [ ] 멀티 루트 워크스페이스, 신뢰되지 않은 워크스페이스
- [ ] Obsidian 볼트 샘플 파일을 열어 파싱 결과가 Obsidian과 같은지 대조 (호환성 확인용, 병행 사용은 범위 밖)

---

## 횡단 관심사 (모든 마일스톤에서 계속)

- [ ] 커밋마다 `pnpm typecheck && pnpm lint && pnpm test` 통과 (CI 강제)
- [ ] `core/`에 `vscode` import가 없는지 린트로 강제 (M0.1)
- [ ] 새 설정 키는 `package.json` + `Settings.ts` + nls(en/ko) + requirements 표를 같이 갱신
- [ ] 새 명령은 `package.json` + `registerCommands.ts` + nls + FR-8 표를 같이 갱신
- [ ] Obsidian Tasks에서 이식한 파일에는 출처·라이선스 주석, `NOTICE.md` 유지 (NFR-8)
- [ ] 마일스톤 종료 시 이 문서의 "진행 현황" 표와 `CHANGELOG.md` 갱신
- [ ] 설계 변경이 생기면 design.md와 SVG(`docs/imgs/`) 재생성

## 열린 설계 이슈 추적

- [ ] D-1 기본 미리보기 양방향 메시지 채널 — M5.0에서 스파이크 → 결론을 design.md에 기록
- [ ] D-2 Cursor `markdown.previewScripts` 지원 — M5.0
- [ ] D-3 칸반/캘린더 DnD 라이브러리 — M6.3
- [ ] D-4 `rrule` 번들 크기 vs 반복 파서 이식 범위 — M3.1
- [ ] D-5 OS 알림 Linux 지원 범위 — M7.1

## 변경 이력

| 날짜 | 버전 | 내용 |
|---|---|---|
| 2026-09-21 | 0.1 | 초안 — M0~M8 체크리스트, DoD, 횡단 관심사, 열린 이슈 |
