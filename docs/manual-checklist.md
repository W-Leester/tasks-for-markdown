# 수동 점검·사용자 작업 안내

docs/Tasks.md에 남아 있는 미체크 항목 중 자동 테스트로 대신할 수 없는 것들입니다. 각 항목마다 **무엇을, 어떻게, 어떤 결과가 나와야 정상인지**를 적었습니다. 확인한 항목은 맨 아래 결과 표에 날짜와 함께 적어 두면 됩니다.

준비물: 이 저장소를 연 VS Code 또는 Cursor, 최신 `.vsix` 설치(`pnpm package` → `code --install-extension …` 또는 `cursor --install-extension …`), 예시 노트 `examples/샘플-태스크.md`, `examples/쿼리-예시.md`.

---

## 2. 수동 테스트 (7개)

> **Cursor에서 `Cmd+K`로 시작하는 단축키는 쓰지 마세요.** Cursor는 `Cmd+K`를 AI 인라인 편집(입력 상자가 뜨는 것)에 쓰기 때문에, VS Code의 `Cmd+K Cmd+T`(색 테마), `Cmd+K V`(미리보기를 옆에 열기) 같은 두 단계 단축키가 동작하지 않습니다. 아래에서는 **명령 팔레트**(`Cmd/Ctrl+Shift+P`)로 같은 명령을 부릅니다. VS Code에서는 단축키도 그대로 됩니다.

### 2-1. 하이 컨트라스트 테마 점검

1. 명령 팔레트(`Cmd/Ctrl+Shift+P`) → `Preferences: Color Theme` → **Dark High Contrast** 선택. 나중에 **Light High Contrast**도 한 번. (VS Code에서는 `Cmd/Ctrl+K` 다음 `Cmd/Ctrl+T`도 됩니다.)
2. `examples/샘플-태스크.md`를 텍스트 편집기로 엽니다.
3. 볼 것:
   - 줄 끝 상대 날짜 장식("4일 지남" 등)과 기한 초과 줄 배경이 **읽히는지** (글자가 배경에 묻히지 않아야 함).
   - 명령 팔레트 → `Markdown: Open Preview to the Side`로 미리보기를 옆에 열어 뱃지·체크박스·쿼리 결과 카드가 보이는지.
   - `Ctrl+Shift+R` 렌더 보기, `Tasks: 칸반 보드 열기`, `Tasks: 캘린더 열기`, `Ctrl+Shift+C` 편집 대화상자 순서로 열어 테두리·포커스 링·버튼이 보이는지. 하이 컨트라스트에서는 테두리가 두껍고 뚜렷해야 정상입니다.
4. 문제가 보이면 어느 화면의 어떤 요소인지 스크린샷을 남겨 주세요. 색은 모두 `--vscode-*` 변수라 `package.json`의 `contributes.colors` hc 기본값만 고치면 됩니다.

### 2-2. Remote SSH / WSL / Codespaces

가진 환경 하나만 해도 됩니다.
1. 원격에 저장소(또는 아무 마크다운 폴더)를 두고 원격 창으로 엽니다. 확장은 **원격 쪽**에 설치되어야 합니다(확장 뷰에서 "Install in SSH: …" 버튼).
2. 볼 것: 사이드바 TASKS에 개수가 뜨는지(인덱싱), `Ctrl+Shift+Enter`로 완료 토글 시 파일이 실제로 바뀌는지, 렌더 보기와 칸반이 열리는지, 파일을 바깥에서 고쳤을 때(원격 셸에서 `echo "- [ ] new" >> 파일`) 사이드바가 갱신되는지.
3. 코드는 `workspace.fs`와 `Uri`만 쓰므로 원격에서도 같아야 합니다. 다르면 로그(`Tasks: 로그 보기`)를 붙여 주세요.

### 2-3. VS Code macOS / Windows / Linux 전 기능

