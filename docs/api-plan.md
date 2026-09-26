# 공개 API 계획 (v0.2 — 확정)

작성일 2026-09-26, 확정 2026-09-26. §9의 답변으로 아래 결정을 확정했습니다. §10은 일반적인 API 제공 서비스가 갖추는 요소와 우리가 채택한 것의 대조표입니다.

**확정 요약**: A(확장 API)+B(명령) 먼저 → D(npm/CLI)+C(MCP, 주 대상 Claude Code) → F(URI). 배포는 마켓플레이스 게시와 함께 공개 npm(`@hmcvecdt/tasks-core`, `@hmcvecdt/tasks-cli`), 불가하면 사내 `.tgz`. 쓰기 정책 기본 `confirm`. 편집기 밖 쓰기는 7-a. v1에 `remove`·`batch` 포함. 접근 방식은 `exports.getAPI(1)` + `tasksmd.api.*` 명령(§9 Q7).

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
  - 어차피 다 할거잖아. A+B부터 해줘.
- **Q2. MCP 대상.** Cursor Agent / Claude Code / Claude Desktop 중 어디서 쓰실 건가요? (모두 stdio면 동일하지만 등록 문서를 어디 기준으로 쓸지)
  - 아마 주로 클로드코드일거 같아. 그런데 vscode에서 사람이 직접 갖다 쓸수도 있지.
- **Q3. 배포.** core·CLI를 공개 npm에 올릴까요, 사내 레지스트리/`.tgz`로 둘까요? 패키지 이름 `@hmcvecdt/tasks-core`, `@hmcvecdt/tasks-cli`로 괜찮은지.
  - 어차피 이 플러그인을 마켓플레이스에 올릴거 아냐? 만약 플러그인을 마켓플러그인에 올린다면 npm에 올리고, 그게 나중에 불가능하다면 두번째 방법으로 하면 될 것 같아. 패키지 이름은 다 좋아.
- **Q4. 쓰기 정책 기본값.** 다른 확장의 쓰기를 기본 허용(`allow`)할지, 첫 호출 때 확인(`confirm`)할지.
  - 첫 호출 때 확인. 어떤 것 때문에 허용절차가 필요한거지?
  - **답**: VS Code에서는 설치된 **어떤 확장이든** 다른 확장의 `exports`를 아무 확인 없이 가져다 호출할 수 있습니다. 즉 우리가 쓰기 API를 열면, 사용자가 무심코 설치한 확장(또는 버그가 있는 확장)이 사용자 모르게 노트의 태스크를 대량으로 완료·삭제·이동할 수 있습니다. 읽기는 파일을 직접 읽을 수 있는 확장이라면 어차피 가능하므로 막을 이유가 없지만, **쓰기**는 사용자의 노트를 바꾸는 일이라 "누가 쓰려고 하는지"를 한 번은 보여 주는 게 안전합니다. 첫 호출 때 `"확장 <이름>이(가) Tasks를 수정하려고 합니다. 허용 / 이번만 / 거부"`를 띄우고 선택을 기억합니다(설정 `tasksmd.api.allowedWriters`). 브라우저의 권한 팝업이나 OAuth 동의 화면과 같은 역할입니다. 한계: 호출자 ID는 호출 쪽이 스스로 밝히는 값이라 위장할 수 있습니다. 그래도 밝힌 ID가 실제 설치된 확장인지 확인하고 모든 쓰기를 로그에 남기므로, 악의가 아닌 실수·버그는 충분히 걸러집니다. MCP/CLI 경로는 에이전트 도구 자체에 승인 단계가 있으므로 이 확인을 거치지 않습니다.
- **Q5. 편집기 밖 쓰기.** 7-a(직접 쓰기 + 안전장치)로 시작해도 되는지, 처음부터 7-b가 필요한지.
  - 7-a로 해줘.
- **Q6. 범위.** 4.2의 `remove`(태스크 삭제)와 `batch`를 v1에 넣을지, 읽기+생성+상태 변경으로 시작할지.
  - 다 넣어줘.
- **Q7. 이름.** 확장 API 접근 키를 `exports` 그대로 둘지, 명령 접두어를 `tasksmd.api.`로 할지 다른 제안이 있는지.
  - 어떤게 더 나을까? 일반적인 api 제공 서비스는 어떻게 하는데?
  - **답**: VS Code 생태계의 관례는 `exports`에 **버전을 인자로 받는 접근 함수**를 두는 것입니다. 내장 Git 확장이 `vscode.extensions.getExtension('vscode.git').exports.getAPI(1)`, GitLens가 `getAPI(1)`, Python 확장이 `exports.environments`(버전 필드 포함)를 씁니다. 버전을 인자로 받으면 나중에 v2를 내도 v1 호출자가 깨지지 않습니다. 그래서 **`exports.getAPI(1)`로 확정**합니다. `exports`에 다른 것은 두지 않고(`__internal`은 테스트 전용으로 남김), 명령 표면은 `tasksmd.api.<namespace>.<method>`로 하되 팔레트에서 숨깁니다. 이 두 이름은 일반 서비스로 치면 "SDK 클라이언트 생성(`new Client({ version })`)"과 "REST 엔드포인트(`/api/v1/tasks`)"에 해당합니다.

