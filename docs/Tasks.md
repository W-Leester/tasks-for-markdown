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
| M10 | 렌더 보기 고도화: 기본 편집기 대체, 정렬·보기 툴바 | ✅ 완료(1.4.0) | history-internal.md 2부 2.14 |
| M11 | 쿼리 결과 트리 표시 | ✅ 완료(1.6.0) | 이 문서 M11, design.md 7.10 |
| M12 | 대화상자 필드 순서·더보기, 렌더 보기 열 배치 | ✅ 완료(1.7.0) | 이 문서 M12, design.md 7.11 |
| M13 | 태스크 메모(하위 글머리표): 렌더 보기 추가·표시·대화상자 | ✅ 완료(1.8.0) | 이 문서 M13, design.md 7.12 |
| M14 | 렌더 보기 열 숨기기(툴바 `열 ▾`) | ✅ 완료(1.9.0) | 이 문서 M14, design.md 7.13 |
| M15 | 열 제목 줄(쿼리 결과·본문), 툴바와 같은 전역 열 숨기기 | ✅ 완료(1.11.0; 1.10.0은 블록별) | 이 문서 M15, design.md 7.14 |
| M16 | 렌더 보기 열 너비 조절(제목 줄 경계 끌기) | ✅ 완료(1.12.0) | 이 문서 M16, design.md 7.15 |
| M17 | 외부 연동 보강(독립 타입, 메모·기능 확인·상태 알림·isBlocking, CLI·MCP), 출처 표시 | ✅ 완료(1.13.0) | 이 문서 M17, release.md |
| M18 | 마켓플레이스 정식 공개 준비(1.0.0 재시작, 저장소 공개, 영어 README, npm) | ✅ 준비 완료(1.0.0) — 계정·공개·태그는 사용자(release.md "첫 공개 순서") | 이 문서 M18, release.md |
| M19 | 칸반 격자 배치(창 폭에 맞춰 2×2 등으로 균형 배치) | ✅ 완료(1.0.0에 포함) | 이 문서 M19 |
| M20 | 마켓 업로드 거절 대응: 원인은 검색어 — 통과한 검색어로 교체 | ✅ 해결(2026-10-02 재업로드 성공) | 이 문서 M20 |
| M21 | 확장 안에서 AI 연결 제공(VS Code MCP 등록, Cursor 설정 등록, 터미널 명령) | 📝 계획만(1.1.0 후보, 2026-10-02) | 이 문서 M21 |
| M22 | README 개편: 강점(AI·API) 강조, 움직이는 예시 GIF, 사이트 연결 | 🟡 진행 중(2026-10-03) | 이 문서 M22 |

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
- [x] 키바인딩 `Cmd/Ctrl+Enter` — `editorTextFocus && editorLangId == markdown && tasksmd.onTaskLine` (Q-13) (→ 2026-10-01 `Ctrl+Shift+Enter`로 변경: Markdown All in One이 `Cmd/Ctrl+Enter`를 먼저 가져감)
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
- [x] (상시 규칙) 마일스톤 종료 시 이 문서의 "진행 현황" 표와 `CHANGELOG.md` 갱신 — 공개 이후는 `CHANGELOG.md`, 공개 전 내부 이력은 `docs/history-internal.md`
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
- [x] 문서: user-guide, README, design.md 7.8, history-internal.md 2부 2.14(결정 기록)

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
| 4 | 작성일 ➕ (흐리게) | 고정 |
| 5 | 나머지 필드 전부(🔁 ⏳ 🛫 ⛔ 🆔 🏁 ✅ ❌), 작게 | 고정, 넘치면 줄바꿈 |

(2026-09-29 수정 이력: 4열 태그·5열 반복 → 태그를 2열로, 작성일 열 신설 → 반복도 나머지 열로 합쳐 5열 구성. 모두 사용자 요청. "빈 칸이면 다음 열을 당기기"는 위아래 정렬이 깨져 채택하지 않음)
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

## M13. 태스크 메모 (계획 확정 2026-09-29)

**저장 형식.** 메모는 태스크 **바로 아래에 들여쓴 일반 글머리표**(체크박스 없음)다. Obsidian에서도 그대로 보이고 파일만 읽어도 이해된다. 새 이모지 필드는 만들지 않는다.
```markdown
- [x] 계약서 검토 #업무 🔺 📅 2026-09-26
  - 3조 위약금 조항 법무팀 확인 필요
  - 9/25 김대리 회신 대기
  - [x] 법무팀 메일 보내기        ← 하위 태스크(메모 아님)
```
- 메모 = 태스크의 **직계** 자식 중 체크박스가 없는 목록 항목. 그 아래 더 깊은 글머리표는 v1에서 메모로 치지 않는다(렌더 보기 본문에는 원래대로 보임).
- 인덱스: 파서가 태스크마다 메모 줄(줄 번호·글)을 모아 `TaskLocation.notes`에 둔다. DTO `TaskDto.notes: { line, text }[]` 추가(API v1 호환, 추가만).