한 플랫폼당 10분 정도의 훑기입니다. 순서대로:
1. `.vsix` 설치 → 창 리로드 → 사이드바 TASKS에 예시 태스크 개수가 뜨는지.
2. 에디터: 태스크 줄에서 `Ctrl+Shift+Enter` 완료 → `✅ 날짜`가 붙는지 → **`Cmd/Ctrl+Z`를 한 번** 눌러 원래 줄로 **한 번에** 돌아오는지(두 번 눌러야 하면 버그). 반복 태스크(`운동 #건강 🔁 every day when done`)에서도 완료 → 새 줄이 위에 생기고 `Cmd/Ctrl+Z` 한 번에 둘 다 사라지는지.
3. CodeLens: 커서 줄 위에 `✔ 완료 · 우선순위 ▾ · 📅 …` 렌즈가 뜨고 클릭이 되는지.
4. 자동완성: 새 줄에 `- [ ] 테스트 ` 입력 후 스페이스 → 제안 상자에 📅/⏫/🔁 항목, `due tom` 입력 시 내일 날짜 제안.
5. 미리보기(명령 팔레트 → `Markdown: Open Preview to the Side`)에 뱃지와 쿼리 결과가 보이는지, 링크 클릭이 파일을 여는지.
6. 칸반: 카드를 다른 컬럼으로 드래그 → 파일의 상태 기호가 바뀌는지. `Alt+←/→`도.
7. 캘린더: 항목을 다른 날로 드래그 → 📅 날짜가 바뀌는지. `⤢ 전체 화면`과 `Esc`.
8. 알림: 설정 `tasksmd.notifications.dailyTime`을 현재 시각 +1분으로 바꾸고 기다렸다가 토스트와 OS 알림이 오는지. Windows/Linux에서는 OS 알림(PowerShell 토스트 / `notify-send`)이 특히 확인 대상입니다.
9. 아카이브: `Tasks: 완료 태스크 아카이브…` → 미리보기 → 확인 → `Archive.md` 생성.
10. 업데이트 확인: `tasksmd.updateCheckUrl`에 `dist/latest.json`을 로컬 HTTP나 파일 경로로 주고 `Tasks: 업데이트 확인` 실행.
Windows에서는 키 표기가 `Ctrl+Shift+C`, `Ctrl+Shift+R`로 같고, 경로 구분자가 `\`라도 쿼리의 `path includes`가 `/`로 동작해야 합니다(내부에서 변환).

### 2-4. Cursor macOS / Windows

VS Code와 다른 부분만 봅니다.
1. `Ctrl+Shift+C`, `Ctrl+Shift+R`, `Ctrl+Shift+Enter`가 **Cursor의 기본 키와 충돌하지 않는지**: 텍스트 편집기, 렌더 보기, Cursor Preview 모드, 채팅 패널에 포커스가 있을 때 각각 눌러 엉뚱한 동작(다른 편집기 닫힘 등)이 없는지.
2. Cursor Preview 토글은 결과가 안 나오는 것이 정상입니다(설계상 불가). 대신 `Ctrl+Shift+R` 렌더 보기와 CodeLens `▷ 결과 보기`가 되는지.
3. 명령 팔레트 → `Markdown: Open Preview to the Side`로 연 표준 미리보기가 **빈 화면이 아닌지**. 예전에 비어 보이던 증상이 1.0.1 이후 사라졌는지 확인이 필요한 항목입니다. 비어 있으면 `Help: Toggle Developer Tools` 콘솔의 빨간 줄을 붙여 주세요.
4. Markdown All in One을 켠 상태와 끈 상태 모두에서 미리보기 뱃지가 보이는지.

### 2-5. 라이트 / 다크 / 하이 컨트라스트

2-1과 같은 화면을 **Light Modern**, **Dark Modern**에서도 한 번씩 봅니다(테마 바꾸기: 명령 팔레트 → `Preferences: Color Theme`). 특히 렌더 보기의 지난 마감(붉은색), 완료(흐린색), 배지 배경이 두 테마 모두에서 읽히는지. 캘린더 항목 색(파랑 마감 / 노랑 예정 / 초록 시작 / 빨강 초과)이 구분되는지.

### 2-6. 멀티 루트 워크스페이스, 신뢰되지 않은 워크스페이스

- 멀티 루트: `File › Add Folder to Workspace…`로 마크다운이 있는 폴더를 하나 더 추가. 사이드바에 두 폴더의 태스크가 모두 뜨고, 백링크·`path` 표시가 `폴더이름/파일.md`처럼 **폴더 이름이 앞에 붙어** 구분되는지. 쿼리 `folder includes <두 번째 폴더 이름>`이 그 폴더만 거르는지.
- 신뢰되지 않은 워크스페이스: `Workspaces: Manage Workspace Trust`에서 신뢰를 해제. 인덱싱·토글·미리보기는 그대로 되고, **JS 함수 쿼리(`filter by function`)·OS 알림·업데이트 확인만 꺼지는지**. `filter by function` 블록을 미리보기로 보면 "신뢰되지 않은 워크스페이스" 안내가 떠야 합니다.

### 2-7. Obsidian 볼트 샘플과 파싱 대조

1. 실제로 쓰는 Obsidian 볼트가 있으면 그 폴더를 VS Code로 엽니다(없으면 `examples/`로 대신).
2. Obsidian에서 ```tasks 블록이 있는 노트를 하나 골라, 같은 노트를 여기서 `Markdown: Open Preview to the Side`(명령 팔레트)나 `Ctrl+Shift+R`로 봅니다.
3. 대조할 것: 블록의 **일치 개수**("N of M tasks")와 **순서**가 Obsidian과 같은지, 각 태스크의 날짜·우선순위·반복 배지가 같은지, 여기서 완료 토글한 줄을 Obsidian에서 열었을 때 필드 순서(`🆔 ⛔ 우선순위 🔁 🏁 ➕ 🛫 ⏳ 📅 ❌ ✅`)가 Obsidian이 쓴 것과 같은지.
4. 다르면 그 태스크 줄 원문과 쿼리 텍스트를 그대로 붙여 주세요. `tests/core/query/obsidian-compat.test.ts`에 케이스로 추가해 고칩니다.

