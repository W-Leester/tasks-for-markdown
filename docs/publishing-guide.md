# VS Code 확장 배포 가이드라인

VS Code 확장을 **VS Code Marketplace**, **Open VSX**(Cursor·VSCodium 등이 쓰는 마켓), **npm**에 처음 공개할 때 해야 하는 일을 **화면 하나, 입력칸 하나 단위로** 정리한 문서입니다. Tasks for Markdown 1.0.0을 공개하며(2026-09-30 ~ 10-03) 실제로 겪은 일을 그대로 적었고, **다른 확장을 낼 때도 그대로 따라 할 수 있게** 일반적인 형태로 썼습니다. 예시 값은 이 프로젝트의 것입니다(`HastyCapybara`, `tasks-for-markdown`, `W-Leester`).

- 이 프로젝트의 현재 상태, 토큰 만료일, 남은 일은 [release.md](release.md)에 있습니다.
- 겪은 실패와 원인은 [postmortems/](postmortems/README.md)에 있습니다.

**목차**
0. [먼저 알아 둘 것](#0-먼저-알아-둘-것) — 마켓 세 곳의 차이, 확인(심사) 방식, 전체 순서와 시간
1. [먼저 정할 것](#1-먼저-정할-것) — 버전, 이름, 언어
2. [패키지 준비](#2-패키지-준비) — package.json, 아이콘, README, 포함 파일
3. [공개 전 점검](#3-공개-전-점검)
4. [계정과 토큰](#4-계정과-토큰) — Marketplace, Open VSX, npm, GitHub (입력칸별)
5. [게시](#5-게시) — 순서, 업로드, 소유권 신청, 태그, 확인
6. [공개 후](#6-공개-후) — 설치본 교체, Trusted Publishing 전환
7. [다음 버전 내는 법](#7-다음-버전-내는-법)
8. [이번 공개에 실제로 걸린 시간](#8-이번-공개에-실제로-걸린-시간)
9. [한 장 체크리스트](#9-한-장-체크리스트)

---

## 0. 먼저 알아 둘 것

### 0.1 편집기마다 확장을 받아 오는 마켓이 다르다

| 편집기 | 확장 마켓 | 운영 | 게시 방법 |
|---|---|---|---|
| **VS Code** | **VS Code Marketplace** | Microsoft | 웹 업로드 또는 `vsce publish` |
| **Cursor**, VSCodium, Gitpod 등 VS Code 계열 | **Open VSX** | Eclipse 재단 | `ovsx publish` |
| (선택) 터미널·다른 프로그램 | **npm** | GitHub(npm, Inc.) | `npm publish` / `pnpm publish` |

- Cursor는 VS Code를 바탕으로 만들었지만 **Microsoft 제품이 아니라서 VS Code Marketplace를 쓸 수 없다**(Marketplace 이용 약관이 Microsoft 제품으로 한정). 그래서 **VS Code Marketplace에 올려도 Cursor에는 나오지 않는다.** 두 마켓에 따로 올려야 한다.
- npm은 확장과 별개다. 확장 기능에는 필요 없고, 에디터 밖에서 쓰는 도구(CLI, AI 연결용 MCP 서버, 라이브러리, 타입)가 있을 때만 올린다. 확장 사용자가 npm을 설치할 필요는 없다.

### 0.2 마켓마다 "확인(심사)"하는 대상과 방식이 다르다

| | VS Code Marketplace | Open VSX | npm |
|---|---|---|---|
| **확장(패키지)마다 하는 확인** | **매 업로드마다 자동 검사**. 이번엔 약 8분. 검사가 끝나기 전에는 페이지가 404이고 검색에 안 나온다. 정보(검색어 등)가 의심스러우면 거절("suspicious content") | 거의 없음. 올리면 바로 등록 | 없음(단계적 게시를 쓰면 사람이 승인) |
| **게시자(이름)에 대한 확인** | 없음. 퍼블리셔를 만들면 바로 그 이름으로 게시 가능. (선택) 도메인 인증 → 파란 체크 배지 | **이름(네임스페이스)마다 처음 한 번, 사람이 확인.** 그 이름을 쓸 자격이 있는지 본다. 승인 전에는 올린 확장이 **비활성(숨김)**. 승인까지 며칠 | 없음. 계정 이름 = 스코프 |
| **왜** | 악성 확장 차단 | 누구나 아무 이름으로 올릴 수 있는 공개 저장소라, 유명 회사·다른 개발자 **사칭**을 막으려고 | — |
| **두 번째 버전부터** | 매번 자동 검사(몇 분) | **기다림 없이 바로** 게시 | 바로 |

정리하면: **VS Code Marketplace는 "매번 짧게", Open VSX는 "처음 한 번 길게"** 확인한다. 첫 공개 때 Cursor 쪽이 늦게 나오는 이유가 이것이다.

### 0.3 전체 순서와 시간

| 단계 | 할 일 | 이번에 걸린 시간 | 되돌릴 수 있나 |
|---|---|---|---|
| 1. 결정 | 버전 번호, 이름 표기, 마켓 페이지 언어, npm 공개 여부 | 30분 | 게시 전까지는 가능 |
| 2. 패키지 준비 | 아이콘, README·스크린샷, 소개문, 검색어, 포함 파일 | 반나절 | 가능 |
| 3. 점검 | 자동 테스트 + VS Code·Cursor 수동 점검 | 반나절 | — |
| 4. 계정·토큰 | Marketplace 퍼블리셔, Open VSX(Eclipse 계정·동의서·네임스페이스), npm(2단계 인증·토큰), GitHub Secrets | 2시간 | **퍼블리셔 ID·npm 이름은 바꿀 수 없음** |
| 5. 공개 | 저장소 공개 → Marketplace 업로드 → Open VSX 소유권 신청 → 태그로 Open VSX·npm 게시 | 업로드 거절 대응 포함 하루 반 | **같은 버전 번호는 다시 올릴 수 없음** |
| 6. 공개 후 | Open VSX 승인 대기, 설치본 교체, Trusted Publishing 전환 | 며칠(대기) | — |

**가장 중요한 원칙 세 가지.**
1. **한 번 게시한 버전 번호는 다시 쓸 수 없다.** 여러 마켓에 같은 번호를 올릴 때는 **가장 까다로운 곳(VS Code Marketplace)부터** 통과시키고, 그다음 나머지를 올린다.
2. **이름과 ID는 게시하면 바꿀 수 없다.** 퍼블리셔 ID, 확장 이름, npm 이름은 1단계에서 확정한다.
3. **토큰·복구 코드는 어디에도 남기지 않는다.** 만들자마자 GitHub Secret에 붙여 넣는다. 캡처를 공유할 때는 가린다.

---

## 1. 먼저 정할 것

### 1.1 버전 번호
- 첫 공개를 `1.0.0`으로 시작할지, 내부에서 쓰던 번호를 이어 갈지 정한다.
- 내부 `.vsix`로 배포한 적이 있는데 1.0.0으로 내리면 **번호가 뒤로 가서** 내부 사용자의 업데이트 알림이 끊긴다 → 마켓 설치로 옮기도록 안내한다.
- 공개 전 내부 이력은 별도 문서(이 프로젝트는 [history-internal.md](history-internal.md))로 옮기고, CHANGELOG는 첫 공개 버전부터 시작한다.
- 확장과 npm 패키지의 버전은 같은 번호로 맞춘다(CLI가 보고하는 버전도 패키지 버전을 따른다).

### 1.2 이름 표기 (가장 헷갈리는 부분)

| 이름 | 어디에 보이나 | 규칙 | 예 |
|---|---|---|---|
| **퍼블리셔 ID** (`package.json`의 `publisher`) | 확장 ID 앞부분. `.vsix`로 설치하면 확장 화면에 **그대로** 보인다 | 대소문자 섞어도 됨. **게시 후 변경 불가.** VS Code는 대소문자를 구분하지 않는다 | `HastyCapybara` |
| **퍼블리셔 표시 이름** | 마켓 페이지, 마켓에서 설치한 확장 화면 | 자유. ID와 같게 두면 혼란이 적다 | `HastyCapybara` |
| **확장 ID** | 설치 명령, 다른 확장의 API 호출 | `퍼블리셔.이름` | `HastyCapybara.tasks-for-markdown` |
| **Open VSX 네임스페이스** | Open VSX 주소 | **퍼블리셔 ID와 똑같은 표기**로 만든다 | `HastyCapybara` |
| **npm 사용자 이름 = 스코프** | `@스코프/패키지` | **소문자만.** 사용자 이름과 조직 이름은 같은 이름을 공유할 수 없다 | `@hastycapybara/tasks-cli` |
| 작성자 표기(LICENSE, `author`) | 문서 | 자유 | `HastyCapybara (W.Leester)` |

> `.vsix`로 설치한 확장 화면에는 표시 이름이 아니라 **퍼블리셔 ID**가 보인다. 화면에 보이는 대소문자를 바꾸고 싶다면 ID 자체를 바꿔야 한다(게시 전에만 가능).

### 1.3 마켓 페이지 언어
- Marketplace·Open VSX·npm은 모두 `README.md` 하나만 보여 준다(언어별 README 없음). 해외 사용자가 대상이면 **README.md는 영어**로, 다른 언어는 `README.ko.md`처럼 별도 파일로 두고 맨 위에서 서로 연결한다.
- **npm 패키지 README(`packages/*/README.md`)도 같은 규칙.** 이번에 확장 README만 영어로 바꾸고 npm README 두 개를 한국어로 게시했다(→ [실패 사례 20](postmortems/incidents.md)). npm 페이지의 README는 **새 버전을 게시해야** 바뀐다.
- 명령 이름·설정 설명은 `package.nls.json`(기본 = **영어만**)과 `package.nls.ko.json`(한국어)으로 나눈다. 기본 파일에 한국어를 섞으면 영어 화면 사용자에게 한국어가 보인다 → 테스트로 고정.
- 짧은 소개문(`description`)도 `"%extension.description%"`처럼 번역 키로 두면 화면 언어를 따른다. 마켓 페이지에는 기본(영어) 값이 쓰인다.
- 확장 상세 페이지의 **Details 탭(README)은 화면 언어와 상관없이 README.md**가 나온다. **Features 탭**(명령·설정 목록)은 화면 언어를 따른다. 언어 팩은 설치만으로 적용되지 않는다: `Configure Display Language` → 재시작.

### 1.4 npm 패키지를 낼지
- 확장 기능에는 필요 없다. CLI·MCP 서버·라이브러리·API 타입을 다른 사람이 쓰게 하려면 낸다.
- 낸다면 확장과 같은 날 같은 버전으로 낸다(태그 하나로 자동 게시).

---

## 2. 패키지 준비

### 2.1 `package.json` 필수·권장 항목

| 항목 | 권장 | 이번 값 |
|---|---|---|
| `publisher`, `name`, `displayName`, `version` | 1.2의 규칙대로 | `HastyCapybara`, `tasks-for-markdown`, `Tasks for Markdown`, `1.0.0` |
| `description` | 한 문장, 기능 위주. 번역 키 가능 | `%tasksmd.description%` |
| `icon` | **PNG**(SVG 불가), 정사각형 128×128 이상(256 권장), 모서리 투명. 밝은·어두운 배경 둘 다 확인 | `media/icon.png` 256×256 |
| `galleryBanner` | 마켓 페이지 머리 색 | `#171d35`, `dark` |
| `categories` | 실제로 맞는 것만 | `Other`, `Visualization` |
| `keywords` | **적게, 일반 단어만.** 다른 유명 확장 이름과 같은 단어(`kanban`, `calendar`, `checklist`, `gtd`)를 넣었다가 **업로드 거절** → [포스트모템](postmortems/2026-10-01-marketplace-upload-rejected.md). 바꾸면 업로드로 확인 | `markdown, tasks, todo, productivity, recurring, dataview, mcp` |
| `repository`, `homepage`, `bugs` | **공개** 저장소 주소. 비공개면 마켓 페이지의 링크·이미지가 404 | GitHub |
| `license` | `LICENSE` 파일과 일치 | `MIT` |
| `engines.vscode` | 실제로 테스트한 최소 버전 | `^1.90.0` |

### 2.2 아이콘
- 디자인 원본(예: 2816×1536 배경 포함 이미지)을 받으면 **배경을 빼고 아이콘 부분만 잘라** 정사각형 PNG로 만든다. 둥근 모서리는 투명 마스크로.
- 원본 파일은 저장소에 두더라도 **설치 파일에서는 뺀다**(`.vscodeignore`). 큰 원본이 설치 파일 크기를 키운다.
- 32·64·128px로 줄였을 때도 알아볼 수 있는지 본다. 작은 글씨·워터마크는 작은 크기에서 얼룩처럼 보인다.

### 2.3 README
- 맨 위: 무엇을 하는 확장인지 한 문단 + **스크린샷 1장 이상**. 다른 언어 README 링크.
- **이미지는 PNG/GIF만.** Marketplace는 README 안의 SVG 이미지를 거부한다(배지 서비스 제외).
- 상대 경로 이미지·링크는 `vsce`가 저장소 주소로 바꿔 준다 → **저장소가 공개돼 있어야** 보인다.
- 다른 프로젝트의 코드·설계를 가져왔다면 `NOTICE.md`(법적 고지)와 README의 감사의 말을 함께 둔다. 원작자·후원 링크, "원본도 써 보세요", **"관련 없음·보증받지 않음" 문구**. 원작 로고·이름을 자기 것처럼 쓰지 않는다. (원작 이름을 소개문·README에 쓰는 것은 마켓 검사를 통과했다.)
- 단축키 안내에는 명령 팔레트 이름도 함께 적는다(Cursor처럼 키가 다른 편집기 대비).

### 2.4 설치 파일에 들어가는 것 (`.vscodeignore`)
- **허용 목록처럼** 생각한다: 실행에 필요한 `dist/`, `media/`(아이콘·CSS), 번역 파일, README·CHANGELOG·LICENSE·NOTICE.
- 빼야 하는 것: 소스, 테스트, `docs/`, 소스맵(`*.map`), 예시·샘플 파일(개인 노트가 섞여 들어간 적 있음), 원본 디자인 파일, **다른 `.vsix`·`.zip`**(폴더에 남아 있다가 통째로 들어가 600KB → 1.17MB가 된 적 있음), `.env`나 설정 파일.
- 확인: `pnpm package` 후 `unzip -l <파일>.vsix`로 목록·크기를 본다. 크기가 갑자기 늘면 원인을 찾는다.
- `vsce`(3.x)는 포장할 때 비밀 값 검사(secretlint)를 한다. 통과해도 Marketplace는 따로 검사한다.

### 2.5 코드에서 조심할 것
- **외부 프로그램 실행**(`child_process`로 셸·PowerShell 실행)과 **마켓 밖 자체 업데이트**는 악성 확장의 전형적인 패턴이라 오해받기 쉽다. (이번 거절의 원인은 아니었다.)
- 사용자 코드를 실행하는 기능(`new Function` 등)은 신뢰되지 않은 워크스페이스에서 꺼지도록 `capabilities.untrustedWorkspaces`에 적는다.

---

## 3. 공개 전 점검

### 3.1 자동 검사
- 타입 검사, 린트, 단위 테스트, 웹뷰 테스트, **실제 VS Code를 띄우는 통합 테스트**.
- 워크스페이스 구성(패키지 추가)을 바꿨다면 `pnpm install --frozen-lockfile`이 통과하는지 로컬에서 확인(CI가 이걸로 설치한다).
- CI에서 통합 테스트는 헤드리스 VS Code가 가끔 시작 중에 멈춘다(`CodeWindow: detected unresponsive`) → **한 번 재시도**하게 해 둔다.

### 3.2 수동 점검 (실제 에디터에서)
점검표(이 프로젝트는 [manual-checklist.md](manual-checklist.md))를 만들고 결과를 날짜와 함께 기록한다.
- **VS Code와 Cursor 둘 다.** 마켓 사용자는 VS Code가 더 많다.
- **같은 `.vsix`로 설치해서** 본다(`code --install-extension <파일> --force`, Cursor는 `cursor --install-extension`). 설치 후 `Developer: Reload Window`.
- **단축키 충돌**
  - Cursor 예약 키: `Cmd+K`(AI 인라인 편집 → `Cmd+K`로 시작하는 두 단계 단축키 전부 동작 안 함), `Cmd+L`, `Cmd+I`, `Cmd+Shift+V`(자체 미리보기 토글).
  - 인기 확장도 같은 키를 쓴다(예: Markdown All in One은 마크다운에서 `Cmd/Ctrl+Enter`, `Alt+C`, `Tab`, `Alt+↑/↓` 등 22개 키를 씀). 두 확장이 같은 키를 쓰면 **어느 쪽이 이길지 코드로 추측하지 말고** 명령 팔레트 → `Developer: Toggle Keyboard Shortcuts Troubleshooting`을 켠 채 눌러 보고 Output에 찍힌 `matched …`를 확인한다. 의심 가는 확장을 잠깐 꺼(Disable) 보면 원인이 분리된다.
  - 새 키 후보가 비어 있는지: 에디터 번들(키 코드 숫자), 설치된 확장들의 `package.json`, 인기 확장의 키 목록을 함께 검색. (이번 최종 키 `Ctrl+Shift+Enter`는 macOS에서 비어 있었다.)
- **원격(Remote SSH)**: Mac 한 대로도 된다 — 시스템 설정 › 일반 › 공유 › **원격 로그인** 켜기 → Cursor `Remote-SSH: Connect to Host…` → `<내 사용자 이름>@localhost`(오타 주의) → 플랫폼 `macOS` → 지문 질문 `Yes` → Mac 비밀번호. 원격 창에 확장을 **따로 설치**(`Install from VSIX…`). 바깥 수정 반영 시험은 **편집기에 열지 않은 파일**로. 끝나면 원격 로그인 끈다.
- **테마**: `Preferences: Color Theme`으로 밝게·어둡게·하이 컨트라스트(하이 컨트라스트는 포커스에 주황 테두리가 생기는 게 정상).
- **화면 언어**: 영어와 한국어(1.3).
- **CLI·MCP**: 복사본 폴더에서 `claude mcp add …`로 연결해 조회·완료·메모·규칙(마감일 필수) 시나리오를 말로 시켜 본다. 오래된 Claude Code 버전 오류가 나면 재실행.

---

## 4. 계정과 토큰

> **토큰 다루는 법.** 토큰은 발급 화면에서 **한 번만** 보인다. 메모장·메모 앱·프로젝트 파일·대화창에 남기지 말고, 브라우저 새 탭에 GitHub Secret 화면을 열어 둔 채 **발급 즉시 붙여 넣는다.** 잠깐 둘 곳이 필요하면 저장하지 않는 텍스트 편집기 창을 쓰고 닫을 때 "저장 안 함". 보관이 필요하면 비밀번호 관리자.

### 4.1 VS Code Marketplace 퍼블리셔
1. https://marketplace.visualstudio.com/manage → Microsoft 계정으로 로그인 → **Create Publisher**.

   | 칸 | 입력 |
   |---|---|
   | Name | 표시 이름(예 `HastyCapybara`) |
   | ID | **퍼블리셔 ID, `package.json`의 `publisher`와 대소문자까지 동일**(예 `HastyCapybara`). 변경 불가 |
   | Verified domain | 비워 둔다(나중에 가능, 6.4) |
   | Description | 선택. 퍼블리셔 전체 소개(예 "Tools for Markdown task management in VS Code and Cursor.") |
   | Logo | 선택. 아이콘 PNG |
   | Company website | 선택(예 `https://hastycapybara.com`) |
   | Support | 선택. 공개 저장소의 Issues 주소나 이메일 |
   | Source code repository | 선택. 퍼블리셔 전체 정보라 개인 GitHub 프로필이 더 맞을 수 있다 |

2. **토큰(PAT)은 받지 않고 웹 업로드를 쓴다.** PAT는 Azure DevOps 조직이 필요한데, 조직을 만들 때 **Azure 구독(결제 계정) 연결을 요구**한다(2026-10 기준). 그 화면이 나오면 **Continue를 누르지 말고 닫는다.** 나중에 구독이 생기면 PAT(Organization: *All accessible organizations*, Scope: *Custom defined › Marketplace › Manage*)를 만들어 `VSCE_PAT`로 등록하면 자동 게시가 된다.
3. **12시간 생성 한도**: 짧은 시간에 확장을 많이 만들면 "You have exceeded the maximum number of extensions that can be created in 12 hour(s)"로 막힌다. 시험 업로드를 남발하지 않는다.

### 4.2 Open VSX (Cursor·VSCodium)
1. https://open-vsx.org → **Log in** → GitHub 계정으로 로그인.
2. **Eclipse 계정 만들기** (프로필에서 연결하려 하면 Eclipse 로그인으로 넘어간다. 없으면 *Create account*):

   | 칸 | 입력 |
   |---|---|
   | Email | 공개될 수 있음(Eclipse 커뮤니티는 이메일·이름이 다른 사람에게 보일 수 있다) |
   | Username | **영문·숫자만**(하이픈 불가) |
   | First / Last name | 실명(동의서는 법적 서약) |
   | Employment status | 개인이면 **Self-employed** |
   | Country | 거주 국가 |

   이메일 인증 → Eclipse 프로필 편집(https://accounts.eclipse.org/user/edit)에서 **GitHub Username**에 Open VSX에 로그인한 GitHub 아이디(예 `W-Leester`)를 넣고 저장.
   - Eclipse 사이트 상단의 빨간 **Eclipse Contributor Agreement(ECA)** 경고는 Eclipse 프로젝트에 코드 기여할 때 필요한 것이라 **무시**한다.
3. **Open VSX 프로필 → Eclipse 계정 연결 → Publisher Agreement 동의.** 프로필에 "Publisher Agreement signed"가 보이면 끝. 서명 전에는 *Access Tokens*에 "Publisher agreement required"가 뜨고 토큰을 만들 수 없다.
4. **네임스페이스 만들기**: 왼쪽 *NAMESPACES* 옆 `+` → 퍼블리셔 ID와 같은 표기(예 `HastyCapybara`). 만들면 ⚠ "Namespace not verified"가 뜬다 → 5.3에서 소유권 신청.
5. **토큰**: *Access Tokens → Generate new token*(설명 예 `tasks-for-markdown github release`) → 바로 GitHub Secret `OVSX_PAT`에.
   - *Trusted Publishers*(토큰 없는 게시)는 네임스페이스 승인 뒤로 미룬다(6.3).

### 4.3 npm
1. https://www.npmjs.com → **Sign Up**.

   | 칸 | 입력 |
   |---|---|
   | Username | **원하는 스코프와 같은 소문자 이름**(예 `hastycapybara`). 이러면 `@hastycapybara/…`로 바로 올릴 수 있고 조직이 필요 없다 |
   | Email | **패키지 정보에 공개된다** |
   | Password | 10자 이상 |

2. 가입 후 나오는 **Create a New Organization** 화면은 **아무것도 누르지 않고 나간다.** "Convert @… into an org"도 하지 않는다(개인 계정이 조직으로 바뀌어 관리가 복잡해진다).
3. **2단계 인증**: 노란 배너 *Configure 2FA* → 보안 키(패스키) 이름 입력(예 `MacBook Touch ID`) → 패스키 저장 위치는 **iCloud 키체인**(Apple 기기 동기화) 또는 **Google 비밀번호 관리자**(여러 OS). "내 Chrome 프로필"·USB 키는 기기를 바꾸면 못 쓴다 → **복구 코드를 Download해서 비밀번호 관리자에 보관** → 체크 → 완료. *Require two-factor authentication for write actions*는 켠 그대로.
   - 복구 코드가 캡처 등으로 노출됐다면 *Account › Two-Factor Authentication › Manage Recovery Codes*에서 재발급.
4. **첫 게시용 토큰**: 왼쪽 메뉴 *Access Tokens*(아바타는 창이 좁으면 안 보일 수 있다) → *Generate New Token › Granular Access Token*.

   | 칸 | 입력 |
   |---|---|
   | Token name | `github-release` |
   | Description | 선택 |
   | **Bypass two-factor authentication (2FA)** | ☑ (자동 게시는 사람이 패스키를 누를 수 없어서). "security risks" 경고는 정상 — 첫 게시 뒤 Trusted Publishing으로 바꾼다 |
   | Allowed IP ranges | 비움 |
   | Packages and scopes › Permissions | **Read and write (publish and stage)**, 대상 **All packages**(첫 게시 전엔 고를 패키지가 없음) |
   | Organizations | No access |
   | Expiration | 쓰기 토큰 최대(90일). **만료일을 달력에** |

   → *Generate token* → 바로 GitHub Secret `NPM_TOKEN`에.
5. **Trusted Publishing은 이미 존재하는 패키지에만** 설정할 수 있다 → 첫 게시는 토큰으로, 직후 전환(6.2).

### 4.4 GitHub
1. **저장소 공개 전 점검**: 파일과 **커밋 이력 전체**에서 토큰·키를 찾는다(`git log --all -p | grep -E 'ghp_|npm_|AKIA|BEGIN .*PRIVATE KEY|xox[bp]-'` 등). 커밋 작성자 이메일이 공개된다는 점을 확인한다.
2. **Secrets 등록**: 저장소 *Settings › Secrets and variables › Actions › New repository secret*. 이름은 워크플로와 **정확히** 같게(`OVSX_PAT`, `NPM_TOKEN`, 있으면 `VSCE_PAT`). 저장소가 비공개여도 등록할 수 있다. 확인: `gh secret list -R <owner>/<repo>`(이름만 보임).
3. **저장소 공개**: *Settings › General › Danger Zone › Change repository visibility › Make public* → 저장소 이름 입력해 확인. 공개해야 마켓 README의 이미지·링크가 보이고, Open VSX 소유권 근거가 된다.

---

## 5. 게시

### 5.1 순서 (중요)
1. **저장소 공개**(4.4).
2. **VS Code Marketplace 웹 업로드**(5.2) — 가장 엄격한 검사. 실패하면 아직 다른 마켓에 같은 번호를 올리지 않았으니 고쳐서 다시 올리면 된다.
3. **Marketplace 반영 확인**(5.5) — 페이지가 열리고 검색에 나올 때까지(이번 약 8분).
4. **Open VSX 소유권 신청**(5.3) — Marketplace 페이지가 열린 뒤.
   - **가능하면 승인(`granted`)을 받은 뒤에 태그를 올린다.** 승인 전에 게시한 버전은 승인 후에도 **그 버전에 한해** Open VSX 페이지에 주황색 경고("published by … not a verified publisher of the namespace")가 남는다(버전마다 게시 시점의 검증 여부가 기록되고, 이미 게시한 버전은 다시 올릴 수 없다). 이번 1.0.0이 이 경우 → 다음 버전부터 경고가 사라진다. 승인이 며칠 걸리면 그동안 npm만 먼저 내고 싶어도 태그 하나로 함께 게시되므로, 태그 자체를 승인 뒤로 미루는 편이 간단하다.
5. **태그 푸시**(5.4) → 자동 배포가 Open VSX·npm에 게시.
6. **Open VSX 승인 → Cursor 반영**(6.1).

### 5.2 VS Code Marketplace 웹 업로드
1. `pnpm package`로 만든 `.vsix`를 준비(점검한 바로 그 파일).
2. https://marketplace.visualstudio.com/manage → 퍼블리셔 선택 → **+ New extension → Visual Studio Code** → `.vsix` 끌어다 놓기 → **Upload**.
3. 목록에 나타나고 상태가 검사 중 → 공개로 바뀐다(몇 분).
4. **거절될 때**
   - **"Your extension has suspicious content. Please fix your extension metadata"**: 이유를 알려 주지 않는다. **추측으로 기능을 지우지 말고** 반씩 나눠 시험한다.
     1. "코드 전체 + 정보 최소(짧은 소개·검색어 3개·짧은 README)" / "최소 확장(hello)" → 코드·계정 문제인지 가른다.
     2. "실제 문서만" / "실제 소개문·검색어·배너만" → 정보 중 어느 묶음인지.
     3. 그 묶음을 다시 반으로, 마지막엔 한 단어씩.
     - 시험 확장은 **시험용 이름**(예 `tfm-kw-test`)과 "Upload test, will be removed" 설명으로 올리고, 통과하면 바로 *… → Remove*. **12시간 생성 한도**를 염두에 두고 한 번에 몇 개씩만.
     - 그래도 모르면 vsmarketplace@microsoft.com / https://aka.ms/marketplacepublishersupport 에 확장 ID, 오류 문구, 시험 결과를 보낸다.
   - **"maximum number of extensions … in 12 hour(s)"**: 기다린다. 그 사이 재시도하지 않는다.

### 5.3 Open VSX 네임스페이스 소유권 신청
1. open-vsx.org → 아바타 → Settings → 네임스페이스 → **Claim Ownership** → GitHub 저장소 `EclipseFdn/open-vsx.org`의 이슈 양식이 열린다.
2. 양식:

   | 항목 | 설정 |
   |---|---|
   | Title / Namespace | 미리 채워짐(예 ``Claiming namespace `HastyCapybara` ``) |
   | Ownership | ☑ (그 이름을 아무도 갖고 있지 않음) |
   | Account Age | ☑ (GitHub 계정 12개월 이상 — `gh api users/<아이디> --jq .created_at`로 확인) |
   | **Option 1 — VS Code Publisher with Repo** | ☑ 위쪽 체크박스. 아래 하위 항목은 **비활성이라 체크되지 않는다** → Claim evidence에 글로 적는다 |
   | Option 2·3·4 | 비움. Option 4는 "앞 세 가지가 안 될 때"용, 가장 오래 걸림 |
   | **Claim evidence** | 원래 안내 문구를 **모두 지우고** 아래처럼 |

   ```
   Option 1: the namespace HastyCapybara is also my publisher on the VS Code Marketplace, and the extension's repository (set in its package.json) is owned by the GitHub account making this request (W-Leester).

   VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=HastyCapybara.tasks-for-markdown
   Publisher: https://marketplace.visualstudio.com/publishers/HastyCapybara
   Repository (owned by W-Leester): https://github.com/W-Leester/tasks-for-markdown
   ```
3. **Create** 전에 세 링크가 모두 열리는지 확인(Marketplace 업로드·저장소 공개 뒤). "potential duplicates" 안내는 다른 사람 신청이라 무시.
4. 만든 이슈에서 오른쪽 **Subscribe**를 눌러야 답변 메일이 온다(기본은 꺼져 있다).
5. **한 번만 제출한다.** 실수로 두 번 내면 하나는 중복으로 닫힌다(이번에 #13674가 "Dup of …"로 닫혔고 #13675가 승인됨).
6. 승인되면 이슈에 **`granted` 라벨**이 붙고 닫힌다(운영자 댓글이 없을 수도 있다). 이번 신청: https://github.com/EclipseFdn/open-vsx.org/issues/13675 — 제출 후 **약 9시간 만에 승인**.

### 5.4 태그로 자동 게시 (Open VSX·npm)
1. **터미널**(Cursor·VS Code의 `Terminal › New Terminal` 또는 Mac 터미널 앱)에서:
   ```bash
   cd /Users/leester/Desktop/Dev/Tasks-like-plugin
   git tag v1.0.0 && git push origin v1.0.0
   ```
   `* [new tag] v1.0.0 -> v1.0.0`이 나오면 태그가 올라간 것.
2. GitHub *Actions* 탭의 **Release** 워크플로가 자동 실행된다(약 3분):
   설치 → 타입 검사·린트·단위 테스트 → 통합 테스트(실패 시 1회 재시도) → `.vsix` 패키징 → npm `.tgz` 3개 → **GitHub Release 첨부** → (VSCE_PAT 없으면 Marketplace 건너뜀) → **Open VSX 게시** → **npm 게시**.
   - 터미널에서 지켜보기: `gh run watch <run-id> --exit-status`.
3. **워크플로를 쓸 때 실제로 틀렸던 것**
   - 토큰은 **job 수준 `env`**에. 단계의 `if: env.TOKEN != ''`는 같은 단계의 `env`를 보지 못해, 토큰을 넣어도 게시가 항상 건너뛰어졌을 것이다.
   - npm Trusted Publishing을 쓰려면 워크플로에 `permissions: id-token: write`. 없으면 로그에 `Skipped OIDC: …INCORRECT_PERMISSIONS`가 찍히고 토큰으로 게시된다.
   - 새 워크스페이스 패키지를 추가하면 lockfile 갱신(의존성이 하나도 없으면 pnpm 12가 lockfile에 넣지 않아 CI 설치가 실패 → 실제 쓰는 개발 의존성을 명시).
4. **게시 결과 읽기**
   - Open VSX: 로그에 `🚀 Published <id> v1.0.0`이 있으면 게시 성공. 네임스페이스 승인 전에는 API·검색에 "not found"로 나오는 게 정상(비활성).
   - npm: 로그에 `✅ Published package …`. **새 패키지는 npm이 `0.0.0-stage`라는 자리표시 버전("Temporary package placeholder for staged publishing")을 먼저 만들고, 실제 버전은 1~2분 뒤 `latest`가 된다.** 게시 직후 `0.0.0-stage`만 보여도 기다렸다 다시 확인. 사람 승인이 필요할 때만 *Staged Packages*에 나타난다.

### 5.5 반영 확인 명령
```bash
# VS Code Marketplace: 등록 상태·버전 검증(validated가 되면 페이지가 열린다)
curl -s -X POST "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery" \
  -H "Content-Type: application/json" -H "Accept: application/json;api-version=7.1-preview.1" \
  -d '{"filters":[{"criteria":[{"filterType":7,"value":"HastyCapybara.tasks-for-markdown"}]}],"flags":914}' \
  | python3 -c "import json,sys; e=json.load(sys.stdin)['results'][0]['extensions']; print(e[0]['flags'], e[0]['versions'][0]['version'], e[0]['versions'][0]['flags']) if e else print('없음')"
# 확장 페이지(200이면 열림)
curl -s -o /dev/null -w "%{http_code}\n" "https://marketplace.visualstudio.com/items?itemName=HastyCapybara.tasks-for-markdown"
# Open VSX(승인 전에는 not found)
curl -s https://open-vsx.org/api/HastyCapybara/tasks-for-markdown | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('version'), d.get('verified'), d.get('error'))"
curl -s https://open-vsx.org/api/HastyCapybara      # 네임스페이스 verified 여부
# npm(dist-tags의 latest가 실제 버전인지)
npm view @hastycapybara/tasks-cli dist-tags versions
# GitHub Release 첨부 파일
gh release view v1.0.0 -R W-Leester/tasks-for-markdown --json assets --jq '.assets[].name'
```
- VS Code 안의 확장 검색은 결과를 잠시 저장해 두므로, 마켓에 나온 뒤에도 안 보이면 VS Code를 재시작한다.

---

## 6. 공개 후

### 6.1 Open VSX 승인 기다리기 → Cursor 반영
- 확인 위치: 신청 이슈(**`granted` 라벨**이 붙고 Closed되면 승인), API `curl -s https://open-vsx.org/api/<네임스페이스>`의 `"verified":true`, 또는 open-vsx.org › Settings › 네임스페이스 옆 **⚠가 사라지면** 승인.
- 승인되면 태그로 이미 올린 버전이 **다시 올리지 않아도** 나타난다. Cursor 검색에는 조금 더 걸릴 수 있다.
- 두 번째 버전부터는 Open VSX에 기다림 없이 바로 게시된다.

### 6.2 npm을 Trusted Publishing으로 전환
1. 워크플로: `permissions: id-token: write` 추가, npm 게시 단계는 토큰이 없어도 실행되게(토큰은 확인 전까지 대비책).
2. npmjs.com → 패키지 페이지(https://www.npmjs.com/package/<패키지>/access) → **Settings** 탭 → **Trusted Publisher**(계정 설정이 아니라 **패키지마다**):

   | 칸 | 입력 |
   |---|---|
   | Publisher | GitHub Actions |
   | Label | 비움 |
   | Organization or user / Repository | `W-Leester` / `tasks-for-markdown` |
   | Workflow filename | `release.yml`(파일 이름만) |
   | Environment name | 비움 |
   | Allowed actions | ☑ **Allow `npm publish`**(체크 안 하면 "단계적 게시"만 돼서 매 버전 사람이 승인해야 한다), ☐ `npm dist-tag` |

   → **Set up connection**. 패키지 수만큼 반복. **만든 뒤에는 고칠 수 없다**(지우고 다시 만들어야). 저장소·워크플로 파일 이름·Environment를 바꾸지 않는 한 모든 버전에 계속 쓰인다(README·코드 변경과 무관).
3. **아래 Publishing access는 아직 그대로**("…or a granular access token with bypass 2fa enabled") — 토큰 대비책이 동작하게.
4. **다음 버전 게시 때** 로그에 OIDC로 게시된 것이 확인되면: GitHub Secret `NPM_TOKEN` 삭제 → npm에서 토큰 폐기 → 각 패키지 Publishing access를 "Require two-factor authentication and **disallow** bypass 2fa tokens"로.

### 6.3 Open VSX를 Trusted Publishers로 전환
- 네임스페이스 승인 뒤 *Trusted Publishers*에 GitHub 저장소·워크플로를 등록하고 워크플로를 맞춘 뒤 `OVSX_PAT` 삭제.

### 6.4 그 밖
- **설치본 교체**: 개발 중 `.vsix`로 설치한 사본을 Uninstall하고 각 마켓에서 다시 설치(이후 자동 업데이트). 내부 `.vsix` 사용자에게도 안내.
- **시험 확장 정리**: Marketplace 관리 페이지에 시험 확장이 남아 있으면 *Remove*. API로 확인 가능(5.5의 첫 명령에 시험 ID).
- **(선택) Marketplace 도메인 인증**: 퍼블리셔 설정 › Verified domain에 `https://도메인`(경로 없이) → DNS TXT 레코드 추가 → Microsoft 검토(며칠). 파란 체크 배지. 첫 게시 후에 신청하는 편이 부담 적다.
- **토큰 만료일** 달력 기록(전환 전까지).
- **기록**: 현황을 release.md에, 실패는 postmortems/에.

---

## 7. 다음 버전 내는 법
1. 기능 개발 → CHANGELOG·문서 → 버전 올리기(`package.json`과 `packages/*/package.json` 같은 번호).
2. 자동 검사 + 필요한 수동 점검 → `pnpm package` → `unzip -l`로 포함 파일 확인.
3. **VS Code Marketplace**: 관리 페이지 → 확장 *… → Update* → 새 `.vsix` 업로드 → 몇 분 뒤 반영 확인.
4. **태그**: `git tag vX.Y.Z && git push origin vX.Y.Z` → Open VSX·npm 자동 게시(Open VSX는 승인된 뒤라 바로 보인다).
5. 확인(5.5). 같은 번호는 다시 못 쓰니 고칠 게 생기면 패치 버전(`X.Y.Z+1`)으로. npm은 게시 후 72시간 안에만 unpublish 가능, Marketplace는 `vsce unpublish`로 내릴 수만 있다.

---

## 8. 이번 공개에 실제로 걸린 시간 (KST)

| 날짜 | 일 |
|---|---|
| 09-30 | 공개 결정(1.0.0 재시작, 저장소 공개, 영어 README, npm 동시), 아이콘·README·CHANGELOG·타입 패키지·워크플로 준비. 워크플로 결함 2건(토큰 env, lockfile)을 게시 전 발견 |
| 10-01 낮 | 수동 점검(VS Code·Cursor·원격·테마·MCP). 단축키 `Cmd+Enter` 충돌 → `Ctrl+Shift+Enter`. 퍼블리셔 ID를 `HastyCapybara`로 |
| 10-01 낮 | 계정: Marketplace 퍼블리셔, Azure 구독 요구 → 웹 업로드로 결정, Open VSX(Eclipse 계정·동의서·네임스페이스·토큰), npm(가입·2FA·토큰), Secrets |
| 10-01 밤 | Marketplace 업로드 거절 → 시험 업로드 16개로 원인(검색어) 확인 → 12시간 생성 한도 |
| 10-02 10:03 | 재업로드 성공, **10:11 Marketplace 페이지·검색 반영**(약 8분) |
| 10-03 | Open VSX 소유권 신청(#13675), 태그 `v1.0.0` → Release 성공: npm 3개 공개, Open VSX 게시(승인 대기), npm Trusted Publisher 등록. **같은 날 네임스페이스 승인(약 9시간) → Open VSX 공개·검색 반영** |

---

## 9. 한 장 체크리스트

**결정**
- [ ] 버전 번호 / [ ] 퍼블리셔 ID·표시 이름·네임스페이스·npm 스코프 / [ ] 마켓 페이지 언어 / [ ] npm 공개 여부

**패키지**
- [ ] 아이콘 PNG 256 투명 / [ ] README(영어)·스크린샷 PNG·다른 언어 링크·감사의 말 / [ ] npm README도 같은 언어 규칙
- [ ] 소개문 / [ ] 검색어(일반 단어, 적게) / [ ] `.vscodeignore` 후 `unzip -l` / [ ] 기본 번역 파일은 영어만

**점검**
- [ ] 자동 검사 전부, frozen lockfile 설치 / [ ] VS Code·Cursor 수동 점검, 단축키 충돌 기록으로 확인 / [ ] 원격·테마·언어 / [ ] CLI·MCP

**계정**
- [ ] Marketplace 퍼블리셔(ID 정확히) / [ ] Open VSX: Eclipse 계정(GitHub Username)·동의서·네임스페이스·토큰 / [ ] npm: 가입(사용자 이름=스코프)·2FA·복구 코드 보관·토큰(만료일 기록) / [ ] GitHub Secrets / [ ] 커밋 이력 비밀 값 점검 → 저장소 공개

**게시**
- [ ] Marketplace 웹 업로드 → 페이지·검색 반영 확인 / [ ] Open VSX 소유권 신청(Option 1, Subscribe) / [ ] 태그 → Release 초록 / [ ] Open VSX 로그 `Published`, npm `latest` 확인

**공개 후**
- [ ] Open VSX 승인 → Cursor 검색 / [ ] 설치본을 마켓 설치로 교체 / [ ] npm Trusted Publisher(Allow npm publish) → 다음 버전에서 확인 후 토큰 삭제·Publishing access 강화 / [ ] Open VSX Trusted Publishers / [ ] (선택) 도메인 인증 / [ ] release.md·postmortems 기록

---

## 관련 문서
- [release.md](release.md) — 이 프로젝트의 현황판, 남은 일, 이름 표기 규칙, 기능·릴리스 체크리스트
- [manual-checklist.md](manual-checklist.md) — 수동 점검표와 결과
- [postmortems/](postmortems/README.md) — 실패 기록(업로드 거절 포스트모템, 실패 사례 20건)
- [history-internal.md](history-internal.md) — 공개 전 내부 개발 이력