**1. 렌더 보기에서 메모 남기기.** 태스크 줄 hover 버튼 `✎ ⏩` 옆에 `💬`. 누르면 그 줄 아래 입력칸 → Enter로 저장, Esc 취소. 저장 위치는 기존 메모의 마지막 줄 뒤(없으면 태스크 바로 다음 줄), 들여쓰기는 태스크보다 한 단계 깊게. `TaskEditService.addNote`가 태스크 줄 원문을 확인한 뒤 한 줄만 끼워 넣는다(파일 전체를 다시 쓰지 않음, 되돌리기 가능).

**2. 메모 표시.**
- 렌더 보기 본문: 메모 줄은 원래처럼 태스크 아래 보이되 `💬` 표시와 흐린 작은 글씨로 구분(`li.tfm-note`).
- 쿼리 결과(렌더 보기·클래식 미리보기): 메모가 있는 행에 `💬 2` 표시, 누르면 펼쳐서 메모 목록(`<details>`라 스크립트 없는 클래식 미리보기에서도 동작). 열 모드에서는 2열(설명·우선순위·태그 뒤).
- 쿼리 결과 패널·칸반 카드: `💬 2` 칩, 마우스를 올리면 메모 내용.

**3. 편집 대화상자 메모 칸.** "더보기" 안에 여러 줄 입력칸(한 줄 = 메모 하나). 기존 메모를 불러와 고치고, 적용하면 기존 메모 줄을 지우고 태스크 바로 아래에 새로 쓴다(하위 태스크는 건드리지 않음). 메모가 있으면 더보기가 자동으로 펼쳐지고 버튼에 개수 표시. 새 태스크도 메모와 함께 만들 수 있음.

**API.** `edit.update(ref, { notes: string[] })`로 메모 전체 교체. CLI·MCP는 후속(표시는 DTO로 이미 나감).

### 할 일
- [x] 파서: 직계 일반 글머리표를 `notes`로 수집, `TaskDto.notes`
- [x] 편집 서비스: `addNote(task, text)`, `setNotes(task, notes)`(원문 검사, 단일 WorkspaceEdit)
- [x] 렌더 보기: `💬` 버튼·입력칸·`doc/addNote`, 본문 메모 스타일
- [x] 코어 렌더: 쿼리 행 `💬 N` + `<details>` 메모 목록(열/비열 모두), 플러그인이 본문 메모 li에 `tfm-note`
- [x] 패널·카드 칩
- [x] 대화상자: 메모 칸(더보기), 자동 펼침·개수, 생성 시 메모
- [x] API `notes` 변경
- [x] 테스트(파서, 렌더, 편집 서비스 통합, 대화상자, API), 문서(user-guide, api.md, CHANGELOG)

## M14. 렌더 보기 열 숨기기 (계획 확정 2026-09-30)

**범위.** 렌더 보기(`tasksmd.rendered`)에서만. 기본 마크다운 미리보기는 스크립트가 돌지 않아 버튼을 둘 수 없고, Cursor Preview 토글은 확장이 손댈 수 없다. 쿼리 블록의 `hide …` 줄(파일에 저장, Obsidian 호환)은 지금처럼 그대로 쓴다.

**UI.** 위쪽 툴바 `정렬 · 보기` 옆에 `열 ▾` 메뉴. 체크박스 세 개:
- 마감일(3열), 작성일(4열), 나머지 필드(5열: 반복·예정·시작·의존·ID·완료 시 동작·완료/취소일).
- 1열(상태)과 2열(설명·우선순위·태그)은 숨길 수 없다.
- 숨긴 열이 있으면 메뉴 제목에 `열 · 1개 숨김`처럼 표시.
- 노트 본문의 태스크 줄과 ```tasks 결과 행에 똑같이 적용된다.

**동작.**
- 화면만 바꾼다. 파일은 그대로.
- 숨긴 열은 자리를 비우지 않고 남은 열이 당겨진다(grid 트랙을 다시 계산).
- 선택은 **모든 노트에 공통**으로 기억한다(열 구성은 노트보다 취향의 문제라서). 정렬·보기는 지금처럼 파일별.
- 열 배치(`tasksmd.rendered.fieldsAlign: columns`, 기본값)에서만 메뉴가 보인다. `right`/`inline` 배치에는 열이 없다.
- 좁은 창에서 열이 접히는 경우에도 숨긴 항목은 숨긴 채로 둔다.

### 할 일
- [x] 툴바 `열 ▾` 메뉴(체크박스), 숨김 개수 표시, columns 배치에서만 표시
- [x] 숨김 클래스 + grid 트랙 재계산(`--rv-cols`)
- [x] 상태 저장: `doc/columns` 메시지 → globalState, `doc/html`에 `hiddenColumns` 포함
- [x] 테스트(웹뷰: 토글 → 메시지·클래스·트랙, 호스트 왕복), 문서(user-guide, README, CHANGELOG)

## M15. 쿼리 결과 열 제목 줄 — 블록별 열 숨기기 (계획 확정 2026-09-30)

**범위.** 렌더 보기, 열 배치(`columns`)에서 ```tasks **쿼리 결과 상자에만**. 노트 본문의 태스크 목록에는 제목 줄을 두지 않는다(목록이 글 사이사이로 끊겨 지저분해짐) — 본문은 툴바 `열 ▾`(M14)로.