### 2-8. Claude Code에서 MCP 서버 시나리오

1. 저장소에서 `pnpm build:packages` 후 프로젝트 폴더(예: 이 저장소의 `examples`)에서
   ```bash
   claude mcp add tasks -- node /Users/leester/Desktop/Dev/Tasks-like-plugin/packages/cli/dist/tasksmd.cjs mcp --root "$PWD"
   ```
   npm 발행 후에는 `npx -y @hastycapybara/tasks-cli mcp --root "$PWD"`로 바꿉니다.
2. Claude Code를 열고 `/mcp`로 `tasks` 서버가 연결됐는지 확인합니다.
3. 시나리오 세 개를 말로 시킵니다. (a) "지난 마감 태스크를 마감일 순으로 보여줘" → `tasks_query` 호출, 결과가 `tasksmd query "not done\ndue before today\nsort by due"`와 같은지. (b) "계약서 검토를 완료 처리해" → `tasks_set_status`(승인 창 확인) 후 파일에 `✅ 오늘 날짜`가 붙는지. (c) "inbox.md에 '월간 결산' 태스크를 10월 5일 마감, 높은 우선순위로 추가해" → `tasks_create` 후 줄이 `- [ ] 월간 결산 ⏫ 📅 2026-10-05` 형식인지.
4. 편집기에서 같은 파일을 저장 안 한 채로 (b)를 시켜 보고 "덮어쓸까요?" 대화상자가 뜨는지도 봐 두면 좋습니다(알려진 제한).

---

## 3. 사용자 작업·결정 (3개)

### 3-1. Marketplace 퍼블리셔와 `VSCE_PAT`

1. https://marketplace.visualstudio.com/manage 에 Microsoft 계정으로 로그인 → **Create publisher** → ID `hastycapybara`(package.json의 `publisher`와 같아야 함), 표시 이름은 자유.
2. https://dev.azure.com 에서 아무 조직이나 하나 만든 뒤(없으면) 오른쪽 위 사용자 아이콘 → **Personal access tokens** → New Token. Organization은 **All accessible organizations**, Scopes는 **Custom defined** → **Marketplace: Manage**만 체크. 만료는 1년.
3. 토큰을 복사해 GitHub 저장소 → Settings → Secrets and variables → Actions → **New repository secret** → 이름 `VSCE_PAT`.
4. 확인: `git tag v1.0.8 && git push origin v1.0.8`을 푸시하면 Actions의 release 워크플로가 `.vsix`를 Release에 첨부하고, 토큰이 있으면 Marketplace에 게시합니다. 첫 게시 후 https://marketplace.visualstudio.com/items?itemName=HastyCapybara.tasks-for-markdown 에서 보입니다(반영까지 몇 분).