---

## 10. 일반적인 API 제공 서비스가 갖추는 것 — 예시와 채택 여부

할 일 관리·문서 도구·개발 도구의 공개 API를 보면 제공 항목이 거의 정형화되어 있습니다. 대표 예를 항목별로 들고, 우리가 v1에서 어떻게 할지 적었습니다.

### 10.1 리소스와 기본 조작 (CRUD)

| 서비스 | 제공 형태 |
|---|---|
| **Todoist REST API v2** | `GET /tasks`, `POST /tasks`, `GET /tasks/{id}`, `POST /tasks/{id}`(수정), `POST /tasks/{id}/close`, `/reopen`, `DELETE /tasks/{id}`. 프로젝트·섹션·라벨·댓글도 같은 패턴 |
| **Notion API** | `POST /v1/pages`(생성), `PATCH /v1/pages/{id}`(속성 수정), `POST /v1/databases/{id}/query`(필터·정렬로 조회), 블록 자식 추가/삭제 |
| **GitHub REST** | `GET /repos/{o}/{r}/issues`, `POST …/issues`, `PATCH …/issues/{n}`(state 변경 포함), 라벨·마일스톤·댓글 |
| **Google Tasks API** | `tasklists.list/insert/…`, `tasks.list/get/insert/update/patch/delete/move/clear` |
| **Obsidian Tasks 플러그인** | 공개 API는 `createTaskLineModal()` 하나(편집 모달을 띄워 만들어진 줄 문자열을 돌려줌). 읽기·쿼리 API는 없어 다른 플러그인이 Dataview 등을 우회해 씀 |

**채택**: `query.get/list/run`, `edit.create/update/setStatus/toggle/postpone/remove/batch`, `ui.openEdit`(Obsidian의 모달 API에 해당). 리소스는 태스크 하나이며 파일·저장 쿼리는 읽기 전용 보조 리소스입니다.

### 10.2 조회 언어(필터·정렬·페이지)

| 서비스 | 형태 |
|---|---|
| Todoist | `GET /tasks?filter=today & p1`(앱과 같은 필터 문법), `project_id`, `label` 파라미터 |
| Notion | JSON 필터 객체 `{ "and": [{ "property": "Due", "date": { "before": "…" } }] }` + `sorts` + `start_cursor/page_size` |
| GitHub | 검색 API의 `q=is:open label:bug`, 목록은 `per_page/page` 또는 커서 |
| Linear | GraphQL(원하는 필드만 선택) |

**채택**: 앱과 같은 쿼리 언어(Todoist 방식)를 그대로 `query.run(text)`로 노출합니다. 이미 40여 개 필터·정렬·그룹이 있어 새 필터 언어를 만들 이유가 없고, AI 에이전트가 문서에서 배울 수 있습니다. 페이지는 `limit` 인자만(태스크 수가 수만이어도 메모리 내 배열이라 커서가 필요 없음). `explain`은 Todoist·Notion에는 없지만 에이전트가 쿼리를 검증하는 데 유용해 넣습니다.

### 10.3 버전 관리와 호환 정책

| 서비스 | 형태 |
|---|---|
| Todoist | URL에 버전(`/rest/v2/`), 이전 버전 종료 예고 후 폐기 |
| Notion | 헤더 `Notion-Version: 2022-06-28`(날짜 버전), 요청마다 지정 |
| Stripe | 계정별 고정 API 버전, 호환 안 되는 변경은 새 날짜 버전 |
| VS Code Git 확장 | `getAPI(1)` 숫자 버전, 필드 추가는 같은 버전 |

**채택**: `getAPI(1)` 숫자 버전. 필드 추가·메서드 추가는 1 유지, 제거·의미 변경은 2를 추가하고 1을 한 릴리스 이상 병행. CHANGELOG에 "API" 절을 따로 둡니다.

### 10.4 인증·권한

| 서비스 | 형태 |
|---|---|
| Todoist / Notion / GitHub | 개인 토큰 또는 OAuth, 스코프(`read`, `write`, `repo`…) |
| VS Code 확장 간 | 인증 없음(같은 프로세스). 신뢰는 "설치했다"는 사실뿐 |
| MCP | 호스트(Claude Code 등)가 도구 호출마다 사용자 승인 |