**UI.**
- 결과 상자 맨 위에 **얇은 열 제목 줄**(평소엔 가는 선 높이). 마우스를 올리거나 키보드 포커스가 들어가면 펼쳐져 열 제목이 보인다: `설명 | 마감일 ✕ | 생성일 ✕ | 나머지 필드 ✕`. 제목 칸은 아래 행과 같은 grid 트랙이라 열 위치가 맞는다.
- `✕` → 그 블록에서만 해당 열을 숨기고 남은 열이 당겨진다.
- 숨긴 열은 제목 줄 오른쪽 끝의 칩 `+ 생성일`로 되살린다(제목 줄이 펼쳐졌을 때 보임). 공간이 모자라면 툴바 `열 ▾`로도 정리할 수 있다.

**규칙.**
- 블록별 설정은 **쿼리 블록마다 따로** 기억한다. 블록을 알아보는 기준은 노트 + 쿼리 내용(해시). 줄 위치가 바뀌어도 유지되고, 쿼리 내용을 고치면 새 블록으로 본다(설정 초기화).
- 실제로 숨는 열 = 툴바 `열 ▾`에서 숨긴 열(모든 노트 공통) ∪ 이 블록에서 숨긴 열. 툴바에서 숨긴 열은 제목 줄에 나오지 않으며 툴바에서 되살린다. 칩은 이 블록에서 숨긴 열만.
- 파일은 바뀌지 않는다(화면 설정). 기본 미리보기·Obsidian에 남기려면 지금처럼 쿼리에 `hide …` 줄.
- 좁은 창(열이 접히는 폭)에서는 제목 줄을 숨긴다.

### 할 일
- [x] 플러그인: 쿼리 블록에 `data-tfm-query-key`(쿼리 내용 해시)
- [x] 웹뷰: 제목 줄 삽입·호버 펼침·✕·`+` 칩, 블록 단위 숨김 클래스와 `--rv-cols`
- [x] 호스트: `doc/blockColumns { key, hidden }` → workspaceState(노트별), `doc/html.blockColumns`
- [x] 테스트(웹뷰: 제목 줄·✕·칩·메시지·전역과 합집합, 호스트 왕복/해시), 스크린샷 확인, 문서(user-guide, CHANGELOG)

### M15 개정 (2026-09-30, 사용 후 결정)

써 보니 쿼리마다 따로보다 **한 번에 처리**하는 편이 낫다는 사용자 결정. 제목 줄 스타일(가는 선 → 호버 시 제목과 `✕`)은 유지.
- **블록별 설정 폐지.** 제목 줄의 `✕`와 `+ 열 이름` 칩은 툴바 `열 ▾`와 **같은 설정**(모든 노트 공통)을 바꾼다. 어디서 끄든 모든 표와 노트 본문에서 빠지고, 툴바 체크 표시도 함께 바뀐다. 칩에는 숨긴 열이 모두 나온다. 블록 식별(쿼리 해시)과 노트별 저장은 제거.
- **노트 본문의 태스크 목록에도 제목 줄.** 앞서 "지저분해진다"며 뺐으나, 가는 선이라 부담이 적고 본문에서도 같은 조작을 원한다는 결정. 태스크가 들어 있는 **맨 위 단계 목록**마다 첫 줄에 붙는다(하위 목록에는 없음). 정렬·보기로 행이 움직여도 제목 줄은 맨 위에 남는다.

- [x] `✕`/`+` → 전역 숨김(`doc/columns`), 툴바 체크 연동; 블록별 저장·`data-tfm-query-key` 제거
- [x] 본문 맨 위 단계 태스크 목록에 제목 줄(`li.rv-colhead`, 정렬 시에도 맨 위)
- [x] 테스트 갱신, 스크린샷, 문서(user-guide, CHANGELOG)


## M16. 렌더 보기 열 너비 조절 (계획 확정 2026-09-30)

**UI.** 열 제목 줄(M15)이 펼쳐졌을 때 마감일·생성일·나머지 필드 열의 **왼쪽 경계**에 끌기 손잡이(마우스를 올리면 `↔` 커서와 세로 막대).
- 끌면 그 경계가 마우스를 따라가고, 그 열이 넓어지거나 좁아진다. 설명 열(남는 폭 전부)이 그만큼 줄거나 늘고, 다른 경계는 움직이지 않는다.
- 끄는 동안 제목 줄은 펼친 채로 유지.
- 손잡이 **더블클릭** → 그 열 기본 너비로.
- 키보드: 손잡이에 포커스(Tab) 후 `←`/`→`로 0.5em씩, `Home`으로 기본값.
- 범위 3em ~ 40em. 설명 열은 최소 8em을 지킨다.

**규칙.**
- 열 숨기기와 같이 **모든 노트·모든 표에 공통**으로 기억(globalState), 열려 있는 다른 렌더 보기에도 반영. 파일은 그대로.
- 단위는 em이라 글자 크기(`tasksmd.rendered.fontSize`)를 바꿔도 비율이 유지된다.
- 기본값: 마감일 8.6em, 생성일 8.6em, 나머지 필드 18em(최대 폭; 창이 좁으면 줄어듦).
- 좁은 창(열 접힘)에서는 적용하지 않는다.