### 3-2. Open VSX와 `OVSX_PAT` (Cursor 사용자용)

Cursor의 확장 마켓은 Open VSX를 씁니다. 사내 `.vsix` 배포만 할 거면 건너뛰어도 됩니다.
1. https://open-vsx.org 에 GitHub 계정으로 로그인 → 프로필 → **Access Tokens** → Generate New Token.
2. 퍼블리셔 계약(Publisher Agreement)에 동의합니다(프로필 페이지에 버튼).
3. 네임스페이스 생성: 로컬에서 한 번만
   ```bash
   pnpm exec ovsx create-namespace hastycapybara -p <토큰>
   ```
4. GitHub Secrets에 `OVSX_PAT`로 저장. 이후 태그 푸시 때 자동 게시됩니다.

### 3-3. 저장소 public 전환 여부

- Marketplace/Open VSX 게시 자체는 저장소가 private이어도 됩니다. 다만 `package.json`의 `repository` 링크가 마켓 페이지에 노출되므로, private이면 사용자가 404를 봅니다.
- **public으로 하려면**: GitHub 저장소 → Settings → General → 맨 아래 Danger Zone → **Change visibility** → Public. 전환 전에 `git log -p | grep -i "token\|secret\|password"`로 비밀이 커밋된 적 없는지 한 번 확인하세요(이 저장소는 토큰을 코드에 두지 않습니다). NOTICE.md에 Obsidian Tasks MIT 고지가 있어 라이선스 요건은 충족합니다.
- **private 유지라면**: 사내 `.vsix` 배포(docs/release.md "사내 .vsix 배포")를 쓰고, `repository` 필드를 사내 위키 주소로 바꾸거나 지우는 것이 낫습니다. 결정만 알려 주시면 제가 반영합니다.

---

## 4. 나중 버전용 (1개) — 지금은 할 일 없음

