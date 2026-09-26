# Tasks for Markdown 공개 API (v1)

다른 확장·키바인딩·매크로에서 태스크를 읽고 쓰는 방법입니다. 설계 배경은 [api-plan.md](api-plan.md), 타입 정의는 확장에 동봉된 `dist/api-types/api/types.d.ts`(소스: [src/api/types.ts](../src/api/types.ts))입니다.

## 1. 시작하기 (다른 확장에서)

```ts
import * as vscode from 'vscode';
import type { TasksExtensionExports, TasksApi } from './tasks-api';   // types.d.ts를 복사해 두세요

const ext = vscode.extensions.getExtension<TasksExtensionExports>('HMCVECDT.tasks-for-markdown');
if (!ext) throw new Error('Tasks for Markdown is not installed');
const tasks: TasksApi = (await ext.activate()).getAPI(1, { extensionId: 'my-publisher.my-extension' });

const r = await tasks.query.run('not done\ndue before tomorrow\nsort by urgency');
for (const t of r.tasks) console.log(t.path, t.line + 1, t.description, t.due);
```

- `getAPI(1, caller)`: 버전은 현재 `1`만 지원합니다. 다른 값은 `INVALID_ARGUMENT`로 던집니다. `caller.extensionId`는 쓰기 확인 대화상자와 로그에 표시됩니다.
- 모든 메서드는 `Promise`를 돌려주고, 실패하면 `{ code, message, details? }` 모양의 `TasksApiError`로 거부됩니다(§5).
- 값은 전부 JSON입니다. 날짜는 `YYYY-MM-DD`, 태스크 위치는 `{ path, line }`(워크스페이스 상대 경로, 0부터 세는 줄).

## 2. 메서드

### query — 읽기 (확인 없음)