### 할 일
- [x] `columnTracks(hidden, widths)`, 손잡이(포인터 끌기·더블클릭·키보드), 끄는 동안 제목 줄 유지
- [x] 호스트: `doc/columnWidths { widths }` → globalState, `doc/html.columnWidths`, 다른 패널에 전파
- [x] 테스트(트랙 계산·범위, 끌기/키보드/더블클릭 → 메시지), 스크린샷, 문서(user-guide, CHANGELOG)

## M17. 외부 연동 보강 — API·CLI·MCP 공백 채우기, 출처 표시 (계획 확정 2026-09-30)

점검 결과(2026-09-30)와 사용자 결정. 모두 **추가만** 하므로 API 버전 1 유지.

**1. 독립 타입 파일.** `src/api/types.ts`가 내부 `core/dto`를 불러와서, 이 파일 하나만 복사하면 컴파일되지 않는다. 공개 타입(TaskDto·GroupDto·TreeDto·SavedQueryDto 포함)을 이 파일 안에 직접 정의해 **import 없는 한 파일**로 만든다. 내부 DTO와 모양이 어긋나면 컴파일 단계에서 잡히도록 양방향 대입 검사를 둔다. 다른 개발자에게는 GitHub의 이 파일(또는 VSIX 안 `dist/api-types/api/types.d.ts`)을 복사하라고 안내. npm 타입 패키지 `@hastycapybara/tasks-api`는 1.0.0 공개 때(release.md에 기록).

**2. 메모 쓰기를 세 곳 모두에.**
- 확장 API: `edit.addNote(ref, text)`(한 줄 추가, 렌더 보기 💬와 같은 동작), `batch`의 `{ op: 'addNote' }`, 명령 `tasksmd.api.edit.addNote`.
- CLI: `tasksmd note <path:line> <text>`(한 줄 추가), `tasksmd add … --note <text>`, `tasksmd set <path:line> --notes "a\nb"`(전체 교체, 빈 값이면 삭제).
- MCP: `tasks_add_note` 도구, `tasks_create`·`tasks_update`에 `notes`.
- 공통 로직: 파일 줄 배열에서 메모를 넣고 바꾸는 순수 함수를 core에 두고(CLI·MCP), 확장은 같은 규칙(`noteBlock`)으로 WorkspaceEdit.

**3. AI용 문법 설명서(`tasks://syntax`, `tasks_syntax_reference`).** 메모 형식(태스크 아래 들여쓴 체크박스 없는 글머리표)과 마감일 필수 규칙(`requireDueDate`, 기본 켜짐)을 추가.

**4. 마감일 필수.** api.md(한·영)에 "기본 설정에서는 `edit.create`에 `due` 필수, 없으면 `INVALID_ARGUMENT`"를 명시. 설정 값은 6의 `info()`로 알려 준다. API가 이 설정을 무시하게 하지는 않는다(사용자 규칙).

**5.** = 2의 `addNote`.

**6. 기능 확인.** `api.extensionVersion`(예 `1.13.0`), `api.features`(지원 기능 이름 목록), `api.info()` → `{ extensionVersion, apiVersion: 1, features, settings: { requireDueDate, taskFormat, globalFilter } }`. 기능 이름과 추가된 버전을 api.md 표로 관리: `tree`(1.6.0), `notes`(1.8.0), `notes.add`·`info`·`events.status`·`isBlocking`(1.13.0).

**7. 상태 변경 알림.** `events.onDidChangeStatus({ before, after, next?, deleted })` — 완료뿐 아니라 진행 중·취소·다시 열기 등 모든 상태 변경(에디터·사이드바·API 어디서든).

**8. `TaskDto.isBlocking`.** 다른 미완료 태스크가 이 태스크를 ⛔로 기다리는지. 확장·CLI·MCP 결과에 모두 들어간다(공통 DTO).

**9. MCP 필드 보강.** `tasks_create`·`tasks_update`에 `created`·`done`·`cancelled` 날짜, `tasks_create`에 `tags`(설명 끝에 붙임), 위 `notes`.

**10.** 렌더 보기 열기 API는 만들지 않는다(사용자 결정: 렌더 보기는 사람이 에디터에서 직접 보는 화면).

**출처 표시(Obsidian Tasks에 대한 존중).** README(한·영) 첫머리에 "Obsidian Tasks 플러그인에서 출발했다"는 문장, 감사의 말 보강(원작자·기여자에게 감사, 원본 문서·저장소 링크, Obsidian 사용자에게 원본 권유, 후원 페이지가 있으면 링크), 마켓플레이스 소개 문구. 로고·이름을 우리 것처럼 쓰지 않고 "관련 없음" 문구 유지.

**문서.** 버전 관리와 배포 때 빠뜨리면 안 되는 항목을 [release.md](release.md) "빠뜨리지 말 것" 체크리스트로 정리(세 곳 동시 반영, 기능 목록·버전 표, 타입 파일, 1.0.0 공개 시 버전 번호 문제 등).

### 할 일
- [x] release.md 체크리스트 (먼저)
- [x] 독립 타입 파일 + 내부 DTO와 양방향 검사 + import 없음 검사
- [x] core: 메모 삽입/교체 순수 함수, `TaskDto.isBlocking`
- [x] 확장 API: `addNote`, batch·명령, `extensionVersion`·`features`·`info()`, `onDidChangeStatus`
- [x] CLI: `note`, `add --note`, `set --notes`
- [x] MCP: `tasks_add_note`, create/update의 notes·created·done·cancelled·tags, 문법 설명서
- [x] 테스트(단위·CLI·MCP·통합), 문서(api.md·api.en.md, README 한·영, CHANGELOG, NOTICE 점검)

