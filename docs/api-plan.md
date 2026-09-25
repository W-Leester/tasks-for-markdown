# 공개 API 계획 (초안 v0.1)

작성일 2026-09-26. 구현 전 계획 문서입니다. 마지막 "결정이 필요한 질문" 절에 답을 적어 주시면 그 답으로 요구사항을 확정하고 구현에 들어갑니다.

---

## 1. 왜, 누구를 위한 API인가

지금 확장은 사람이 UI로 쓰는 것만 상정합니다. API를 열면 다음 사용자가 생깁니다.

| 사용자 | 하고 싶은 일 | 예 |
|---|---|---|
| **다른 VS Code/Cursor 확장** | 태스크를 읽고 쓰기 | 일일 노트 확장이 오늘 마감 태스크를 노트에 삽입, 타임 트래커가 "진행 중" 태스크를 표시 |
| **AI 에이전트 (Cursor Agent, Claude Code 등)** | 자연어 지시로 태스크 조회·생성·완료 | "이번 주 업무 태스크 중 안 끝난 것 보여줘", "회의록 정리 완료 처리해" |
| **스크립트·CI·자동화** | 편집기 밖에서 쿼리 실행, 리포트 생성 | 매주 월요일 `not done, due last week` 결과를 Slack으로 |
| **사용자 자신의 키바인딩·매크로** | 인자를 넣어 명령 호출 | 특정 저장 쿼리를 칸반으로 여는 단축키 |

가장 가치가 큰 순서는 **AI 에이전트 → 다른 확장 → 스크립트**라고 봅니다. 사용자가 Cursor를 쓰고 있고, 태스크 조작은 "말로 시키기"에 딱 맞는 작업이기 때문입니다.

## 2. 이미 있는 것

- `activate()`가 내부 객체(`index`, `editService`, `queries`, `webviews` 등)를 그대로 반환합니다. 통합 테스트가 이것을 씁니다. **공개하기에는 부적합**합니다. 내부 클래스와 `vscode` 타입이 노출되어 한 번 공개하면 리팩터링이 묶이고, 쓰기 경로에 검증·확인이 없습니다.
- 명령 41개가 등록되어 있고 일부는 인자를 받습니다(`tasksmd.createOrEdit`, `tasksmd.runQueryAtCursor` 등). 하지만 인자 형태가 문서화되어 있지 않고 반환값이 없습니다.
- `src/core/`는 `vscode` 의존이 없어서(린트로 강제) 그대로 라이브러리가 될 수 있습니다.

## 3. 표면(surface) 후보와 추천

| 표면 | 소비자 | 장점 | 단점 | 추천 |
|---|---|---|---|---|
| **A. 확장 API** (`vscode.extensions.getExtension('HMCVECDT.tasks-for-markdown').exports`) | 다른 확장 | 타입 있는 직접 호출, 이벤트 구독 가능, VS Code 표준 방식 | 같은 확장 호스트 안에서만 | **1차** |
| **B. 인자 있는 명령** (`vscode.commands.executeCommand('tasksmd.api.query', {...})`) | 다른 확장, 키바인딩, 매크로 확장 | 가장 낮은 진입 장벽, 언어 무관 | 타입 없음, 반환값 JSON만 | **1차** (A의 얇은 래퍼) |
| **C. MCP 서버** (Model Context Protocol) | Cursor Agent, Claude Code, Claude Desktop 등 AI | AI가 도구로 바로 사용. Cursor는 `.cursor/mcp.json`으로 등록 | 별도 프로세스, 편집기와 상태 공유 방법 필요 | **2차** (가장 큰 효용) |
| **D. npm 라이브러리 + CLI** (`@hmcvecdt/tasks-core`, `tasksmd` 명령) | 스크립트, CI, C의 기반 | core가 이미 분리되어 있어 비용 낮음 | 배포 채널 하나 더 | **2차** (C와 함께) |
| E. 로컬 HTTP 서버 | 외부 앱 | 언어 무관 | 포트·인증·보안 부담, 위 넷으로 충분 | 보류 |
| F. URI 핸들러 (`vscode://HMCVECDT.tasks-for-markdown/open?…`) | 외부 링크, 다른 앱 | 딥링크 | 읽기 전용 수준 | 3차 (작음) |

