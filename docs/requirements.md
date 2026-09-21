# Tasks-like Plugin for VS Code / Cursor — 요구사항 문서

- 문서 버전: 0.4
- 작성일: 2026-09-21 (0.3 갱신: 2026-09-21)
- 상태: **모든 결정 확정** — 구현 단계(M0) 진행.
- 참고 원본: [Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks) v8.4.0 (MIT), 공식 문서 https://publish.obsidian.md/tasks/

---

## 0. 확정 결정 요약

| 항목 | 결정 |
|---|---|
| 확장 이름 / ID | **Tasks for Markdown** / `HMCVECDT.tasks-for-markdown` |
| 언어·UI·도구 | TypeScript, Svelte(웹뷰), esbuild, pnpm, Vitest |
| 원본 코드 | Obsidian Tasks 순수 로직(파서·반복·쿼리·긴급도) MIT 이식 + 저작권 고지 |
| 스캔 범위 | 워크스페이스 전체 `.md`/`.markdown`, `.gitignore`·`files.exclude` 존중 |
| 글로벌 필터 | 지원, 기본 비활성 |
| 포맷 | 이모지 기본, Dataview 읽기·쓰기 모두 v1 |
| 상태 프리셋 | 기본 4종 + Minimal, ITS, Things |
| 쿼리 JS 함수 | v1 포함, opt-in + Workspace Trust |
| 반복 태스크 | 원본 위에 삽입, 🆔 유지, ⛔ 복사 (모두 설정 가능) |
| 저장된 쿼리 | settings.json + 워크스페이스 파일 둘 다 |
| 미리보기 | VS Code 기본 미리보기에 플러그인 주입 |
| 칸반 | 사이드바 WebviewView + 에디터 패널 둘 다 |
| 키 | 토글 `Cmd/Ctrl+Enter`, 편집 모달 `Cmd/Ctrl+Shift+T`, 빠른 검색 `Cmd/Ctrl+Shift+;` |
| 추가 기능(v1) | 알림(토스트+OS), 수동 아카이브 명령, 주 단위 통계, 캘린더(월간+주간) |
| AI 연동(MCP) | **v1.x로 연기** |
| 언어·날짜 | UI 영어+한국어, 상대 날짜("3일 남음"), 주 시작 월요일 |
| 배포 | **VS Code Marketplace + Open VSX(Cursor)** 를 기본으로 하고, 동일 빌드의 `.vsix`를 사내 공유 경로에도 배포 |
| 성능 목표 | 5,000 파일 / 50,000 태스크 |
| Obsidian 병행 | **없음** — 이 확장 전용 폴더 사용. 문법 호환은 원칙으로 유지하되 Obsidian 실사용 검증은 범위 밖 |

---

## 1. 개요

### 1.1 목적

Obsidian Tasks 플러그인이 제공하는 "마크다운 파일 안의 체크리스트를 태스크로 다루는" 경험을 VS Code 및 VS Code 포크(Cursor 등)에서 재현하는 확장(Extension)을 만든다.

### 1.2 핵심 원칙ㅊ

1. **파일이 곧 데이터베이스.** 별도 저장소 없이 워크스페이스 안의 `.md` 파일에 있는 `- [ ]` 줄만을 진실의 원천(source of truth)으로 삼는다. 확장이 하는 모든 조작은 결국 그 줄의 텍스트를 수정하는 것이다.
2. **Obsidian Tasks 문법과 호환.** 이모지 포맷 / Dataview 포맷을 모두 읽고, 쓰기 포맷은 설정으로 선택한다. Obsidian과 같은 폴더를 병행 사용하지는 않지만(전용 폴더), 문법을 그대로 따라 사용자 지식과 기존 노트를 재활용할 수 있게 한다.
3. **네이티브 에디터를 유지.** 텍스트 에디터를 교체하지 않는다. Live Preview 대신 "에디터 보조 UI + 인터랙티브 미리보기 + 사이드바 대시보드"의 하이브리드로 같은 경험을 만든다.
4. **Cursor 호환.** VS Code 표준 API만 사용하고 Open VSX에도 배포한다.

### 1.3 범위

| 포함 | 제외 (나중 선택지 / 범위 밖) |
|---|---|
| 태스크 파싱·인덱싱 (워크스페이스 전체) | Custom Editor(WYSIWYG) 기반 에디터 교체 |
| 에디터 보조 UI: Decoration, CodeLens, Hover, 자동완성, QuickPick | 클라우드 동기화, 계정 |
| 마크다운 미리보기 연동 (체크박스 클릭, `tasks` 블록 렌더링) | AI 연동(MCP 서버) — **v1.x** |
| 사이드바 대시보드 (트리 뷰 + 저장된 쿼리 + 칸반/컬럼 뷰) | 모바일 |
| 쿼리 엔진 (필터/정렬/그룹/제한/레이아웃/explain) | |
| 태스크 생성·편집 모달 (Webview 폼) | |
| 상태(Status) 시스템, 반복(Recurrence), 의존성, 완료 시 동작 | |
| 알림/리마인더, 아카이브 명령, 주간 통계, 캘린더 뷰 (12장) | |
| 설정, 명령어, 키바인딩, i18n, Marketplace/Open VSX 배포 + `.vsix` 배포·업데이트 확인 | |

---

## 2. 용어

| 용어 | 정의 |
|---|---|
| 태스크(Task) | `- [ ]`, `* [x]`, `+ [/]`, `1. [ ]` 등 목록 마커 + 체크박스로 시작하는 마크다운 한 줄 |
| 상태(Status) | 대괄호 안의 한 글자(심볼) + 그에 매핑된 타입/이름/다음 심볼 |
| 상태 타입 | `TODO`, `IN_PROGRESS`, `ON_HOLD`, `DONE`, `CANCELLED`, `NON_TASK` |
| 필드 | 태스크 줄 뒤에 붙는 메타데이터 (날짜, 우선순위, 반복, ID 등) |
| 쿼리 | `tasks` 코드블록 또는 사이드바에서 정의하는 필터/정렬/그룹 명령 집합 |
| 인덱스 | 워크스페이스 전체 태스크를 메모리에 유지하는 캐시 |
| 글로벌 필터 | 특정 태그/문자열(예: `#task`)이 있는 줄만 태스크로 취급하는 옵션 |

---

## 3. 태스크 모델 및 문법 (FR-1)

### 3.1 인식 규칙