## M18. 마켓플레이스 정식 공개 준비 (계획 확정 2026-09-30)

**사용자 결정(2026-09-30).**
1. 버전은 **1.0.0으로 다시 시작**한다(내부 개발 버전은 1.13.0까지). 확장·`packages/core`·`packages/cli`·새 타입 패키지 모두 1.0.0.
2. GitHub 저장소를 **공개**한다.
3. 마켓 페이지(README.md)는 **영어 기본**, 한국어 README(README.ko.md)로 연결.
4. CLI·MCP(`@hastycapybara/tasks-cli`), 라이브러리(`@hastycapybara/tasks-core`), 타입(`@hastycapybara/tasks-api`)을 npm에 **함께 배포**.
5. 아이콘: 사용자가 준 `media/icon_v1.png`에서 배경을 빼고 타일만 잘라 `media/icon.png`(256×256, 투명 모서리).

**할 일 (제가)**
- 패키지 정보: `icon`, `version 1.0.0`, 영어 우선 소개문, 분류·검색어 보강, `galleryBanner`. `.vscodeignore`에 `examples/**`, `media/icon_v1.png`(설치 파일에서 제외; 확장이 쓰지 않음).
- README: 영어를 `README.md`로, 한국어를 `README.ko.md`로. 서로 연결. 문서 안 링크 정리(공개 저장소 기준 상대 경로). **README 이미지는 PNG/GIF만**(마켓이 SVG를 거부) — 렌더 보기·쿼리 결과 스크린샷을 PNG로.
- 버전 기준 정리: 공개 사용자에게는 1.0.0이 처음이므로 API 문서·타입 주석의 "1.6.0/1.8.0/1.13.0에 추가" 표기를 **1.0.0 기준**으로 바꾼다(기능 목록 표는 전부 1.0.0).
- CHANGELOG: `1.0.0 — 첫 공개` 항목(영어·한국어 요약)만 남기고, 내부 개발 이력(0.x~1.13.0)과 docs/post-release-changes.md는 `docs/history-internal.md`로 옮긴다.
- npm: `packages/api`(타입 패키지) 신설, 세 패키지 메타데이터 점검, Release 워크플로에 npm 게시 단계(`NPM_TOKEN` 있을 때만).
- 전체 테스트, `vsce ls`로 설치 파일 확인, 수동 테스트 목록 정리.

**할 일 (사용자)**
- 계정·토큰: VS Code Marketplace 퍼블리셔 `hastycapybara` + PAT, Open VSX 네임스페이스 + 토큰(Cursor는 Open VSX 사용), npm 조직 `hastycapybara` + 토큰 → GitHub Secrets `VSCE_PAT`·`OVSX_PAT`·`NPM_TOKEN`.
- 저장소 공개 전환(Settings › Danger Zone 또는 `gh repo edit --visibility public --accept-visibility-change-consequences`). 공개되면 커밋 작성자 이메일(lwy502@gmail.com)이 보인다(이력을 다시 쓰지 않는 한 되돌릴 수 없음).
- 설치 파일로 수동 테스트 한 바퀴(Cursor), 가능하면 칸반·캘린더 실제 화면 스크린샷.
- 태그 `v1.0.0` 푸시 → 자동 게시.

**알려 둘 영향.** 사내에서 `.vsix`로 1.13.0을 쓰던 사용자는 1.0.0이 더 낮은 번호라 업데이트 알림을 받지 못한다 → 마켓(자동 업데이트)으로 옮기거나 1.0.0을 직접 설치하도록 안내.

### 할 일
- [x] 아이콘 `media/icon.png` (완료: 2026-09-30)
- [x] 패키지 정보·제외 목록
- [x] README 영어 기본 + README.ko.md, 링크 정리, PNG 스크린샷
- [x] 버전 표기 1.0.0 기준 정리(API 문서·타입 주석), 버전 번호 1.0.0
- [x] CHANGELOG 1.0.0 + docs/history-internal.md
- [x] npm 타입 패키지 `packages/api`, 워크플로 npm 게시
- [x] 전체 검증, 설치 파일 확인, release.md 절차 갱신
- [x] 명령 이름: 영어 화면에는 영어만, 한국어 화면에는 한국어만(package.nls.json에서 한국어 제거, 테스트로 고정) — 사용자 결정 2026-09-30
- [x] 수동 점검 문서: Cursor는 `Cmd+K`가 AI 인라인 편집이라 `Cmd+K` 두 단계 단축키 대신 명령 팔레트 안내
- [x] `Cmd/Ctrl+Enter`가 Markdown All in One과 충돌(수동 점검에서 발견, 2026-10-01). 넘겨주기 방식(`tasksmd.enterKey`)도 Cursor에서 Markdown All in One에 밀려 실패 → 되돌리고 **완료 토글 기본 키를 `Ctrl+Shift+Enter`(macOS에서도 Ctrl, `Ctrl+Shift+C`·`R`과 같은 계열)로 변경**(사용자 결정 2026-10-01; 잠시 `Cmd+Alt+X`였음). macOS에서는 Cursor 기본 단축키·Markdown All in One·설치된 확장 어디에도 없음. Windows/Linux에서는 편집기 "위에 줄 삽입"과 겹치나 태스크 줄 위에서만 우선
- [x] 원격(Remote SSH, localhost) 수동 점검: 인덱싱·렌더 보기·칸반 정상. 바깥 수정 반영은 저장 안 된 편집기 때문에 재확인 필요