**구조 제안**: 하나의 **API 코어**(`src/api/`)를 만들고, A·B·C·D는 모두 그 코어의 어댑터로 둡니다. 데이터 계약(JSON DTO)을 한 곳에 두어 네 표면이 같은 모양을 반환하게 합니다.

```
                 ┌────────────── 소비자 ──────────────┐
 다른 확장 ──A──▶│                                      │
 명령/매크로 ─B─▶│   TasksApi (src/api/TasksApi.ts)     │──▶ core (query, task, recurrence)
 AI 에이전트 ─C─▶│   · DTO 변환 · 검증 · 권한 · 이벤트   │──▶ index / editService (VS Code 안)
 스크립트 ────D─▶│                                      │──▶ 파일 시스템 직접 (VS Code 밖)
                 └──────────────────────────────────────┘
```

C·D는 VS Code 밖에서 도는 경우가 있으므로 코어는 "인덱스 제공자"를 추상화해야 합니다. 편집기 안에서는 `TaskIndex`+`TaskEditService`, 밖에서는 폴더 스캔+파일 쓰기 구현을 꽂습니다. 같은 파일을 양쪽이 동시에 고치는 문제는 §7에서 다룹니다.

## 4. API 설계 초안 (v1)

네임스페이스 넷, 모두 **JSON 직렬화 가능한 값**만 주고받습니다(`Task` 클래스·`dayjs`·`vscode.Uri` 노출 금지). 날짜는 `YYYY-MM-DD` 문자열, 위치는 `{ path, line }`(워크스페이스 상대 경로, 0-based 줄).

### 4.1 `tasks.query` — 읽기

```ts
interface TasksApi {
  readonly version: '1';                      // API 버전. 호환 안 되는 변경은 '2'
  query: {
    run(query: string, opts?: { source?: string; limit?: number }): Promise<QueryResult>;
    explain(query: string): Promise<{ explain: string; errors: QueryError[] }>;
    get(ref: TaskRef): Promise<TaskDto | null>;          // 한 개
    list(opts?: { paths?: string[] }): Promise<TaskDto[]>; // 필터 없이 전체(또는 파일들)
    saved(): Promise<SavedQuery[]>;                      // 저장된 쿼리 목록
  };
```
`QueryResult = { matched, shown, tasks: TaskDto[], groups: GroupDto | null, errors }` — 웹뷰 프로토콜의 것과 같은 모양을 재사용합니다.

### 4.2 `tasks.edit` — 쓰기 (모두 `TaskEditService`를 거침 → 낙관적 동시성 검사 유지)

```ts
  edit: {
    create(input: NewTask, target?: { path: string; line?: number }): Promise<TaskDto>;
    update(ref: TaskRef, changes: Partial<TaskFields>): Promise<TaskDto>;
    setStatus(ref: TaskRef, symbol: string): Promise<TaskDto>;   // 반복 규칙 처리 포함
    toggle(ref: TaskRef): Promise<TaskDto>;
    postpone(ref: TaskRef, to: string | 'tomorrow' | 'next week'): Promise<TaskDto>;
    remove(ref: TaskRef): Promise<void>;
    batch(ops: EditOp[]): Promise<BatchResult>;   // 여러 파일을 한 WorkspaceEdit로, 실패 시 전체 취소
  };
```
`TaskRef = { path: string; line: number; expectedText?: string }` — `expectedText`를 주면 줄이 바뀌었을 때 거부(외부 도구가 오래된 정보로 덮어쓰는 사고 방지).

### 4.3 `tasks.events` — 구독

```ts
  events: {
    onDidChangeTasks(listener: (e: { paths: string[] }) => void): Disposable;
    onDidCompleteTask(listener: (e: { task: TaskDto; next?: TaskDto }) => void): Disposable; // 반복 다음 회차 포함
  };
```

### 4.4 `tasks.ui` — 화면 열기 (VS Code 안에서만)

```ts
  ui: {
    openEdit(ref?: TaskRef): Promise<void>;
    openKanban(opts?: { savedQueryId?: string; mode?: 'status'|'due'|'priority'|'file' }): Promise<void>;
    openCalendar(opts?: { date?: string; fullScreen?: boolean }): Promise<void>;
    openQueryResults(query: string, source?: string): Promise<void>;
    reveal(ref: TaskRef): Promise<void>;   // 에디터에서 그 줄로
  };
}
```

### 4.5 명령 표면 (B) — A의 1:1 래퍼