**채택**: 확장 간에는 토큰 대신 **호출자 선언 + 쓰기 확인(`confirm`)** (§6, Q4 답). 스코프에 해당하는 것은 "읽기는 자유, 쓰기는 확인"의 두 단계입니다. CLI/MCP는 로컬 파일 접근 권한이 곧 권한이며 별도 인증은 두지 않습니다(로컬 HTTP를 안 여는 이유이기도 합니다).

### 10.5 오류 형식

| 서비스 | 형태 |
|---|---|
| Todoist | HTTP 상태 + 본문 텍스트 |
| Notion | `{ "object": "error", "status": 400, "code": "validation_error", "message": "…" }` |
| GitHub | `{ "message": "…", "errors": [{ "resource", "field", "code" }], "documentation_url" }` |
| Stripe | `type`, `code`, `param`, `message`, `doc_url` |

**채택**: Notion/Stripe 식 코드+메시지: `{ code: 'STALE_LINE'|'NOT_FOUND'|'INVALID_QUERY'|'UNTRUSTED'|'DENIED'|'IO'|'INVALID_ARGUMENT', message, details? }`. 코드 목록은 문서에 고정합니다.

### 10.6 변경 알림(이벤트·웹훅)

| 서비스 | 형태 |
|---|---|
| Todoist / GitHub / Linear | 웹훅(HTTP 콜백) + 이벤트 종류 구독 |
| Notion | (초기엔 없음 → 2024년 웹훅 추가) |
| VS Code | `Event<T>` 객체(`onDidChange…`)로 구독, `Disposable` 반환 |

**채택**: 확장 API는 VS Code 관례대로 `events.onDidChangeTasks`, `onDidCompleteTask`. CLI/MCP는 요청-응답이라 이벤트 없음(필요하면 `tasksmd watch`로 표준 출력 스트림, 3차).

### 10.7 동시성·멱등성

| 서비스 | 형태 |
|---|---|
| Stripe / Todoist | `Idempotency-Key`/`X-Request-Id` 헤더로 재시도 안전 |
| GitHub | `If-Match`/ETag로 낙관적 잠금(일부 리소스) |
| Notion | `last_edited_time` 비교는 호출자 몫 |

**채택**: `TaskRef.expectedText`(줄 원문)로 낙관적 잠금 — 줄이 바뀌었으면 `STALE_LINE`. `batch`는 전체 성공 아니면 전체 취소(단일 `WorkspaceEdit`). 멱등성 키는 로컬 호출이라 불필요.

### 10.8 쓰기 제한·안전장치

| 서비스 | 형태 |
|---|---|
| 대부분 | 분당 요청 수 제한(429), 본문 크기 제한, 일괄 API의 개수 상한(Notion 100블록, Todoist Sync 100커맨드) |

**채택**: 속도 제한은 로컬이라 두지 않되, `batch` 상한 200개(설정), 한 호출로 지울 수 있는 태스크 수 상한, 신뢰되지 않은 워크스페이스에서 쓰기 거부.

### 10.9 SDK·타입·문서

| 서비스 | 형태 |
|---|---|
| Todoist | 공식 TS/Python SDK |
| Notion | `@notionhq/client` + 타입, OpenAPI 명세 |
| GitHub | Octokit, OpenAPI |
| VS Code Git | `git.d.ts` 타입 파일을 저장소에 두고 복사해 쓰라고 안내 |

**채택**: `dist/api.d.ts`(확장에 동봉) + npm `@hmcvecdt/tasks-core`의 타입, 문서 `docs/api.md`(한국어, 영문 보조)에 (1) 시작 코드 10줄, (2) 메서드별 인자·반환·오류, (3) 쿼리 문법 링크, (4) 예제 세 개(다른 확장, 키바인딩 명령, Claude Code MCP). MCP 서버는 도구 설명과 `tasks_syntax_reference` 리소스로 자체 문서를 제공합니다.

### 10.10 폐기·변경 로그·실험 기능

| 서비스 | 형태 |
|---|---|
| Stripe / Notion | 변경 로그 페이지, 폐기 예고 기간, 실험 기능은 베타 헤더 |
| VS Code | `proposed API`는 명시적 opt-in |

**채택**: CHANGELOG "API" 절, 폐기는 최소 두 마이너 릴리스 전 예고, 실험 기능은 `experimental` 네임스페이스.

### 10.11 우리가 일부러 넣지 않는 것

- 원격 HTTP 엔드포인트와 토큰 인증 — 로컬 도구이므로 공격면만 늘어납니다.
- 커서 기반 페이지네이션 — 메모리 내 인덱스라 `limit`으로 충분합니다.
- 웹훅 — 로컬 프로세스 간에는 이벤트 객체(확장)나 재조회(CLI)가 더 단순합니다.

---

## 11. 확정 후 다음 단계

1. docs/Tasks.md에 **M9 API** 체크리스트 추가(A1 → A2 → B1 → D1 → C1 → C2 → F1).
2. A1부터 구현. 각 단계 끝에 커밋·푸시·`.vsix` 설치.