## M19. 칸반 격자 배치 (계획 확정 2026-10-01)

**문제(사용자, VS Code 점검 중).** 칸반은 240px 고정 폭 열을 가로 한 줄로 늘어놓아 열이 좁다. 4열이면 2행 2열로 보고 싶다.

**결정.** 창 폭에 맞춰 열을 **격자로 배치하고 행을 균형 있게** 나눈다.
- 한 행에 들어갈 수 있는 최대 열 수 = 창 폭 ÷ (최소 폭 280px + 간격). 행 수 = ⌈열 개수 ÷ 최대⌉, 한 행의 열 수 = ⌈열 개수 ÷ 행 수⌉.
- 예: 4열·보통 폭 → 2×2, 5열 → 3+2, 6열 → 3+3, 아주 넓은 창 → 한 줄. 열은 남는 폭을 나눠 가진다.
- 행은 보드 높이를 나눠 쓰고, 열 안에서 카드가 스크롤된다(보이는 카드만 그리는 최적화는 행 높이 기준으로).
- 폭 520px 미만(사이드바)의 탭 방식은 그대로.

### 할 일
- [x] 균형 격자 계산(순수 함수) + 칸반 보드 CSS grid, 행 높이 기준 윈도잉
- [x] 테스트(계산, 웹뷰), 스크린샷, 문서(user-guide)

## M20. 마켓 업로드 거절 대응 (2026-10-01)

**상황.** VS Code Marketplace 웹 업로드가 "Your extension has suspicious content. Please fix your extension metadata"로 거절됨. 어느 항목인지는 알려 주지 않는다.

**1차 가설(틀림).** 외부 프로그램 실행(OS 알림의 `osascript`/PowerShell)과 `.vsix` 업데이트 확인 코드를 의심해 제거(41814e7) → 같은 오류 → **되돌림**(e345098). 기능은 그대로 남아 있다.

**시험 업로드로 원인 좁히기**(시험용 이름으로 각각 업로드):

| 시험 | 내용 | 결과 |
|---|---|---|
| ① 전체 코드 + 최소 정보 | 짧은 소개·검색어 3개·짧은 README | 통과 → 코드 문제 아님 |
| ② 최소 확장(hello) | — | 통과 → 계정 문제 아님 |
| ③ 실제 문서(README·README.ko·CHANGELOG·NOTICE) | | 통과 |
| ④ 실제 소개문 + 검색어 13개 + 배너 | | 실패 |
| ⑤ 실제 소개문(Obsidian·VS Code·Cursor 포함) | | 통과 |
| ⑦ 소개문에서 Obsidian 뺀 것 | | 통과 |
| ⑥ 검색어 13개 + 배너 / ⑧ obsidian 2개 뺀 검색어 + 배너 | | 둘 다 실패 |
| ⑨ 배너만 | | 통과 |
| ⑫ 검색어 + `productivity`·`recurring`·`dataview`·`mcp` | | 통과 |
| ⑩ 검색어 8개 / ⑪ + `checklist`·`kanban`·`calendar`·`gtd` | | 둘 다 실패 |
| ⑬~⑯ 위 4단어를 하나씩 | | 넷 다 실패 |

**결론.** 원인은 **검색어(keywords)**. `checklist`·`kanban`·`calendar`·`gtd`(그리고 `obsidian`·`obsidian-tasks`는 미확인)가 들어가면 거절된다. 다른 확장 이름과 같은 단어를 검색어로 넣는 것을 끼워 넣기로 보는 규칙이거나, 짧은 시간에 비슷한 시험 확장을 많이 올려 생긴 판정일 수 있다.

**조치.** 검색어를 통과가 확인된 `markdown, tasks, todo, productivity, recurring, dataview, mcp`로 교체. 소개문·문서·배너는 그대로.

### 할 일
- [x] 원인 좁히기(시험 업로드 16개)
- [x] 검색어 교체, 재패키징
- [x] 실제 업로드 결과 확인(2026-10-02 통과)
- [ ] 시험 확장 모두 삭제(Remove) — 사용자

## M22. README 개편 — 강점 강조, 움직이는 예시, 사이트 연결 (계획 확정 2026-10-03)

**사용자 결정.** 1~4를 먼저 하고, 사용자가 확인한 뒤 1.0.1 게시 여부를 정한다.