`tasksmd.api.<namespace>.<method>` 형태, 인자 하나(JSON 객체), 반환은 Promise<JSON>. 예:
```ts
await vscode.commands.executeCommand('tasksmd.api.query.run', { query: 'not done\ndue today' });
```
명령 팔레트에는 숨깁니다(`commandPalette` when: false).

### 4.6 MCP 서버 (C) — 도구 목록 초안

| 도구 | 설명 |
|---|---|
| `tasks_query` | 쿼리 텍스트 실행 → 태스크 목록(설명·경로·줄·필드) |
| `tasks_list_saved_queries` | 저장된 쿼리 이름·텍스트 |
| `tasks_create` | 설명·날짜·우선순위·태그로 생성(대상 파일 지정, 없으면 `calendar.newTaskFile`) |
| `tasks_update` / `tasks_set_status` / `tasks_postpone` | 수정 |
| `tasks_explain_query` | 쿼리 해석 결과(에이전트가 문법 확인용) |
| `tasks_syntax_reference` | 필드·이모지·쿼리 문법 요약 텍스트(에이전트 프롬프트용 리소스) |

전송은 stdio(가장 호환성 높음). 서버 실행 파일은 D의 CLI에 포함(`tasksmd mcp`). Cursor 등록 예:
```json
{ "mcpServers": { "tasks": { "command": "npx", "args": ["-y", "@hmcvecdt/tasks-cli", "mcp", "--root", "${workspaceFolder}"] } } }
```
**중요한 설계 결정**: MCP 서버가 편집기 밖에서 파일을 직접 고치면 편집기가 열어 둔 더티 문서와 충돌할 수 있습니다. 대안 두 가지를 §7에서 비교합니다.

### 4.7 CLI (D)

```
tasksmd query "not done\ndue before today" [--root .] [--json|--md]
tasksmd explain "…"
tasksmd add "설명 📅 2026-10-01" --file notes/inbox.md
tasksmd done notes/todo.md:12
tasksmd mcp --root .
```

## 5. 데이터 계약과 버전 정책

- DTO 정의를 `src/api/types.ts` 한 곳에 두고, 웹뷰 프로토콜의 `TaskDto`를 여기서 import하도록 통일합니다. 패키징 시 `.d.ts`를 `dist/api.d.ts`로 내보내 다른 확장이 타입을 가져다 쓰게 합니다(`import type { TasksApi } from 'tasks-for-markdown/api'` 형태, 또는 npm 타입 패키지).
- `version: '1'`. 필드 추가는 호환 변경(마이너), 필드 제거·의미 변경은 `'2'`로 올리고 이전 버전을 한 릴리스 동안 병행합니다.
- 실험 기능은 `experimental` 네임스페이스 아래에 두고 언제든 바뀔 수 있다고 명시합니다.
- 모든 오류는 `{ code: 'STALE_LINE' | 'NOT_FOUND' | 'INVALID_QUERY' | 'UNTRUSTED' | 'IO', message }`로 통일(예외 던지지 않고 거부된 Promise에 이 객체).

## 6. 보안·안전

- **신뢰되지 않은 워크스페이스**: 쓰기 API 전체 거부(`UNTRUSTED`), 읽기만 허용. JS 함수 쿼리는 지금처럼 차단.
- **쓰기 확인 정책**(설정 `tasksmd.api.writePolicy`): `allow`(기본, 다른 확장이 바로 씀) / `confirm`(첫 호출 시 확장 ID를 보여 주고 허용 여부를 기억) / `deny`. AI 에이전트 경로(MCP)는 에이전트 쪽에 이미 승인 UI가 있으니 서버는 `allow`.
- 호출자 식별: A는 `getExtension` 호출자를 알 수 없으므로 `api.for(callerId)`처럼 호출자 ID를 받아 로그와 확인 정책에 씁니다.
- 대량 쓰기는 `batch`로만, 한 번에 200줄 상한(설정).
- 모든 API 쓰기는 출력 채널에 `api <caller> edit.update notes/a.md:12` 형식으로 기록.

## 7. 편집기 밖 쓰기와 동시성 (C·D의 핵심 문제)