VS Code 1.138에 들어온 내장 Markdown Editor(WYSIWYG)와 `markdown.codeBlockEditors` 확장 포인트를 쓰면 ```tasks 블록을 그 편집기 안에서 상호작용형으로 그릴 수 있습니다. Cursor가 그 VS Code 버전을 기반으로 올라오고 Cursor 자체 Preview 대신 이 편집기를 쓰게 되면 그때 검토합니다. 확인 방법: Cursor의 `Help › About`에서 VS Code 버전이 1.138 이상인지, 명령 팔레트에 "Markdown: Open with Markdown Editor"류 명령이 있는지.

---

## 5. 1.1.0 수동 점검 (M21·M23, 2026-10-07)

자동 테스트로 확인한 것: VS Code에서 서버 등록·실제 실행(MCP 응답), 설정 끄면 제거, 링크 열기·거부·`ui.link`, 설정 병합·런처 스크립트·명령 문자열(단위). **아래는 실제 에디터에서만 확인할 수 있는 것.**

1. [x] **Cursor 자동 등록** — Cursor에서 노트 폴더를 열고 *Cursor Settings → MCP*(또는 Tools & Integrations)에 확장이 등록한 `tasks` 서버가 보이는지, 에이전트 채팅에서 "오늘 마감인 태스크 알려 줘"가 도구를 쓰는지.
   - **결과(2026-10-07, Cursor, `examples` 폴더):** *Customize → MCPs*의 Connected에 `extension-tasks`(User, 12 tools, 1 resource, 초록). 설정 파일 수정·npm 없이 연결됨. 채팅 "미완료 태스크 중 마감일이 가장 가까운 것 3개" → 문법 안내 리소스를 먼저 읽고 `tasks_query`로 조회, "마감일 있는 미완료 15개 중" 3개를 정확히 답함. (MCP 목록 위치: 최근 Cursor는 *Cursor Settings* 왼쪽의 **Customize** → **MCPs** 탭)
2. [ ] **VS Code 에이전트 모드** — Copilot 채팅 에이전트 모드의 도구(🔧) 목록에 "Tasks for Markdown"이 있고, 처음 실행 허용 후 질문에 답하는지.
3. [x] **Claude Code 연결** — `Tasks: AI 에이전트 연결 (MCP)` → (설치돼 있으면 미리 체크됨) → 알림 확인 → 그 폴더에서 `claude mcp list`에 `tasks`가 보이는지, 새 세션에서 동작하는지.
   - **결과(10-08, Cursor, 저장소 폴더):** 첫 실행 AI 연결 알림의 Connect로 연결 → `claude mcp list`에 `tasks … mcp --root …/Tasks-like-plugin - ✔ Connected`(Cursor Helper (Plugin) + `~/.tasksmd/tasksmd.cjs`). Claude Code 세션에 `mcp__tasks__*` 도구가 나타나 `tasks_info`(1.1.0)·`tasks_query`(샘플 3개)가 정확히 동작.
4. [ ] **Claude Desktop 연결**(설치된 경우) — 같은 명령 → Claude Desktop → 확인 창 → 설정 파일에 `tasks` 추가·`.bak` 생성·다른 서버 유지 → Claude Desktop 재시작 후 동작.
   - **중간 결과(10-08):** 설정 파일에 `tasks` 추가·`.bak`·다른 키 보존까지 확인 → **5분 뒤 실행 중이던 Claude Desktop이 설정을 다시 써서 `tasks`가 사라짐**(incidents #32). 고친 뒤 다시 확인: Claude Desktop을 켠 채 연결 → "먼저 종료하세요 / 다시 시도" 창이 뜨는지, 종료 후 다시 시도 → 쓰기 → Claude Desktop을 열고 질문.
5. [x] **터미널 명령** — `Tasks: 'tasksmd' 터미널 명령 설치` → 새 터미널에서 `tasksmd --help`, `tasksmd query "not done" --root <노트 폴더>`. PATH 안내가 나오면 그 줄을 넣고 다시. `제거` 명령으로 지워지는지.
   - **결과(10-07, Cursor, 시작 안내 버튼):** `~/.tasksmd/`(cjs·runtime.json)와 `~/.local/bin/tasksmd`(Cursor Helper (Plugin)로 실행하는 런처) 생성. `~/.local/bin`이 이미 PATH에 있어 안내 없이 바로 사용. `examples`에서 `tasksmd query` → Cursor 에이전트와 같은 3개. (제거 명령은 아직)
6. [ ] **링크** — 태스크 줄에서 `Tasks: 태스크 링크 복사` → 브라우저 주소창이나 메모 앱에 붙여 넣고 누름 → 에디터가 그 줄로 이동. 쿼리 블록에서 `쿼리 링크 복사` → 결과 패널.
7. [x] **시작 안내** — 명령 팔레트 `Tasks: 시작 안내 열기`(VS Code는 `Welcome: Open Walkthrough…`로도) → "Tasks for Markdown 시작하기" 4단계와 버튼. (Cursor에는 `Welcome: Open Walkthrough…`가 없어 10-07에 이 명령을 추가)
   - **결과(10-07, VS Code·Cursor):** 4단계와 버튼 동작 확인(쿼리 블록 넣기·렌더 보기는 #28 수정 후 쓰던 노트에 동작). Cursor는 `Tasks: 시작 안내 열기`로.
8. [x] **첫 실행 안내** — (B) 첫째 날 시작 안내가 저절로 열림, 서로 다른 둘째·셋째 날 "시작 안내 열기 / 다시 보지 않기" 알림. (A) `tasksmd`가 없으면 켜질 때마다(다시 불러오기 포함) "'tasksmd' 명령 설치 / 나중에 / 다시 묻지 않기"(설치·다시 묻지 않기 전까지). (B)는 같은 날 다시 불러오면 안 뜸. (날짜 확인은 VS Code를 끄고 `state.vscdb`의 `onboarding.lastDay`·`onboarding.cliLastDay`를 어제로 바꿔서)
   - **결과(10-07, VS Code):** 첫째 날 시작 안내 자동 열림, 날짜를 하루 전으로 돌려 둘째 날 알림 확인, 설치 권유 알림 확인(사용자 "잘 됨"). 횟수는 창이 아니라 날짜 기준(점검 중 창 기준으로 14번 세어진 문제를 고침).
9. [x] **AI 연결 선택 창** — 입력란 안내 문구가 "Cursor: 자동으로 연결됨 · 추가로 연결할 대상을 고르세요", 목록은 Claude Code·Claude Desktop만. `tasksmd.mcp.autoRegister`를 끄면 안내가 "Cursor: 꺼짐 …"이고 "Cursor" 제목 아래 "자동 연결 다시 켜기"가 고를 수 있게 나옴. (10-07: 첫 수정의 상태 줄이 안 보여 다시 고침, incidents #31)
   - **결과(10-08, Cursor):** 켜진 상태 — 입력란 "Cursor: 자동으로 연결됨 · …", 목록은 Claude Code·Claude Desktop. 끈 상태 — 입력란 "Cursor: 꺼짐 …", "Cursor" 제목 아래 "자동 연결 다시 켜기" → 선택하면 알림, 설정 다시 켜짐, MCPs의 `extension-tasks` Connected로 복귀.
13. [x] **AI 연결 알림** — Claude Code·Desktop이 설치돼 있고 연결 안 됐을 때 켜질 때마다 "연결 / 나중에 / 다시 묻지 않기". "연결" → 아직 안 된 것만 연결(Desktop 확인 창 없음, `.bak` 생성). 연결된 뒤에는 안 뜸.
   - **결과(10-08, Cursor):** 알림의 Connect 한 번으로 Claude Code·Claude Desktop 연결(아래 4번 참고).
10. [x] **제거** — `Tasks: 'tasksmd' 터미널 명령 제거` → `~/.local/bin/tasksmd` 삭제, 다른 프로그램이면 건드리지 않음.
   - **결과(10-08):** 제거 → `tasksmd` 없음 → 다시 설치 → `~/.local/bin/tasksmd`(새 이름 주석) 정상.
11. [ ] **원격(SSH)** — 원격 폴더에서 Cursor 자동 연결(원격 쪽 서버), 원격 터미널에서 `tasksmd`.
12. [ ] **Windows**(가능하면) — 런처 `tasksmd.cmd`, PATH 안내, Claude Desktop 경로(`%APPDATA%\Claude`). 확인 전까지 알려진 한계.

## 결과 기록

| 항목 | 환경 | 날짜 | 결과 | 메모 |
|---|---|---|---|---|
| 2-1 하이 컨트라스트 | | | | |
| 2-2 원격 | Cursor macOS → Remote SSH(localhost) | 2026-10-01 | ✅ 통과 | 원격 쪽 설치, 인덱싱·사이드바, 렌더 보기, 칸반 정상. 바깥 수정 반영은 저장 안 된 편집기 때문에 한 번 헷갈렸으나 원격 문제 아님 |
| 2-3 VS Code macOS | VS Code macOS, `.vsix` 설치 | 2026-10-01 | ✅ 통과 | 사이드바, `Ctrl+Shift+Enter` 토글·되돌리기, 반복, 편집 대화상자, 렌더 보기(버튼·메모·열), 미리보기 쿼리, 칸반·캘린더. 칸반 열이 좁다는 의견 → 격자 배치로 개선(M19) |
| 2-3 VS Code Windows | | | | |
| 2-3 VS Code Linux | | | | |
| 2-4 Cursor macOS | | | | |
| 2-4 Cursor Windows | | | | |
| 2-5 라이트/다크 | Cursor macOS | 2026-10-01 | ✅ 통과 | 하이 컨트라스트 포함 |
| 2-6 멀티 루트 / 비신뢰 | | | | |
| 2-7 Obsidian 대조 | | | | |
| 2-8 MCP (Claude Code) | macOS, 저장소 빌드 CLI | 2026-10-01 | ✅ 통과 | 조회·완료 처리·메모 추가·마감일 필수 거절. 처음에 옛 Claude Code 버전 오류가 났으나 재실행으로 해결(확장 문제 아님) |
| 3-1 VSCE_PAT | | | | |
| 3-2 OVSX_PAT | | | | |
| 3-3 공개 여부 | | | | |