1. **영어 README의 한국어 정리**: `(한국어: README.ko.md)` → 영어 표기로, `3일 후` 예시 → "English and Korean natural-language dates". README.md에 한글이 있으면 실패하는 테스트.
2. **강점 강조**: 맨 위 "Why" 세 칸 — Obsidian Tasks 문법 / **AI 에이전트(MCP)** / **공개 API로 확장 가능**. "Use it with AI" 섹션(Claude Code·Claude Desktop·Cursor·VS Code 설정, 예시 요청과 결과). "Extend it" 섹션(다른 확장이 만들 수 있는 것 예시, 코드, 이벤트·기능 확인·명령 표면, 타입 패키지, CLI·라이브러리). 배지(Marketplace·Open VSX·npm). 아직 안 되는 것(확장만 설치하면 AI 자동 연결 — M21)은 쓰지 않는다.
3. **움직이는 이미지(GIF)** ①~⑤ — 실제 VS Code를 `code serve-web`으로 브라우저에 띄우고 자동 조작해 프레임을 찍어 만든다(Cursor GUI는 띄우지 않음): ① 입력·자동완성·자연어 날짜 ② 완료 토글·반복 다음 회차 ③ **AI 에이전트(Claude Code를 실제 실행, MCP 연결)로 말로 시키기** ④ 렌더 보기 ⑤ 칸반·캘린더. `docs/images/`에 두고 README에서 링크(설치 파일에는 미포함).
4. **사이트 연결**: README 맨 위 Website(처음 계획은 언어별 주소 두 개, 10-03 사이트 변경으로 `https://hastycapybara.com/apps/tasksmd/` 하나 — 아래 7번), README.ko.md에 사이트 한국어 링크, `package.json` homepage → 영어 사이트. 사이트의 README 동기화는 사용자가 별도 모듈로 관리.