| 메서드 | 설명 |
|---|---|
| `run(query, { source?, limit? })` | ```tasks 블록과 같은 쿼리 언어. `tasks`(평평한 목록)와 `groups`(`group by`가 있을 때 트리), `matched`, `shown`. 파싱 오류는 `INVALID_QUERY` |
| `explain(query, source?)` | 해석 결과 문자열과 오류 목록. 실행하지 않음 |
| `get(ref)` | 그 줄의 태스크 또는 `null` |
| `list({ paths? })` | 인덱스의 모든 태스크(파일 순서), 파일 목록으로 제한 가능 |
| `saved()` | 저장된 쿼리(설정 + `.tasks/queries/*.md`) |

### edit — 쓰기 (쓰기 정책 적용, §4)

| 메서드 | 설명 |
|---|---|
| `create(input, target?)` | 새 태스크. `input`: `description`(필수), `tags`, `priority`('0'~'5'), 날짜들, `recurrence`, `onCompletion`, `id`, `dependsOn`, `status`. `target.path`(없으면 `tasksmd.calendar.newTaskFile`), `target.line`(없으면 파일 끝). 파일이 없으면 만듭니다 |
| `update(ref, changes)` | 필드 변경. `null`은 그 필드 제거. `status`가 있으면 마지막에 상태 변경으로 적용 |
| `setStatus(ref, symbol)` | 상태 기호(`x`, `/`, `-` …). 완료·취소 날짜와 반복 다음 회차는 UI에서 클릭한 것과 똑같이 처리 |
| `toggle(ref)` | 상태의 다음 기호로 |
| `postpone(ref, to)` | 마감일(없으면 예정일)을 `YYYY-MM-DD` 또는 자연어(`tomorrow`, `next monday`, `in 2 weeks`, `3일 후`)로 |
| `remove(ref)` | 줄 삭제 |
| `batch(ops)` | 순서대로 실행. 첫 실패에서 멈추고 `details.completed`에 성공 개수, `details.results`에 그때까지의 결과. 상한 `tasksmd.api.batchLimit`(200). **원자적이지 않습니다**(앞선 작업은 되돌리지 않음) |

`ref.expectedText`에 줄 원문(`TaskDto.originalMarkdown`)을 넣으면 그사이 줄이 바뀐 경우 `STALE_LINE`으로 거부합니다. 오래된 정보로 덮어쓰는 사고를 막으려면 항상 넣는 것을 권합니다.

### events — 구독

| 메서드 | 설명 |
|---|---|
| `onDidChangeTasks(listener)` | 태스크가 바뀌거나 지워진 파일 경로 목록. 디바운스된 인덱스 이벤트 |
| `onDidCompleteTask(listener)` | 미완료 → 완료로 바뀔 때. 반복 태스크면 `next`에 새 회차 |

둘 다 `{ dispose() }`를 돌려줍니다.

### ui — 화면 열기

| 메서드 | 설명 |
|---|---|
| `openEdit(ref?)` | 만들기/편집 대화상자 |
| `openKanban({ savedQueryId?, mode? })` | 칸반. 이미 열려 있으면 옵션은 적용되지 않습니다 |
| `openCalendar({ fullScreen? })` | 캘린더 |
| `openQueryResults(query, source?)` | 쿼리 결과 패널 |
| `reveal(ref)` | 에디터에서 그 줄로 이동 |

## 3. 명령 표면 (키바인딩·매크로·다른 언어)

메서드마다 `tasksmd.api.<네임스페이스>.<메서드>` 명령이 있습니다. 인자는 이름 있는 매개변수를 담은 객체 하나, 반환은 메서드 결과(JSON)입니다. 실패하면 거부되는 대신 `{ error: { code, message } }`를 돌려줍니다. 명령 팔레트에는 보이지 않습니다.

```ts
const r = await vscode.commands.executeCommand('tasksmd.api.query.run', { query: 'due today', limit: 20 });
await vscode.commands.executeCommand('tasksmd.api.edit.setStatus', { ref: { path: 'notes/todo.md', line: 12 }, symbol: 'x' });
```

keybindings.json:
```json
{ "key": "ctrl+alt+k", "command": "tasksmd.api.ui.openKanban", "args": { "savedQueryId": "this-week", "mode": "due" } }
```

| 명령 | 인자 |
|---|---|
| `tasksmd.api.query.run` | `{ query, source?, limit? }` |
| `tasksmd.api.query.explain` | `{ query, source? }` |
| `tasksmd.api.query.get` | `{ ref }` |
| `tasksmd.api.query.list` | `{ paths? }` |
| `tasksmd.api.query.saved` | 없음 |
| `tasksmd.api.edit.create` | `{ input, target? }` |
| `tasksmd.api.edit.update` | `{ ref, changes }` |
| `tasksmd.api.edit.setStatus` | `{ ref, symbol }` |
| `tasksmd.api.edit.toggle` / `remove` | `{ ref }` |
| `tasksmd.api.edit.postpone` | `{ ref, to }` |
| `tasksmd.api.edit.batch` | `{ ops }` |
| `tasksmd.api.ui.openEdit` / `reveal` | `{ ref? }` |
| `tasksmd.api.ui.openKanban` | `{ savedQueryId?, mode? }` |
| `tasksmd.api.ui.openCalendar` | `{ fullScreen? }` |
| `tasksmd.api.ui.openQueryResults` | `{ query, source? }` |

명령 경로의 호출자 ID는 `command`입니다(쓰기 정책에서 하나의 호출자로 취급).

## 4. 쓰기 정책과 안전장치

- 설정 `tasksmd.api.writePolicy`: `confirm`(기본) — 호출자마다 한 번 "허용 / 이번만 / 거부"를 묻고 허용은 `tasksmd.api.allowedWriters`(사용자 설정)에 기억. `allow` — 묻지 않음. `deny` — 모든 쓰기 `DENIED`.
- 신뢰되지 않은 워크스페이스에서는 쓰기가 `UNTRUSTED`로 거부됩니다. 읽기는 됩니다.
- 모든 쓰기는 출력 채널 "Tasks for Markdown"에 `api <호출자> <메서드> <경로>:<줄>` 형식으로 남습니다.
- 호출자 ID는 호출하는 쪽이 밝히는 값입니다. 설치된 확장의 표시 이름을 대화상자에 보여 주지만 위장을 막지는 못하므로, 민감한 워크스페이스에서는 `deny`를 쓰세요.

## 5. 오류 코드

| 코드 | 뜻 |
|---|---|
| `STALE_LINE` | `expectedText`와 실제 줄이 다름, 또는 인덱스와 파일이 어긋남. `details.expected/actual` |
| `NOT_FOUND` | 그 위치에 태스크가 없음 |
| `INVALID_QUERY` | 쿼리 파싱 오류. `details.errors` |
| `INVALID_ARGUMENT` | 인자 형식 오류(날짜 형식, 알 수 없는 상태 기호, 지원하지 않는 버전 등) |
| `UNTRUSTED` | 신뢰되지 않은 워크스페이스에서 쓰기 |
| `DENIED` | 쓰기 정책 또는 사용자가 거부 |
| `IO` | 파일 읽기·쓰기 실패, 워크스페이스 없음 |

## 6. 호환 정책

- `version: 1`. 필드·메서드 **추가**는 1을 유지합니다. 제거·의미 변경은 `getAPI(2)`를 추가하고 1을 최소 한 릴리스 동안 병행합니다.
- 변경은 CHANGELOG의 "API" 절에 적습니다.
- `__internal`(테스트용 내부 객체)과 `extendMarkdownIt`(마크다운 확장용)는 공개 API가 아닙니다.