| 방식 | 동작 | 장점 | 단점 |
|---|---|---|---|
| **7-a 직접 파일 쓰기** | CLI/MCP가 파일을 읽고 고쳐 씀 | 편집기 없이 동작, 단순 | 편집기에 저장 안 된 변경이 있으면 충돌(VS Code는 외부 변경을 감지해 "덮어쓸까요?"를 띄움) |
| **7-b 편집기 경유** | 확장이 로컬 소켓(또는 파일 기반 요청 큐)을 열고, CLI/MCP는 편집기가 떠 있으면 그리로 위임, 없으면 7-a로 폴백 | 열린 문서와 항상 일치, Undo 스택에 들어감 | 구현 복잡(소켓 경로·인증 토큰), 편집기 두 개일 때 라우팅 |

**추천**: 1차는 **7-a + 안전장치**(쓰기 전 `expectedText` 검사, 편집기가 그 파일을 더티 상태로 열어 두었는지는 알 수 없으므로 MCP 도구 설명에 "저장 후 사용" 안내), 2차에 7-b를 옵션으로. 읽기는 어느 쪽이든 문제없습니다.

## 8. 구현 단계 (제안)

| 단계 | 내용 | 산출물 | 예상 |
|---|---|---|---|
| **A1** | `src/api/` 코어: DTO 변환, `TasksApi` 구현(query·edit·events·ui), 오류 객체, 쓰기 정책 설정, 로그 | 단위 테스트 + 통합 테스트(다른 확장인 척 `getExtension().exports` 호출) | 1일 |
| **A2** | `activate()` 반환을 `{ version, ...api, __internal }`로 교체(테스트는 `__internal` 사용), `dist/api.d.ts` 생성, 문서 `docs/api.md`(한국어) + 예제 확장 스니펫 | 타입 파일이 `.vsix`에 포함 | 0.5일 |
| **B1** | `tasksmd.api.*` 명령 래퍼 자동 등록(메서드 목록에서 생성), 팔레트 숨김 | 통합 테스트 | 0.5일 |
| **D1** | `packages/core`로 core 분리 발행 준비(pnpm workspace), `packages/cli`: query/explain/add/done, 폴더 스캐너(gitignore 존중), JSON/Markdown 출력 | npm 발행(또는 사내 레지스트리), CLI 테스트 | 1.5일 |
| **C1** | `tasksmd mcp`: stdio MCP 서버, 도구 6개, 문법 리소스, 7-a 쓰기 + `expectedText` | Claude Code/Cursor에서 "오늘 마감 보여줘" 시나리오 검증, MCP 테스트 클라이언트로 자동 테스트 | 1.5일 |
| C2 | 7-b 편집기 위임(선택) | | 1.5일 |
| F1 | URI 핸들러 `open`, `query` | | 0.5일 |

A1→A2→B1이 한 묶음(편집기 안 API), D1→C1이 한 묶음(밖 API)입니다. 두 묶음은 독립이라 순서를 바꿔도 됩니다.

## 9. 결정이 필요한 질문

답을 각 항목 아래에 적어 주세요.

- **Q1. 우선순위.** 편집기 안 API(A+B)부터 할까요, AI용 MCP(D+C)부터 할까요? (추천: MCP를 쓰실 계획이 구체적이면 D+C 먼저, 아니면 A+B 먼저)
- **Q2. MCP 대상.** Cursor Agent / Claude Code / Claude Desktop 중 어디서 쓰실 건가요? (모두 stdio면 동일하지만 등록 문서를 어디 기준으로 쓸지)
- **Q3. 배포.** core·CLI를 공개 npm에 올릴까요, 사내 레지스트리/`.tgz`로 둘까요? 패키지 이름 `@hmcvecdt/tasks-core`, `@hmcvecdt/tasks-cli`로 괜찮은지.
- **Q4. 쓰기 정책 기본값.** 다른 확장의 쓰기를 기본 허용(`allow`)할지, 첫 호출 때 확인(`confirm`)할지.
- **Q5. 편집기 밖 쓰기.** 7-a(직접 쓰기 + 안전장치)로 시작해도 되는지, 처음부터 7-b가 필요한지.
- **Q6. 범위.** 4.2의 `remove`(태스크 삭제)와 `batch`를 v1에 넣을지, 읽기+생성+상태 변경으로 시작할지.
- **Q7. 이름.** 확장 API 접근 키를 `exports` 그대로 둘지, 명령 접두어를 `tasksmd.api.`로 할지 다른 제안이 있는지.

답이 오면 이 문서를 v0.2(확정)로 갱신하고 docs/Tasks.md에 단계별 체크리스트를 추가한 뒤 구현을 시작하겠습니다.