### 할 일
- [x] 1 한국어 정리 + 테스트 — `tests/readme.test.ts`(README.md 한글 금지, 로컬 이미지 존재, 사이트 링크)
- [x] 2 README 구성 개편(영·한) — Why 표, 움직이는 예시, Use it with AI(Claude Code·Cursor·VS Code·Claude Desktop 설정, 예시 요청), Extend it(만들 수 있는 것, 코드, 제공 방식 표), 배지. 기존 "API and automation" 절은 두 절로 흡수
- [x] 3 GIF ①~⑤ — `docs/images/demo-{editing,recurring,ai,rendered,kanban-calendar}.gif`(각 0.2~0.4MB, 960px). ③은 실제 `claude -p` 실행(MCP `--strict-mcp-config`), 파일 변경 확인
- [x] 4 사이트 링크(영·한), `package.json` homepage → 영어 사이트
- [x] 덤: api.md·api.en.md의 VS Code `mcp.json` 예시 키 수정(`servers`) — [incidents #22](postmortems/incidents.md)
- [ ] 사용자 확인 → 1.0.1 게시 결정

### 추가 요청 (2026-10-03, 사용자 확인 후)
5. **README.ko.md 제목**: "움직이는 예시" → "예시".
6. **링크 줄 단순화**: README.md `Website · Korean README`, README.ko.md `웹사이트 · English README`(언어별 사이트 링크 두 개 → 하나).
7. **사이트 주소 변경**: 언어 구분 없는 `https://hastycapybara.com/apps/tasksmd/` 하나로(README 영·한, `package.json` homepage, 테스트).
8. **한국어 GIF**: 같은 장면을 한국어 화면(VS Code 한국어 언어 팩 + 확장의 한국어 번역)과 한국어 예시 노트로 다시 찍어 README.ko.md에서 사용. AI 장면은 한국어 요청으로 Claude Code를 실제 실행. 파일 이름 `*-ko.gif`.
9. **대화상자 GIF 추가(영·한)**: `Ctrl+Shift+C`로 대화상자를 열어 새 태스크 만들기 → 기존 태스크에서 다시 열어 수정. README의 예시 절에 추가.

- [x] 5·6·7 README·homepage·테스트
- [x] 9 대화상자 GIF(영어) — `docs/images/demo-dialog.gif`: 빈 줄에서 새 태스크(우선순위·`next mon`·태그) → 기존 태스크 수정(최고·`in 2 weeks`·`every 2 weeks`)
- [x] 덤: 대화상자 태그 칸 안내 문구가 영어 화면에서도 한국어(`#업무 #프로젝트A`) → 번역 키로(영어 `#work #project-a`). 촬영 준비 중 발견, incidents #25
- [x] 8 한국어 GIF 6개(①~⑤ + 대화상자) — `docs/images/demo-*-ko.gif`, README.ko.md에서 사용. AI 장면은 한국어 요청으로 Claude Code 실제 실행(답도 한국어, 메모 `법무팀이 3조 승인` 추가 확인)
- [x] 덤: 웹뷰 첫 화면 일부가 한국어 설정에서도 영어(칸반 툴바 `Columns`·`Tasks`·`Filter…`, 아래 안내 줄 등) — 번역 묶음이 `state/init` 메시지로 늦게 오고 `t()`는 다시 그려지지 않아서. 한국어 GIF 준비 중 발견, incidents #26. **고칠 방법:** 웹뷰 HTML에 번역 묶음을 JSON 블록(`<script type="application/json" id="tfm-l10n">`, 실행 안 됨)으로 넣어 첫 렌더 전에 읽게 하고, `<html lang>`도 확장의 언어(`tasksmd.language`)를 따르게. 테스트: 웹뷰 `t()`가 문서의 JSON 블록에서 번역을 읽는지, 호스트 HTML에 묶음이 들어가는지(`</script>` 이스케이프 포함).

**GIF 만드는 법(다시 찍을 때).** `code serve-web --connection-token-file … --server-data-dir …`로 실제 VS Code를 브라우저에 띄우고, 설치 파일을 `server/extensions/`에 풀어 둔 뒤 puppeteer-core(헤드리스 Chrome, `--lang=en-US`)로 조작. 화면은 CDP `Page.startScreencast` 프레임을 PIL로 GIF로 묶음. 요령: 명령은 팔레트로(웹뷰에 초점이 있으면 단축키·팔레트가 안 먹을 수 있음 → 패널은 닫기 버튼 클릭), 웹뷰 안 클릭은 `frame.evaluate(el => el.click())`, 드래그는 같은 `DataTransfer`로 `dragstart/dragover/drop`을 웹뷰 안에서 보냄, 매 회 시작 전에 예시 노트·열 상태를 초기화.

**한국어 GIF.** 확장 화면은 `tasksmd.language: ko`로 모두 한국어, 예시 노트도 한국어(`work.ko.template.md`, 날짜를 하루 늦춰 영어판과 같은 상대 날짜). **VS Code 자체 메뉴는 영어로 둠:** 최신 한국어 언어 팩이 1.131용이라 브라우저 VS Code(1.140)에서 상태 표시줄 등 문자열이 엉뚱하게 나오고, 1.131로 고정한 서버(`--commit-id`)에서도 같은 현상. 영어 VS Code + 한국어 확장 화면은 실제로 많이 쓰는 조합이라 그대로 씀. 촬영 요령 추가: 팔레트 명령이 비슷한 다른 명령(예: 편집기 탭 숨기기)에 걸릴 수 있어 매 회 `View: Show Multiple Editor Tabs`로 탭을 되살림, 웹뷰 탭 제목은 언어에 따라 달라짐(`Tasks: 캘린더`).

**발견한 문제(코드 미수정, 사용자 확인 대기).** [#23](postmortems/incidents.md) 브라우저 VS Code에서 칸반·캘린더 편집 후 "Could not edit" 알림(파일은 바뀜), [#24](postmortems/incidents.md) 열 제목 `+` 칩 겹침.

## M21. 확장 안에서 AI 연결 제공 — 1.1.0 후보 (계획만, 2026-10-02)

**배경.** 지금 AI 에이전트 연결(MCP)은 npm 패키지 `@hastycapybara/tasks-cli`를 `npx`로 실행하는 방식이라, 사용자가 설정 파일을 직접 고치고 Node.js가 있어야 한다. 사용자 질문: "마켓에서 확장을 설치할 때 함께 되게 할 수 없나?" → npm 패키지를 같이 설치하게 할 수는 없지만, **확장 안에서 같은 효과**를 낼 수 있다. 1.0.0 공개(세 마켓 동일 버전)를 먼저 끝낸 뒤 1.1.0으로 진행하기로 결정(사용자, 2026-10-02).

**하려는 것.**
1. **VS Code: 확장이 MCP 서버를 직접 등록.** VS Code의 MCP 서버 제공 API(`vscode.lm.registerMcpServerDefinitionProvider` + `contributes.mcpServerDefinitionProviders`)로 확장을 설치하기만 하면 VS Code의 AI 에이전트(Copilot 에이전트 모드 등)가 우리 태스크 도구를 쓰게 한다. 서버는 확장에 함께 넣은 `tasksmd.cjs`를 **VS Code 자체의 Node 런타임**(`process.execPath` + `ELECTRON_RUN_AS_NODE=1`)으로 실행 → npm·Node.js 설치 불필요. 워크스페이스 폴더를 `--root`로.
2. **Cursor: 명령 하나로 등록.** `Tasks: Connect AI agents (MCP)` 같은 명령이 Cursor의 MCP 설정(`.cursor/mcp.json`, 프로젝트 또는 사용자 범위 선택)에 항목을 추가/제거. 기존 설정은 보존하고, 바꾸기 전에 무엇을 쓸지 보여 주고 확인받는다.
3. (선택) **`tasksmd` 터미널 명령 설치.** VS Code의 "Install 'code' command in PATH"처럼 명령 팔레트에서 등록/해제.

**확인할 것(개발 전).**
- MCP 제공 API가 필요한 최소 VS Code 버전 → `engines.vscode`를 올려야 하는지, 아니면 API가 있을 때만 쓰도록 할지.
- Cursor가 VS Code의 MCP 제공 API를 지원하는지(지원하면 2번이 필요 없을 수 있음). Cursor GUI는 자동으로 띄우지 않고 번들 코드 확인 → 사용자 확인 순서.
- 설치 파일에 CLI 번들을 넣으면 크기·마켓 검사(외부 프로그램 실행으로 오해받지 않는지) — 업로드 전에 시험 이름으로 확인할지 결정. 12시간 생성 한도 주의.
- 신뢰되지 않은 워크스페이스, 쓰기 정책(`tasksmd.api.writePolicy`)과의 관계(AI가 파일을 쓰는 경로이므로).

### 할 일 (착수 시 확정)
- [ ] 위 "확인할 것" 조사 → 설계(design.md) → 계획 확정
- [ ] VS Code MCP 등록, Cursor 설정 등록 명령, (선택) 터미널 명령
- [ ] 테스트, 문서(README·api.md·user-guide), 1.1.0 게시(Marketplace Update + 태그)

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