- FR-1.1 목록 마커 `-`, `*`, `+`, `숫자.`, `숫자)` 뒤에 `[x]` 형태(대괄호 안 정확히 1글자)가 오면 태스크로 인식한다.
- FR-1.2 들여쓰기된 하위 항목도 태스크로 인식하며, 부모-자식 관계(depth)를 기록한다.
- FR-1.3 코드블록(```` ``` ````), 프론트매터, HTML 주석 안의 줄은 무시한다.
- FR-1.4 글로벌 필터가 설정되면 해당 문자열이 포함된 줄만 태스크로 취급한다(설정에서 켜고 끔).
- FR-1.5 태스크가 속한 파일 경로, 폴더, 파일명, 가장 가까운 상위 헤딩, 줄 번호, 프론트매터 태그를 함께 기록한다.

### 3.2 필드 (이모지 포맷 — 기본)

| 필드 | 이모지 | 값 | 비고 |
|---|---|---|---|
| 생성일 | ➕ | `YYYY-MM-DD` | 설정 시 생성할 때 자동 부여 |
| 시작일 | 🛫 | `YYYY-MM-DD` | |
| 예정일 | ⏳ (⌛ 도 허용) | `YYYY-MM-DD` | |
| 마감일 | 📅 | `YYYY-MM-DD` | |
| 완료일 | ✅ | `YYYY-MM-DD` | DONE 타입 전환 시 자동 부여/제거 |
| 취소일 | ❌ | `YYYY-MM-DD` | CANCELLED 타입 전환 시 자동 부여/제거 |
| 우선순위 | 🔺 ⏫ 🔼 (없음) 🔽 ⏬ | highest / high / medium / normal / low / lowest | |
| 반복 | 🔁 | `every ...` 규칙, 선택적으로 `when done` | 3.4 참고 |
| ID | 🆔 | 영숫자 6자 (자동 생성) | |
| 의존성 | ⛔ | ID를 쉼표로 나열 | |
| 완료 시 동작 | 🏁 | `keep` / `delete` | |
| 태그 | `#tag` | 설명 안 어디든 | 중첩 태그 `#a/b` 지원 |

- FR-1.6 필드는 설명(description) **뒤**에 임의 순서로 올 수 있다. 쓸 때는 Obsidian Tasks와 동일한 고정 순서(🆔 → ⛔ → 우선순위 → 🔁 → 🏁 → ➕ → 🛫 → ⏳ → 📅 → ❌ → ✅)로 정규화해, 두 도구가 쓴 줄이 바이트 단위로 같도록 한다. (0.4: 순서를 Obsidian 실제 구현에 맞춰 수정)
- FR-1.7 설명 안의 마크다운(링크, 굵게, 인라인 코드 등)은 보존한다. 블록 참조 `^abc123`은 필드 뒤에 남겨둔다.

### 3.3 Dataview 포맷 (읽기 필수, 쓰기 선택)

`[key:: value]` 또는 `(key:: value)` 인라인 필드: `created`, `start`, `scheduled`, `due`, `completion`, `cancelled`, `priority`, `repeat`, `onCompletion`, `id`, `dependsOn`.

- FR-1.8 두 포맷을 모두 파싱한다. 한 줄에 섞여 있어도 읽는다.
- FR-1.9 쓰기 포맷은 설정(`taskFormat: emoji | dataview`)으로 정한다. 쓸 때는 항상 `[]`를 사용한다.

### 3.4 반복(Recurrence)

- FR-1.10 규칙 문법: `every day`, `every 3 days`, `every weekday`, `every week on Monday, Friday`, `every 2 weeks`, `every month on the 15th`, `every month on the last`, `every month on the last Friday`, `every year`, `every January on the 4th` 등 (rrule 기반, Obsidian Tasks와 동일 파서).
- FR-1.11 반복 태스크가 DONE 타입이 되면 새 인스턴스를 생성한다. 기준 날짜는 마감일 → 예정일 → 시작일 순으로 고르며, 나머지 날짜는 상대 간격을 유지해 이동한다.
- FR-1.12 `when done` 이 있으면 원래 날짜가 아닌 완료한 날짜를 기준으로 다음 회차를 계산한다.
- FR-1.13 새 인스턴스는 원본 줄 **위**(기본) 또는 아래(설정)에 삽입되며 상태는 `[ ]`로, ✅/❌ 는 제거되고, ➕ 는 (설정 시) 오늘로 갱신된다. 🆔는 **원본 값을 유지**하고 ⛔도 **복사**한다(설정 `recurrence.idHandling: keep | new | remove`, `recurrence.copyDependsOn`). 완료된 태스크는 blocking 판정에서 제외되므로 ID 중복은 무해하다.
- FR-1.14 날짜가 하나도 없는 태스크에 반복 규칙을 붙이면 경고한다.

### 3.5 상태(Status)

- FR-1.15 기본 상태 세트: `[ ]` Todo(TODO → `x`), `[x]` Done(DONE → ` `), `[/]` In Progress(IN_PROGRESS → `x`), `[-]` Cancelled(CANCELLED → ` `).
- FR-1.16 사용자가 설정에서 상태를 추가/수정/삭제할 수 있다: 심볼, 이름, 다음 심볼, 타입.
- FR-1.17 유명 테마(Minimal, ITS, Things 등) 상태 세트를 한 번에 불러오는 프리셋을 제공한다.
- FR-1.18 "토글"은 현재 심볼 → 다음 심볼로 순환한다. 타입이 DONE으로 바뀔 때 완료일 부여 + 반복 처리, DONE에서 벗어날 때 완료일 제거. CANCELLED도 동일하게 취소일 처리.
- FR-1.19 `NON_TASK` 타입 심볼(예: 체크박스를 아이콘처럼 쓰는 경우)은 쿼리 대상에서 기본 제외한다.

### 3.6 의존성

- FR-1.20 `⛔`에 나열된 ID의 태스크 중 하나라도 DONE/CANCELLED가 아니면 "blocked"로 표시한다.
- FR-1.21 어떤 태스크의 ⛔에 자신의 ID가 있으면 "blocking"이다.
- FR-1.22 순환 의존성은 감지하고 경고한다.

### 3.7 긴급도(Urgency)

- FR-1.23 Obsidian Tasks와 동일한 공식으로 마감일·예정일·시작일·우선순위를 합산한 점수를 계산하며, 정렬/표시에 쓴다.

---

## 4. 인덱스 (FR-2)

- FR-2.1 활성화 시 워크스페이스(멀티 루트 포함)의 `**/*.{md,markdown}`를 스캔해 인덱스를 만든다. 포함/제외 glob은 설정 가능하며 `files.exclude`, `.gitignore`를 기본 존중한다.
- FR-2.2 `FileSystemWatcher`와 `onDidChangeTextDocument`로 변경을 실시간 반영한다. 열려 있는 문서는 디스크가 아닌 편집 중인 내용을 우선한다.
- FR-2.3 인덱스는 파일 단위로 증분 갱신한다. 5,000개 파일 / 50,000개 태스크 규모에서 초기 스캔 5초 이내, 단일 파일 갱신 50ms 이내를 목표로 한다.
- FR-2.4 인덱스 변경 이벤트를 발행해 에디터 장식, 사이드바, 미리보기가 구독한다.
- FR-2.5 설정한 상한(예: 1MB)을 넘는 파일은 건너뛰고 상태바에 알린다.
- FR-2.6 상태바에 "미완료 N / 오늘 마감 M" 형태의 요약을 표시하며 클릭 시 사이드바를 연다.

---

## 5. 에디터 보조 UI (FR-3)

텍스트 에디터를 그대로 쓰면서 문법을 몰라도 편집할 수 있게 한다.

### 5.1 Decoration

- FR-3.1 태스크 줄 끝에 가상 텍스트를 표시한다: `📅 3일 남음`, `⚠ 2일 지남`, `🔁 매주 월`, `⛔ 대기 중(2)`. 표시 항목은 설정으로 켜고 끈다.
- FR-3.2 기한 초과(마감일 < 오늘, 미완료)는 줄 배경/텍스트 색으로 강조한다. 오늘 마감도 별도 색.
- FR-3.3 DONE/CANCELLED 태스크는 취소선 또는 흐리게(설정).
- FR-3.4 거터에 상태 아이콘을 표시한다(설정으로 끔).
- FR-3.5 필드 부분(이모지+값)은 설명보다 옅은 색으로 렌더링해 "설명"과 "메타데이터"가 시각적으로 구분되게 한다. 텍스트 숨김(`display:none` 해킹)은 **사용하지 않는다** — 커서 이동이 깨지기 때문.
- FR-3.6 장식은 보이는 범위(visibleRanges) 기준으로 계산하며 입력 후 100ms 디바운스한다.

### 5.2 CodeLens

- FR-3.7 태스크 줄 위에 액션 렌즈를 표시한다: `✔ 완료` · `우선순위: 높음 ▾` · `📅 9/25 ▾` · `🔁 매주 ▾` · `✎ 편집`. 각 항목 클릭 시 QuickPick 또는 편집 모달이 열린다.
- FR-3.8 렌즈는 커서가 있는 줄에만 / 모든 태스크 줄에 / 끄기 중 선택(설정). 기본값은 "커서가 있는 줄에만"(세로 공간 절약).

### 5.3 Hover

- FR-3.9 태스크 줄에 마우스를 올리면 카드를 표시한다: 상태, 우선순위, 모든 날짜(상대 표현 포함), 반복, 의존 관계(링크 클릭 시 해당 태스크로 이동), 긴급도 점수.
- FR-3.10 카드 안에 `command:` 링크로 완료/편집/우선순위 변경 액션을 제공한다.

### 5.4 자동완성 (Auto-suggest)

- FR-3.11 커서가 태스크 줄에 있을 때만 활성화된다.
- FR-3.12 빈 입력 또는 키워드 부분 입력 시 제안: `due ⟶ 📅`, `scheduled ⟶ ⏳`, `start ⟶ 🛫`, `priority high ⟶ ⏫`, `every week ⟶ 🔁 every week`, `id ⟶ 🆔 (자동 생성)`, `depends on`, `on completion`, `created today ⟶ ➕ 2026-09-21`.
- FR-3.13 날짜 이모지 뒤에서는 `today`, `tomorrow`, `next monday`, `in 3 days`, `next week`… 상대 날짜를 제안하고 선택 시 절대 날짜로 치환한다(chrono 계열 자연어 파서).
- FR-3.14 최소 매치 길이(0–3), 최대 제안 수(3–20) 설정.
- FR-3.15 Dataview 포맷 설정 시 `[due:: ]` 형태로 삽입한다.

### 5.5 QuickPick 기반 빠른 편집

- FR-3.16 명령/CodeLens/키바인딩으로 호출되는 단일 목적 피커: 상태 변경, 우선순위, 마감/예정/시작일(자연어 입력란 + 캘린더식 후보), 반복 규칙 프리셋, 의존성 검색(설명 텍스트로 검색).

### 5.6 진단(Diagnostics)

- FR-3.17 잘못된 날짜(`📅 2026-13-40`), 파싱 불가 반복 규칙, 존재하지 않는 ID 참조, 순환 의존성, 날짜 없는 반복 태스크를 Problems 패널에 경고로 표시한다. Quick Fix 제공(가능한 경우).

---

## 6. 마크다운 미리보기 연동 (FR-4)

VS Code 기본 Markdown 미리보기(웹뷰)에 `markdown-it` 플러그인과 스크립트를 주입한다. Obsidian의 "읽기 모드"에 해당한다.

- FR-4.1 미리보기의 체크박스를 클릭 가능하게 만들고, 클릭 시 확장에 메시지를 보내 원본 줄을 토글(FR-1.18과 동일 로직)한다. 미리보기는 자동 갱신된다.
- FR-4.2 태스크 줄을 렌더링할 때 필드를 뱃지(칩) 형태로 표시한다(우선순위 색, 날짜 상대 표현, 반복, 태그). 원본 이모지 대신 사람이 읽기 좋은 표기로 바꾸되 설정으로 원본 표시도 가능.
- FR-4.3 각 태스크 옆에 ✎ 아이콘 → 편집 모달(FR-6).
- FR-4.4 ` ```tasks ` 코드블록을 쿼리 결과 목록으로 렌더링한다(FR-7). 결과의 각 항목은 체크박스 토글, 편집, 원본 파일로 이동(클릭 시 해당 줄 열기)을 지원한다.
- FR-4.5 그룹 헤딩, 태스크 수, `explain` 출력을 렌더링한다.
- FR-4.6 기한 초과/오늘 마감 색상은 에디터 장식과 동일한 테마 색 토큰을 쓴다. 라이트/다크/하이 컨트라스트 테마를 따른다.
- FR-4.7 서드파티 미리보기 확장(Markdown Preview Enhanced 등)과의 호환은 보장하지 않는다. 기본 미리보기만 지원.

---

## 7. 사이드바 대시보드 (FR-5)

액티비티 바에 전용 아이콘을 두고 아래 뷰들을 제공한다.

### 5-A. 태스크 트리 뷰 (네이티브 TreeView)

- FR-5.1 기본 제공 스마트 뷰: **오늘**(마감·예정·시작이 오늘 이하 + 기한 초과), **예정**(7일), **기한 초과**, **미완료 전체**, **완료(최근 30일)**, **차단됨**, **진행 중**.
- FR-5.2 그룹 기준 전환: 파일별 / 마감일별 / 우선순위별 / 태그별 / 헤딩별 / 상태별.
- FR-5.3 각 항목은 네이티브 체크박스(`TreeItemCheckboxState`)로 토글 가능하며, 클릭 시 해당 파일·줄로 이동, 컨텍스트 메뉴(완료, 취소, 우선순위, 날짜, 편집, 삭제)를 제공한다.
- FR-5.4 필터 입력창(뷰 타이틀 액션)으로 설명 텍스트 실시간 검색.

### 5-B. 저장된 쿼리 뷰

- FR-5.5 사용자가 쿼리 텍스트(FR-7 문법)를 이름과 함께 저장하고, 각 쿼리가 트리 노드로 표시된다. 저장 위치는 두 가지를 모두 지원한다: (1) `tasks.savedQueries` 설정(사용자/워크스페이스), (2) 워크스페이스의 `.tasks/queries/*.md` 파일(파일 하나 = 쿼리 하나, 첫 ` ```tasks ` 블록을 사용, Git 공유 가능). 트리에서는 출처를 아이콘으로 구분한다.
- FR-5.6 쿼리 편집기: 텍스트 편집 + "쿼리 빌더"(필터 종류를 드롭다운으로 조립 → 텍스트 생성) 둘 다 제공.
- FR-5.7 `explain` 결과 미리보기, 오류 시 줄 번호와 함께 표시.

### 5-C. 칸반/컬럼 뷰 (사이드바 WebviewView + 에디터 영역 Webview 패널, 동일 컴포넌트)

- FR-5.8 컬럼 기준 선택: 상태 / 마감일 버킷(지남·오늘·이번주·다음주·이후·없음) / 우선순위 / 파일.
- FR-5.9 카드 드래그앤드롭으로 컬럼 이동 시 해당 필드를 수정한다(예: "오늘" 컬럼으로 옮기면 📅 오늘로 변경, "Done" 컬럼으로 옮기면 DONE 토글).
- FR-5.10 카드 클릭 → 편집 모달, 더블클릭 → 원본으로 이동.
- FR-5.11 컬럼 뷰의 데이터 소스는 임의의 저장된 쿼리로 지정 가능.

### 5-D. 빠른 검색 (Quick Search)

- FR-5.12 명령 팔레트 스타일 QuickPick으로 워크스페이스 전체 미완료 태스크를 퍼지 검색하고 선택 시 이동/완료/편집한다.

---

## 8. 태스크 생성·편집 모달 (FR-6)

Webview 패널(또는 뷰) 기반 폼. Obsidian의 "Create or edit task" 모달과 동일한 항목.

- FR-6.1 필드: 설명(멀티라인 가능, 글로벌 필터 자동 추가), 우선순위(라디오), 반복(텍스트 + 프리셋 + 유효성 실시간 표시), 마감/예정/시작일(자연어 입력 → 해석 결과 표시, 날짜 피커 병행), 생성/완료/취소일(접힘, 편집 가능), 상태(드롭다운), 의존성(설명 검색 → 다중 선택, "이 태스크가 막는 것"/"이 태스크를 막는 것" 양쪽), 완료 시 동작.
- FR-6.2 열기: 커서가 태스크 줄에 있으면 편집, 아니면 커서 위치에 새 태스크 생성. 미리보기·사이드바에서도 열 수 있다.
- FR-6.3 적용(Enter / 버튼) 시 원본 줄을 정규화된 포맷으로 치환. Esc로 취소.
- FR-6.4 각 필드에 액세스 키(Alt+글자) 제공, 설정으로 끌 수 있음. 사용하지 않는 필드는 숨길 수 있음.
- FR-6.5 미리보기 영역에 최종 마크다운 줄을 실시간 표시.

---

## 9. 쿼리 엔진 (FR-7)

Obsidian Tasks 쿼리 문법과 호환되는 텍스트 기반 엔진. 한 줄 = 한 명령, 줄 사이는 AND.

### 9.1 필터

- FR-7.1 상태: `done`, `not done`, `status.type is|is not TODO|IN_PROGRESS|ON_HOLD|DONE|CANCELLED|NON_TASK`, `status.name includes|does not include`, `status.symbol …`.
- FR-7.2 날짜(due / scheduled / start / done / created / cancelled / happens): `on|before|after|on or before|on or after <date>`, `in|before|after|in or before|in or after <range>`, `has|no <field> date`, `<field> date is invalid`. 날짜: `YYYY-MM-DD`, `today`, `tomorrow`, `yesterday`, `next monday`, `last friday`, `in 3 days`; 범위: `this|last|next week|month|quarter|year`, `YYYY-Www`, `YYYY-MM`, `YYYY-Qn`, `YYYY`, `<date> <date>`.
- FR-7.3 우선순위: `priority is|is above|is below|is not lowest|low|none|medium|high|highest`.
- FR-7.4 반복: `is recurring`, `is not recurring`, `recurrence includes|does not include`.
- FR-7.5 의존성: `is blocked`, `is not blocked`, `is blocking`, `is not blocking`, `has id`, `no id`, `has depends on`, `no depends on`, `id includes …`.
- FR-7.6 텍스트: `description includes|does not include`, `description regex matches|does not match /…/i`, `tags include|do not include`, `tag regex …`, `has tags`, `no tags`, `heading includes …`, `path|folder|filename|root includes …` 및 각각의 regex 변형.
- FR-7.7 구조: `exclude sub-items`, `has|no scheduled date` 등, `filter by function <js>` (설정 `query.allowFunctions` + Workspace Trust 필요).
- FR-7.8 불리언: `AND`, `OR`, `NOT`, `AND NOT`, `OR NOT`, `XOR`, 괄호. 각 피연산자는 `( … )`로 감싼 완전한 필터.
- FR-7.9 플레이스홀더: `{{query.file.path}}`, `{{query.file.folder}}`, `{{query.file.filename}}` 등 쿼리가 놓인 파일 정보로 치환.

### 9.2 정렬 / 그룹 / 제한 / 레이아웃

- FR-7.10 `sort by <field> [reverse]` — status.type, status.name, urgency, due, scheduled, start, done, created, cancelled, happens, priority, description, tags, path, folder, filename, heading, line, id, recurring, random, function. 기본 정렬: status.type → urgency → due → priority → path.
- FR-7.11 `group by <field> [reverse]` — 위와 유사 + `backlink`, `root`. 다단계 그룹은 중첩 헤딩으로 렌더링. `group by function`(동일 조건).
- FR-7.12 `limit N`, `limit groups N`.
- FR-7.13 레이아웃: `hide|show` + `priority|due date|scheduled date|start date|created date|done date|cancelled date|recurrence rule|on completion|id|depends on|tags|backlink|edit button|postpone button|urgency|task count|tree`, `short mode`, `full mode`, `explain`, `hide nested backlink`.
- FR-7.14 주석: `#`로 시작하는 줄 무시. 줄 연속: 줄 끝 `\`.
- FR-7.15 파싱 오류는 명령 줄 번호와 이유를 함께 결과 영역에 표시한다.

### 9.3 실행

- FR-7.16 쿼리는 인덱스 위에서 동기 실행되며 50,000 태스크에서 100ms 이내를 목표.
- FR-7.17 인덱스 변경 시 열린 쿼리 결과(미리보기, 사이드바)는 자동 재실행(디바운스 200ms).

---

## 10. 명령어·키바인딩 (FR-8)

| 명령 ID | 기본 키 | 동작 |
|---|---|---|
| `tasks.toggleDone` | `Ctrl/Cmd+Enter` (마크다운 파일에서, 태스크 줄일 때) | 상태 순환(FR-1.18) |
| `tasks.setStatus` | — | 상태 선택 QuickPick |
| `tasks.createOrEdit` | `Ctrl/Cmd+Shift+T` | 편집 모달 |
| `tasks.setPriority` / `setDueDate` / `setScheduledDate` / `setStartDate` / `setRecurrence` / `setDependencies` | — | 개별 QuickPick |
| `tasks.postpone` | — | 마감/예정일을 N일 미룸(내일/다음주/… 선택) |
| `tasks.quickSearch` | `Ctrl/Cmd+Shift+;` | 빠른 검색 |
| `tasks.archiveCompleted` | — | 완료 태스크 아카이브 (12.2) |
| `tasks.openStats` / `openCalendar` | — | 통계 / 캘린더 패널 |
| `tasks.checkForUpdates` | — | 사내 배포 경로에서 새 버전 확인 (12.5) |
| `tasks.openSidebar` / `openKanban` | — | 뷰 열기 |
| `tasks.reindex` | — | 강제 재스캔 |
| `tasks.insertQueryBlock` | — | ` ```tasks ` 스니펫 삽입 |
| `tasks.explainQuery` | — | 커서 위치 쿼리 설명 |

- FR-8.1 모든 명령은 명령 팔레트에 "Tasks: …" 접두사로 노출된다.
- FR-8.2 에디터 컨텍스트 메뉴에 태스크 줄일 때만 하위 메뉴 "Tasks"를 노출한다.

---

## 11. 설정 (FR-9)

`tasks.*` 네임스페이스, 워크스페이스/사용자 단위 모두 지원.

| 키 | 기본값 | 설명 |
|---|---|---|
| `taskFormat` | `emoji` | 쓰기 포맷 (`emoji` / `dataview`) |
| `globalFilter` | `""` | 글로벌 필터 문자열 |
| `globalFilter.removeFromDescription` | `true` | 표시 시 글로벌 필터 숨김 |
| `include` / `exclude` | `**/*.md` / `node_modules/**` 등 | 스캔 범위 |
| `respectGitignore` | `true` | |
| `maxFileSizeKB` | `1024` | |
| `setCreatedDate` | `false` | 생성 시 ➕ 자동 |
| `setDoneDate` | `true` | |
| `setCancelledDate` | `true` | |
| `recurrence.insertPosition` | `above` | `above` / `below` |
| `recurrence.removeScheduledOnRecur` | `false` | |
| `statuses` | 기본 4종 | 커스텀 상태 배열 |
| `decorations.*` | 각종 on/off | 5.1 |
| `codeLens.mode` | `cursorLine` | `off` / `cursorLine` / `all` |
| `autoSuggest.enabled` / `minMatch` / `maxItems` | `true` / `0` / `6` | |
| `preview.enabled` / `preview.renderBadges` | `true` / `true` | 6장 |
| `query.allowFunctions` | `false` | `filter/sort/group by function` 허용 (opt-in) |
| `savedQueries` | `[]` | 저장된 쿼리 (`.tasks/queries/*.md`와 병행) |
| `recurrence.idHandling` / `copyDependsOn` | `keep` / `true` | 3.4 |
| `notifications.*` | 12.1 참고 | 토스트/OS 알림 |
| `archive.file` / `archive.afterDays` | `Archive.md` / `30` | 12.2 |
| `updateCheckUrl` | `""` | 12.5 (비어 있으면 확인 안 함) |
| `dateLocale` / `weekStart` | 시스템 / `monday` | 상대 날짜 표기·주 계산 |
| `language` | `auto` | UI 언어 |

---

## 11-2. 추가 기능 (FR-10) — 알림 · 아카이브 · 통계 · 캘린더 · 업데이트 확인

### 11-2.1 알림 / 리마인더

- FR-10.1 확장 시작 시와 매일 지정 시각(기본 09:00, 설정)에 "오늘 마감 N개 / 기한 초과 M개" 요약 알림을 띄운다.
- FR-10.2 채널: (1) VS Code 토스트 알림(항상, 버튼: "오늘 보기" → 사이드바), (2) OS 네이티브 알림 — macOS `osascript`, Windows PowerShell 토스트, Linux `notify-send`. OS 알림은 설정으로 끌 수 있고 실행 실패 시 조용히 토스트로 대체한다.
- FR-10.3 마감 임박 알림: 마감일이 D-N(기본 1일) 이내인 미완료 태스크를 하루 1회 묶어서 알린다. 태스크별 "알림 끄기"(스누즈: 내일/다음주)를 지원하며 스누즈 상태는 `globalState`에 저장한다(파일은 건드리지 않음).
- FR-10.4 설정: `notifications.enabled`, `notifications.os`, `notifications.dailyTime`, `notifications.dueWithinDays`.

### 11-2.2 완료 태스크 아카이브

- FR-10.5 명령 `Tasks: Archive completed tasks` — 완료(DONE/CANCELLED)된 지 N일(기본 30, 0이면 전부) 넘은 태스크를 원본에서 제거하고 아카이브 파일(기본 워크스페이스 루트 `Archive.md`, 설정)에 추가한다.
- FR-10.6 아카이브 파일에는 `## YYYY-MM-DD` 헤딩 아래 원본 파일 링크(`[[파일#헤딩]]` 또는 상대 링크, 설정)와 함께 원문 줄을 그대로 보존한다.
- FR-10.7 실행 전 대상 목록을 QuickPick으로 보여 주고 선택 해제 가능. 반복 태스크의 완료 인스턴스도 대상. 하위 항목은 부모와 함께 이동.
- FR-10.8 자동 실행은 하지 않는다(수동 명령만).

### 11-2.3 주간 통계

- FR-10.9 Webview 패널 "Tasks: Statistics" — 주 단위(월요일 시작) 집계: 완료 수, 신규 생성 수(➕ 기준, 없으면 제외), 기한 초과 수, 주말 시점 미완료 잔량, 최근 12주 추이(막대/선). 태그·폴더 필터 가능.
- FR-10.10 데이터는 인덱스에서 계산하며 별도 저장 없음. ✅/➕ 날짜가 없는 태스크는 집계에서 제외하고 그 수를 표시한다.

### 11-2.4 캘린더 뷰

- FR-10.11 Webview 패널 "Tasks: Calendar" — **월간**과 **주간** 뷰 전환. 각 날짜 칸에 마감(📅)·예정(⏳)·시작(🛫) 태스크를 아이콘으로 구분해 표시(표시 필드는 토글).
- FR-10.12 태스크 클릭 → 편집 모달, 더블클릭 → 원본 이동. 드래그로 다른 날짜에 놓으면 해당 날짜 필드를 변경한다(칸반과 동일 규칙).
- FR-10.13 빈 날짜 칸 더블클릭 → 마감일이 채워진 새 태스크 생성(대상 파일은 설정 `calendar.newTaskFile`, 기본은 현재 활성 문서).
- FR-10.14 데이터 소스는 임의의 저장된 쿼리로 제한 가능.

### 11-2.5 `.vsix` 배포 및 업데이트 확인 (Marketplace 보조 경로)

- FR-10.15 `tasks.updateCheckUrl`(파일 경로 또는 HTTP URL)에 `latest.json`(`{ "version": "1.2.0", "vsix": "<경로/URL>", "notes": "..." }`)을 두면 확장 시작 시(하루 1회) 버전을 비교해 새 버전이 있으면 토스트로 알리고 `.vsix` 경로를 연다/복사한다. 설정이 비어 있으면 아무것도 하지 않는다.
- FR-10.16 릴리스 산출물: `tasks-for-markdown-<version>.vsix` + `latest.json` + `CHANGELOG.md`. 빌드 스크립트 `pnpm package`로 생성. Marketplace/Open VSX 게시는 `pnpm publish:vsce` / `pnpm publish:ovsx` (토큰은 환경변수). Marketplace로 설치된 경우 업데이트 확인 알림은 표시하지 않는다.

### 11-2.6 AI 연동 (v1.x, 범위 밖 — 기록용)

- MCP 서버(stdio)로 인덱스 조회/토글/생성 도구를 노출해 Cursor·VS Code 에이전트가 태스크를 읽고 쓰게 한다. v1에서는 구현하지 않으며 `core/`를 VS Code 의존성 없이 유지해 이후 재사용 가능하게만 한다.

---

## 12. 비기능 요구사항 (NFR)

- NFR-1 **호환성**: VS Code ≥ 1.85, Cursor 최신 안정판, Windows/macOS/Linux. Remote/WSL/SSH/Codespaces에서 동작(웹뷰·파일 워처는 원격 확장 호스트에서 실행).
- NFR-2 **성능**: 4장·9장 수치. UI 스레드 차단 없음(대규모 스캔은 청크 단위 비동기).
- NFR-3 **안전성**: 파일 쓰기는 항상 `WorkspaceEdit`로 한 줄 단위 치환. 외부에서 파일이 바뀐 경우 stale 줄에 쓰지 않도록 줄 내용을 재검증하고 불일치 시 사용자에게 알린다. Undo/Redo가 정상 동작해야 한다.
- NFR-4 **보안**: 쿼리 JS 함수는 기본 비활성, 워크스페이스 신뢰(Workspace Trust)가 없는 폴더에서는 강제 비활성. 웹뷰는 CSP 적용, `retainContextWhenHidden` 최소화.
- NFR-5 **접근성**: 색상만으로 정보를 전달하지 않음(아이콘/텍스트 병행), 웹뷰는 키보드 탐색·ARIA 지원, 하이 컨트라스트 테마 대응.
- NFR-6 **i18n**: 영어 기본, 한국어 포함. `l10n` API 사용.
- NFR-7 **테스트**: 파서·반복·쿼리 엔진은 단위 테스트(Obsidian Tasks 테스트 케이스를 참고해 호환성 회귀 방지), 확장 API 연동은 `@vscode/test-electron` 통합 테스트. CI에서 실행.
- NFR-8 **라이선스**: MIT. Obsidian Tasks 코드를 참고/이식할 경우 원 저작권 고지 포함(Q-3).
- NFR-9 **배포**: (1) VS Code Marketplace(`vsce publish`) + Open VSX(`ovsx publish`, Cursor용)에 게시 — 자동 업데이트 제공. (2) 같은 빌드의 `.vsix`를 사내 공유 경로에도 올려 Marketplace 접근이 막힌 환경에서 `code --install-extension` / "Install from VSIX…"로 설치할 수 있게 한다(11-2.5의 업데이트 확인은 이 경로용). Marketplace는 공개이므로 사내 고유 정보(서버 주소 등)는 코드·README에 넣지 않고 설정으로만 받는다.

---

## 13. 기술 스택 (제안)

| 영역 | 선택 | 비고 |
|---|---|---|
| 언어 | TypeScript (strict) | |
| 번들러 | esbuild | 확장 본체 + 웹뷰 각각 번들 |
| 웹뷰 UI | **Q-2** (Svelte / Preact / React / Vanilla) | 편집 모달, 칸반, 쿼리 빌더 |
| 날짜 | `dayjs` 또는 `luxon` + `chrono-node`(자연어) | Obsidian Tasks는 moment(Obsidian 내장) 사용 — 이식 시 교체 필요 |
| 반복 규칙 | `rrule` | Obsidian Tasks와 동일 |
| 마크다운 미리보기 | 기본 확장의 `markdown-it` 플러그인 훅 + `previewScripts` | |
| 테스트 | Vitest(단위) + `@vscode/test-electron`(통합) | |
| 린트/포맷 | ESLint + Prettier | |
| 패키지 관리 | pnpm | |
| 패키징·게시 | `@vscode/vsce`, `ovsx` | Marketplace / Open VSX / `.vsix` |

### 13.1 모듈 구조 (초안)

```
src/
  core/            # VS Code 의존성 없음 — 순수 로직 (테스트 용이)
    task/          # Task 모델, 파서, 직렬화, Status, Priority, Urgency
    recurrence/    # rrule 래퍼, 다음 회차 계산
    dates/         # 자연어·상대 날짜 해석, 범위
    query/         # 토크나이저, 필터/정렬/그룹, explain
  index/           # 워크스페이스 스캔, 워처, 증분 갱신, 이벤트
  editor/          # decorations, codelens, hover, completion, diagnostics, quickpicks
  preview/         # markdown-it 플러그인, 미리보기 스크립트, 메시지 브리지
  views/           # 사이드바 TreeView, 저장된 쿼리, 상태바
  webviews/        # 편집 모달, 칸반, 쿼리 빌더 (별도 번들)
  commands/        # 명령 등록
  settings/        # 설정 스키마·마이그레이션
  l10n/
```

---

## 14. 단계별 로드맵 (제안)

| 단계 | 내용 | 산출물 |
|---|---|---|
| **M0** 기반 | 프로젝트 스캐폴딩, CI, `core/task` 파서·직렬화 + 테스트 | 파싱 라이브러리 |
| **M1** 최소 사용 가능 | 인덱스, 토글 명령(완료일·상태 순환), 사이드바 트리(오늘/예정/전체), 상태바 | "쓸 수 있는" 확장 |
| **M2** 에디터 보조 | Decoration, CodeLens, Hover, 자동완성, 진단, QuickPick 편집 | 문법 몰라도 편집 가능 |
| **M3** 반복·상태·의존성 | 반복 엔진, 커스텀 상태, 의존성/blocked, 긴급도 | Obsidian Tasks 핵심 동등 |
| **M4** 쿼리 | 쿼리 엔진 전체, 저장된 쿼리 뷰, `explain`, 쿼리 빌더 | |
| **M5** 미리보기 | markdown-it 플러그인, 체크박스 토글, `tasks` 블록 렌더링 | 읽기 모드 |
| **M6** 웹뷰 | 편집 모달, 칸반/컬럼 뷰, 드래그앤드롭 | Obsidian 8.4 컬럼 뷰 동등 |
| **M7** 추가 기능 | 알림(토스트+OS), 아카이브 명령, 주간 통계, 캘린더(월간+주간) | 11-2장 |
| **M8** 마감 | i18n, Dataview 쓰기, 성능 튜닝, 문서, Marketplace/Open VSX 게시 + `.vsix` 패키징·업데이트 확인 | v1.0 |
| (v1.x) | MCP 서버 AI 연동 | |

---

## 15. 결정 필요 사항 (1차 — 답변 완료, 기록용)

결정 결과는 0장 요약에 반영되어 있습니다.

**Q-1. 확장 이름 / 식별자 / 퍼블리셔**
Marketplace에 표시될 이름(예: "Tasks for Markdown"), 확장 ID(`publisher.name`), 퍼블리셔 ID. "Obsidian" 상표는 이름에 넣지 않는 것을 권장.
답변: 좋아. 그걸로 하자.

**Q-2. 웹뷰 UI 프레임워크 / 패키지 매니저**
후보: Svelte(원본과 동일, 가볍고 이식 쉬움 — 추천) / Preact / React / Vanilla. 패키지 매니저: pnpm(추천) / npm / yarn.
답변: 그래. Svelte로 해보자.

**Q-3. Obsidian Tasks 코드 이식 정도**
(a) 순수 로직(파서·반복·쿼리·긴급도)은 MIT 하에 적극 이식하고 저작권 고지 (추천 — 호환성 보장, 시간 절약)
(b) 문서만 참고하고 전부 재작성
답변: a

**Q-4. 스캔 범위**
워크스페이스 전체 `**/*.md`를 기본으로 하고 `.gitignore`/`files.exclude` 존중(추천)? 아니면 지정 폴더만? 다른 확장자(`.markdown`, `.mdx`, `.txt`)도 포함할지?
답변: 제외조건도 존중하게 해줘.

**Q-5. 글로벌 필터**
Obsidian Tasks처럼 `#task` 같은 글로벌 필터를 지원하되 기본은 비활성(추천)? 아니면 아예 미지원?
답변: 기본은 비활성으로 해줘.

**Q-6. 쓰기 포맷 기본값**
이모지(추천 — Obsidian 기본) / Dataview. 그리고 Dataview 쓰기 지원을 v1에 넣을지 v1.x로 미룰지.
답변: v1에 다 넣자.

**Q-7. 상태 프리셋 범위**
기본 4종 외에 어떤 테마 프리셋을 v1에 포함할지 (Minimal / ITS / Things / Border / AnuPpuccin / LYT Mode / Ebullientworks 등). 추천: Minimal + ITS + Things.
답변: 추천대로 해줘.

**Q-8. 쿼리 JS 함수(`filter/sort/group by function`) 지원**
(a) v1 포함, 설정 opt-in + Workspace Trust 필요 (추천)
(b) v1 제외
답변: a

**Q-9. 반복 태스크 세부 동작**
새 인스턴스 삽입 위치 기본값(위 — Obsidian 기본 / 아래), 🆔 처리(새 ID 발급 / 원본 ID 유지 / ID 제거), ⛔ 의존성 복사 여부.
답변: 너가 추천해줘. 원본 위에 삽입, 🆔는 원본 ID 유지(의존 관계가 다음 회차로 이어지게; 완료된 태스크는 blocking 판정에서 빠지므로 ID 중복 무해), ⛔ 복사. 각각 설정으로 변경 가능. 이렇게 해주면 되겠다.

**Q-10. 저장된 쿼리 저장 위치**
(a) `settings.json`(`tasks.savedQueries`) — 워크스페이스·사용자 모두 가능
(b) 워크스페이스 내 파일(예: `.vscode/tasks-queries.md` 또는 `.tasks/queries/*.md`) — Git으로 공유 가능, 마크다운 그대로
(c) 둘 다
추천: (c) 또는 (b).
답변: c

**Q-11. 마크다운 미리보기 전략**
(a) VS Code 기본 미리보기에 플러그인 주입 (추천 — 가볍고 다른 마크다운 확장과 공존)
(b) 자체 Webview 미리보기 패널 (통제력 높음, 구현량 큼, 다른 미리보기 확장과 이중 표시)
답변: a

**Q-12. 사이드바 칸반의 형태**
(a) 사이드바 안 WebviewView (좁음, 항상 접근)
(b) 에디터 영역의 Webview 패널 탭 (넓음, 드래그앤드롭에 유리 — 추천)
(c) 둘 다
답변: c

**Q-13. 기본 키바인딩**
토글: `Cmd/Ctrl+Enter`(마크다운 태스크 줄에서만) 괜찮은지? 편집 모달, 빠른 검색의 키 조합 희망 사항. Cursor는 `Cmd+K`, `Cmd+L`, `Cmd+I`를 이미 쓰므로 피해야 함.
답변: 그래 좋아.

**Q-14. 범위 밖 후보 기능 — 포함 여부**
- OS 알림/리마인더(마감 임박 시 알림)
- 완료 태스크 자동 아카이브(특정 파일로 이동)
- 태스크 통계/번다운 차트
- AI 연동(예: Cursor/Copilot이 태스크 목록을 읽게 하는 MCP 서버 또는 `@tasks` 채팅 참가자)
- 캘린더 뷰(월간)
각각 v1 / v1.x / 미포함 중 선택.
답변: v1

**Q-15. 성능 목표 규모**
실제 사용할 워크스페이스의 대략적 마크다운 파일 수와 태스크 수. (기본 목표: 5,000 파일 / 50,000 태스크)
답변: 이건 무슨 마크다운 파일을 말하는지 잘 모르겠어.

**Q-16. UI 언어와 날짜 표기**
UI: 영어+한국어(추천)? 상대 날짜 표기 예: "3일 남음" / "in 3 days". 주 시작 요일: 월(추천)/일.
답변: 영어+한국어. 상대 날짜 표기는 그렇게 좋아. 주 시작은 월요일

**Q-17. 버전 정책 / 릴리스**
Marketplace + Open VSX 둘 다(추천)? Pre-release 채널 사용 여부? 저장소 공개(GitHub public) 여부?
답변: 사내에서 사용할거라 어차피 Github 저장소나 Marketplace는 활용 못 해. Vsix 파일을 따로 배포해야 돼.

---

## 15-2. 2차 확인 사항 (답변 완료 항목: R-1, R-2, R-3, R-7 / 미답변: R-4, R-5, R-6 → 15-3 참고)

**R-1. (Q-1 후속) 퍼블리셔 ID**
Marketplace에 올리지 않아도 `package.json`의 `publisher` 필드는 필수이고 확장 ID(`publisher.tasks-for-markdown`)에 들어갑니다. 회사/팀 이름을 영문 소문자로 알려 주세요 (예: `acme`). 표시 이름은 "Tasks for Markdown", ID는 `tasks-for-markdown`으로 진행합니다.
답변: HMCVECDT

**R-2. (Q-9) 반복 태스크 세부 동작 — 제 추천 (이의 없으면 확정)**
- 삽입 위치: 원본 **위** (Obsidian 기본과 동일)
- 🆔: **원본 ID 유지** — "주간 보고 ⛔ 주간 데이터 수집" 같은 관계가 다음 회차에도 이어지도록. 완료된 태스크는 blocking 판정에서 제외되므로 ID 중복이 문제되지 않음.
- ⛔: **복사**
- 설정으로 각각 변경 가능하게 함.
답변: 너 추천대로 진행하자.

**R-3. (Q-14) 범위 밖 후보 5개 전부 v1 포함 확인 + 세부 형태**
"v1"이라고 답하셨는데 5개 모두를 v1에 넣는 것으로 이해했습니다. 맞다면 로드맵에 **M8 단계**로 추가합니다(전체 일정이 상당히 늘어납니다). 각 기능의 형태도 정해 주세요:
- (a) 알림: VS Code 안 토스트 알림 + 상태바(추천, 안정적) / OS 네이티브 알림(macOS `osascript`, Windows PowerShell 호출 — 환경 의존적) / 둘 다
- (b) 자동 아카이브: 완료 후 N일 지난 태스크를 지정 파일(예: `Archive.md`)로 이동. 기본값 — 수동 명령 실행(추천) / 자동
- (c) 통계: 완료 추이(일/주), 미완료 잔량, 기한 초과 수 정도의 간단한 대시보드(Webview 패널)로 충분한지
- (d) AI 연동: **MCP 서버**(추천 — Cursor와 VS Code 모두 지원) / VS Code Chat Participant(`@tasks`, Copilot 전용, Cursor 미지원) / 둘 다
- (e) 캘린더: 월간 뷰만(추천) / 주간 뷰 포함
답변: a: 둘 다, b: 수동 명령 실행, c: 주 단위로 하자. d: 이건 나중에 구현하자. e: 주간 뷰 포함

**R-4. (Q-15) 성능 목표 규모 — 설명**
"마크다운 파일"은 이 확장을 쓸 때 VS Code/Cursor에서 여는 **폴더 안에 있는 `.md` 파일**을 뜻합니다(Obsidian 볼트 폴더를 그대로 열면 볼트의 노트 수). 대략 몇 개인지(수십 / 수백 / 수천), 그리고 한 파일에 태스크가 보통 몇 개인지만 알려 주세요. 모르시면 기본 목표(5,000 파일 / 50,000 태스크)로 진행합니다.
답변:

**R-5. (Q-17 후속) 사내 배포 방식**
- 소스 저장소: 사내 Git(GitLab/Bitbucket 등)이 있는지, 아니면 로컬 Git만 쓰는지
- 자동 업데이트: Marketplace가 없으면 자동 업데이트가 안 됩니다. 사내 공유 경로(파일 서버/URL)에 `.vsix`와 버전 파일을 두고, 확장이 시작할 때 새 버전을 확인해 알려주는 기능을 넣을지 (추천: 넣음, 경로는 설정 `tasks.updateCheckUrl`)
- 사용자 수(대략)와 사용 에디터(VS Code / Cursor / 혼용)
답변:

**R-6. (16장) 추가 정보 제공 여부**
16장의 1~6 중 제공 가능한 것을 알려 주세요. 특히 **4(주 사용 환경)**, **6(Obsidian과 같은 폴더를 병행 사용하는지)**은 설계에 직접 영향을 줍니다. 샘플 파일(1~3)은 `docs/samples/` 폴더에 넣어 주시면 테스트 픽스처로 사용합니다.
답변:

**R-7. 자동 확정한 항목 (이의 있으면 적어 주세요)**
- Q-2 패키지 매니저: pnpm
- Q-4 대상 확장자: `.md`, `.markdown` (설정으로 추가 가능)
- Q-6 쓰기 기본값: 이모지, Dataview 쓰기도 v1 포함
- Q-13 키: 토글 `Cmd/Ctrl+Enter`, 편집 모달 `Cmd/Ctrl+Shift+T`, 빠른 검색 `Cmd/Ctrl+Shift+;` (Cursor 예약 키 회피)
답변:

---

## 15-3. 3차 확인 사항 (답변 완료)

**P-1. (R-4) 성능 규모** — 기본 목표 5,000 파일 / 50,000 태스크로 진행. 실제 규모가 이보다 크면 알려 주세요.
답변: 기본 5000 파일로 하자.

**P-2. (R-5) 사내 배포** — 아래를 가정하고 진행합니다. 다르면 적어 주세요.
- 소스: 로컬 Git (사내 Git 서버가 있으면 주소만 알려 주시면 원격 추가)
- 업데이트 확인: 기능은 넣되 `updateCheckUrl`이 비어 있으면 동작 안 함 (경로는 나중에 설정)
- 사용 에디터: VS Code와 Cursor 혼용으로 가정 → 둘 다 테스트
답변: 일단 marketplace로 하고, 혹시 모르니까 vsix 파일 배포로 하자. → Marketplace + Open VSX 게시를 기본으로, `.vsix` 배포를 보조 경로로 병행.

**P-3. (R-6) 환경 정보** — 특히 (a) Obsidian과 같은 폴더를 병행 사용하는지(문법 호환 엄격도), (b) 사내에서 설치된 다른 마크다운 확장. 샘플 파일은 `docs/samples/`에 넣어 주세요. 답이 없으면 "Obsidian 병행 사용 = 예(엄격 호환)"로 가정합니다.
답변: 별도의 폴더를 사용할거야. → Obsidian 병행 없음. 문법 호환은 유지.

---

## 16. 추가 정보 요청

아래 정보가 있으면 설계 정확도가 올라갑니다.

1. **실제 사용 중인 Obsidian 볼트 샘플**: 태스크가 들어 있는 `.md` 파일 몇 개(민감 정보 제거). 파서 테스트 픽스처와 기본 상태/포맷 결정에 사용.
2. **자주 쓰는 쿼리**: 현재 Obsidian에서 쓰는 ` ```tasks ` 블록 예시. 쿼리 엔진 우선순위와 스마트 뷰 기본값 결정에 사용.
3. **Obsidian 설정**: Tasks 플러그인 설정 화면 스크린샷 또는 `.obsidian/plugins/obsidian-tasks-plugin/data.json` (커스텀 상태, 글로벌 필터, 날짜 옵션 확인용).
4. **주 사용 환경**: VS Code / Cursor 중 어느 쪽이 주인지, OS, 원격(SSH/WSL) 사용 여부.
5. **다른 마크다운 확장**: 현재 설치된 마크다운 관련 확장(Markdown All in One, Markdown Preview Enhanced, Foam, Dendron 등) — 충돌 회피 설계용.
6. **Obsidian과 병행 사용 여부**: 같은 폴더를 Obsidian과 VS Code에서 동시에 열 계획인지 (호환성 엄격도 결정).

---

## 17. 변경 이력

| 날짜 | 버전 | 내용 |
|---|---|---|
| 2026-09-21 | 0.1 | 초안 작성 |
| 2026-09-21 | 0.4 | FR-1.6 직렬화 순서를 Obsidian Tasks 실제 구현 순서로 수정 (M0 구현 중 발견) |
| 2026-09-21 | 0.3 | 3차 답변 반영: 규모 확정, 배포를 Marketplace+Open VSX 기본 / `.vsix` 보조로 변경, Obsidian 병행 없음 |
| 2026-09-21 | 0.2 | 1·2차 답변 반영: 확정 요약(0장), 반복 태스크 세부(FR-1.13), 저장된 쿼리 위치(FR-5.5), 추가 기능 장(11-2), 사내 배포(NFR-9), 로드맵 M7/M8, AI 연동 v1.x 연기 |
