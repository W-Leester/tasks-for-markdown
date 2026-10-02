# VS Code 확장 배포 가이드라인

VS Code 확장을 **VS Code Marketplace**, **Open VSX**(Cursor·VSCodium 등이 쓰는 마켓), **npm**에 처음 공개할 때 필요한 일을 순서대로 정리한 문서입니다. Tasks for Markdown 1.0.0을 공개하며(2026-09-30 ~ 10-01) 실제로 겪은 일을 바탕으로 썼고, **다른 확장을 낼 때도 그대로 쓸 수 있게** 일반적인 형태로 적었습니다.

- 이 프로젝트에만 해당하는 값(이름, 토큰 만료일, 현재 상태)은 [release.md](release.md)에 있습니다.
- 실제로 겪은 실패와 원인은 [postmortems/](postmortems/README.md)에 있습니다.

---

## 0. 한눈에 보는 순서

| 단계 | 할 일 | 걸리는 시간 | 되돌릴 수 있나 |
|---|---|---|---|
| 1. 결정 | 버전 번호, 이름 표기, 공개 범위, 마켓 페이지 언어 | — | 게시 전까지는 가능 |
| 2. 패키지 준비 | 아이콘, README, 소개문, 검색어, 포함 파일 정리 | 반나절 | 가능 |
| 3. 점검 | 자동 테스트 + 실제 에디터(VS Code·Cursor)에서 수동 점검 | 반나절 | — |
| 4. 계정 | Marketplace 퍼블리셔, Open VSX 네임스페이스, npm 계정, 토큰 | 1~2시간 | **퍼블리셔 ID·npm 이름은 바꿀 수 없음** |
| 5. 공개 | 저장소 공개 → Marketplace 업로드 → Open VSX 소유권 신청 → 태그로 Open VSX·npm 게시 | 1시간 + 승인 대기(며칠) | **같은 버전 번호는 다시 올릴 수 없음** |
| 6. 공개 후 | 설치 확인, 토큰을 Trusted Publishing으로 전환, 시험 확장 삭제 | 30분 | — |

### 편집기마다 확장을 받아 오는 마켓이 다르다

| 편집기 | 확장 마켓 | 게시 방법 |
|---|---|---|
| **VS Code** (Microsoft) | **VS Code Marketplace** | 웹 업로드 또는 `vsce publish` |
| **Cursor**, VSCodium 등 VS Code 계열 | **Open VSX** | `ovsx publish` (네임스페이스 소유권 승인 필요) |
| (선택) npm | npm 레지스트리 | 라이브러리·CLI·타입 패키지가 있을 때 |

Cursor는 VS Code를 바탕으로 만들었지만 **Microsoft 제품이 아니라서 VS Code Marketplace를 쓸 수 없다**(Marketplace 이용 약관이 Microsoft 제품으로 한정). 그래서 VS Code Marketplace에 올려도 Cursor에는 나오지 않는다. **두 마켓에 따로 올려야 한다.**

**가장 중요한 원칙 두 가지.**
1. **한 번 게시한 버전 번호는 다시 쓸 수 없다.** 그래서 여러 마켓에 같은 번호를 올릴 때는 **가장 까다로운 곳(VS Code Marketplace)부터** 통과시키고, 나머지는 그다음에 올린다.
2. **이름과 ID는 게시하면 바꿀 수 없다.** 퍼블리셔 ID, 확장 이름, npm 이름은 1단계에서 확정한다.

---

## 1. 먼저 정할 것

### 1.1 버전 번호
- 첫 공개를 `1.0.0`으로 시작할지, 내부에서 쓰던 번호를 이어 갈지 정한다.
- 내부 `.vsix`로 이미 배포한 적이 있으면, 1.0.0으로 내리면 **번호가 뒤로 가서** 내부 사용자의 업데이트가 끊긴다. 내부 사용자를 마켓 설치로 옮기도록 안내한다.
- 공개 전 내부 이력은 별도 문서(이 프로젝트는 [history-internal.md](history-internal.md))로 옮기고, CHANGELOG는 첫 공개 버전부터 시작하면 깔끔하다.

### 1.2 이름 표기 (가장 헷갈리는 부분)

| 이름 | 어디에 보이나 | 규칙 |
|---|---|---|
| **퍼블리셔 ID** (`package.json`의 `publisher`) | 확장 ID 앞부분. `.vsix`로 설치하면 확장 화면에 **그대로** 보인다 | 대소문자 섞어도 됨(예 `HastyCapybara`). **게시 후 변경 불가.** VS Code는 대소문자를 구분하지 않는다 |
| **퍼블리셔 표시 이름** | 마켓 페이지, 마켓에서 설치한 확장 화면 | 자유. ID와 같게 두면 혼란이 적다 |
| **Open VSX 네임스페이스** | Open VSX 주소 | **퍼블리셔 ID와 똑같은 표기**로 만든다 |
| **npm 이름·스코프** (`@scope/pkg`) | npm 패키지 이름 | **소문자만 가능.** npm 사용자 이름과 조직 이름은 같은 이름을 공유할 수 없다 |
| 작성자 표기(LICENSE, `author`) | 문서 | 자유 |

> `.vsix`로 설치한 확장 화면에는 표시 이름이 아니라 **퍼블리셔 ID**가 보인다. 화면에 보이는 대로 대소문자를 쓰고 싶다면 ID 자체를 그렇게 정해야 한다(게시 전에만 가능).

### 1.3 마켓 페이지 언어
- Marketplace는 `README.md` 하나만 보여 준다(언어별 README 없음). 해외 사용자가 대상이면 **README.md는 영어**로, 다른 언어는 `README.ko.md` 같은 별도 파일로 두고 맨 위에서 서로 연결한다.
- 명령 이름·설정 설명은 `package.nls.json`(기본 = **영어만**)과 `package.nls.ko.json`(한국어)로 나눈다. 기본 파일에 한국어를 섞으면 영어 화면 사용자에게 한국어가 보인다. 이 규칙은 테스트로 고정해 두면 좋다.
- 짧은 소개문(`description`)도 `"%extension.description%"`처럼 번역 키로 두면 화면 언어를 따른다. 마켓 페이지에는 기본(영어) 값이 쓰인다.

---

## 2. 패키지 준비

### 2.1 `package.json` 필수·권장 항목

| 항목 | 권장 |
|---|---|
| `publisher`, `name`, `displayName`, `version` | 1.2의 규칙대로 |
| `description` | 한 문장. 기능 위주. 번역 키로 둬도 됨 |
| `icon` | **PNG**(SVG 불가), 128×128 이상 정사각형(256 권장), 모서리 투명. 밝은 배경·어두운 배경 둘 다에서 확인 |
| `galleryBanner` | 마켓 페이지 머리 색 (`color`, `theme`) |
| `categories` | 실제로 맞는 것만 |
| `keywords` | **적게, 일반적인 단어만.** 다른 유명 확장의 이름과 같은 단어(예: `kanban`, `calendar`, `checklist`, `gtd`)를 넣었다가 "suspicious content"로 거절된 사례가 있다 → [포스트모템](postmortems/2026-10-01-marketplace-upload-rejected.md). 검색어를 바꾸면 **업로드로 확인**한다 |
| `repository`, `homepage`, `bugs` | 공개 저장소 주소. 비공개면 마켓 페이지의 링크·이미지가 404가 된다 |
| `license` | 파일(`LICENSE`)과 일치 |
| `engines.vscode` | 실제로 테스트한 최소 버전 |

### 2.2 README
- 맨 위: 무엇을 하는 확장인지 한 문단 + **스크린샷**. 다른 프로젝트에서 출발했다면 출처와 감사 표시.
- **이미지는 PNG/GIF만.** Marketplace는 README 안의 SVG 이미지를 거부한다(배지 서비스 제외).
- 상대 경로 이미지·링크는 `vsce`가 저장소 주소로 바꿔 준다 → **저장소가 공개돼 있어야** 보인다.
- 다른 프로젝트의 코드·설계를 가져왔다면 `NOTICE.md`(법적 고지)와 README의 감사의 말을 함께 둔다. 원작 로고·이름을 자기 것처럼 쓰지 않고 "관련 없음" 문구를 넣는다.

### 2.3 설치 파일에 들어가는 것 (`.vscodeignore`)
- **허용 목록처럼** 생각한다: 실행에 필요한 `dist/`, `media/`(아이콘·CSS), 번역 파일, README·CHANGELOG·LICENSE·NOTICE.
- 빼야 하는 것: 소스, 테스트, 문서 폴더, 소스맵(`*.map`), 예시·샘플 파일, 원본 디자인 파일(예: 큰 아이콘 원본), **다른 `.vsix`나 `.zip`**(폴더에 남아 있다가 통째로 들어간 적이 있다), `.env`나 설정 파일.
- 확인: `pnpm package` 후 `unzip -l <파일>.vsix`로 목록과 크기를 본다. 크기가 갑자기 늘면 무엇이 들어갔는지 찾는다.
- `vsce`(3.x)는 포장할 때 비밀 값 검사(secretlint)를 한다. 통과하더라도 Marketplace는 따로 검사한다.

### 2.4 코드에서 피할 것 (마켓 검사·신뢰 관점)
- **외부 프로그램 실행**(`child_process`로 셸·PowerShell 스크립트 실행)과 **마켓 밖 자체 업데이트**는 악성 확장의 전형적인 패턴이라 오해받기 쉽다. 이 프로젝트에서는 원인이 아니었지만, 꼭 필요한지 따져 본다.
- 사용자 코드를 실행하는 기능(`new Function` 등)은 신뢰되지 않은 워크스페이스에서 꺼지도록 `capabilities.untrustedWorkspaces`에 적는다.

---

## 3. 공개 전 점검

### 3.1 자동 검사
- 타입 검사, 린트, 단위 테스트, 웹뷰 테스트, **실제 VS Code를 띄우는 통합 테스트**.
- CI에서 통합 테스트는 헤드리스 VS Code가 가끔 시작 중에 멈춘다(`CodeWindow: detected unresponsive`). **한 번 재시도**하게 해 두면 배포가 일시적 오류로 멈추지 않는다.

### 3.2 수동 점검 (사람이 실제 에디터에서)
- **VS Code와 Cursor 둘 다.** 마켓 사용자는 VS Code가 더 많다. Cursor만 보고 넘어가지 않는다.
- **단축키 충돌:** 인기 확장(예: Markdown All in One)과 에디터 자체 키를 확인한다.
  - Cursor는 `Cmd+K`(AI 인라인 편집), `Cmd+L`, `Cmd+I`, `Cmd+Shift+V`(자체 미리보기 토글)를 쓴다. `Cmd+K`로 시작하는 두 단계 단축키는 Cursor에서 동작하지 않는다.
  - 같은 키를 두 확장이 쓰면 어느 쪽이 이길지 예측하기 어렵다. **추측하지 말고** 명령 팔레트 → `Developer: Toggle Keyboard Shortcuts Troubleshooting`으로 실제로 어떤 명령이 잡히는지 확인한다.
  - 후보 키가 비어 있는지는 에디터 번들(키 코드 숫자), 설치된 확장들의 `package.json`, 인기 확장의 키 목록을 함께 검색해 확인한다.
- **원격(Remote SSH/WSL/Codespaces):** 확장이 원격 쪽에서 돌 때 파일 읽기·감시가 되는지. Mac 한 대로도 `원격 로그인` 켜고 `localhost`에 SSH 접속해 시험할 수 있다(끝나면 끈다).
- **테마:** 밝게·어둡게·하이 컨트라스트에서 글자가 읽히는지.
- **화면 언어:** 영어 화면과 한국어 화면(언어 팩 + `Configure Display Language` + 재시작).
- CLI·MCP 같은 부가 도구가 있으면 실제로 써 본다(AI 에이전트 시나리오 포함).
- 결과는 점검표(이 프로젝트는 [manual-checklist.md](manual-checklist.md))에 날짜와 함께 남긴다.

---

## 4. 계정과 토큰

> 토큰은 **만들자마자 바로 GitHub Secret에 붙여 넣는다.** 메모장·메모 앱·프로젝트 파일·대화창에 남기지 않는다. 캡처를 공유할 때는 토큰과 복구 코드를 가린다.

### 4.1 VS Code Marketplace
1. https://marketplace.visualstudio.com/manage → Microsoft 계정 → **Create publisher**: ID와 표시 이름(1.2 참고). 도메인 인증은 나중에 해도 된다(파란 체크 배지, DNS TXT 레코드 필요).
2. **토큰(PAT)은 Azure DevOps 조직이 필요한데, 조직을 만들 때 Azure 구독(결제 계정) 연결을 요구한다**(2026-10 기준). 구독이 없으면:
   - **웹 업로드**로 올린다: 관리 페이지 → *+ New extension → Visual Studio Code* → `.vsix` 끌어다 놓기. 새 버전은 확장의 *… → Update*.
   - 나중에 구독이 생기면 PAT(Organization: *All accessible organizations*, Scope: *Marketplace › Manage*)를 만들어 자동 게시로 바꾼다.
3. **하루 생성 한도가 있다:** 짧은 시간에 확장을 많이 만들면 "maximum number of extensions that can be created in 12 hour(s)" 오류로 12시간 막힌다. 시험 업로드를 남발하지 않는다.

### 4.2 Open VSX (Cursor·VSCodium)
1. https://open-vsx.org → GitHub로 로그인.
2. **Eclipse 계정**을 만들고(실명, 개인이면 *Self-employed*), Eclipse 프로필에 **GitHub 사용자 이름**을 적는다 → Open VSX 프로필에서 Eclipse 계정 연결 → **Publisher Agreement 서명**. 서명 전에는 토큰을 만들 수 없다. (Eclipse 사이트의 *Eclipse Contributor Agreement*는 다른 것이라 필요 없다.)
3. **네임스페이스 만들기**(퍼블리셔 ID와 같은 표기).
4. **네임스페이스 소유권 신청(Claim Ownership):** 만들기만 하면 "not verified"이고, 그 상태로 올린 확장은 비활성일 수 있다. 신청은 Open VSX 저장소의 GitHub 이슈 양식으로 한다.
   - 가장 확실한 근거는 **Option 1**: 같은 이름의 VS Code Marketplace 퍼블리셔에 확장이 올라가 있고, 그 저장소가 신청자 GitHub 계정 소유. → **Marketplace에 먼저 올린 뒤** 신청한다.
   - 양식의 하위 체크박스가 비활성이면 *Claim evidence* 칸에 글로 적는다. 그 칸의 원래 안내 문구는 지운다.
   - GitHub 계정이 12개월 이상이어야 한다. 승인은 며칠 걸린다.
5. 토큰: *Access Tokens → Generate new token*. 나중에는 *Trusted Publishers*(GitHub Actions의 짧은 인증)로 바꾸는 것이 안전하다.

### 4.3 npm
1. 가입. **사용자 이름 = 스코프**다. 사용자 이름을 원하는 스코프(예 `hastycapybara`)로 하면 조직을 따로 만들 필요가 없다. 조직 만들기·계정을 조직으로 바꾸기(Convert)는 하지 않는다.
2. **2단계 인증**: 패스키는 iCloud 키체인(Apple 기기) 또는 Google 비밀번호 관리자(여러 OS)에 저장. **복구 코드는 비밀번호 관리자에 보관**(노출됐다면 재발급).
3. 토큰: *Access Tokens → Granular Access Token* — 권한 *Read and write (publish and stage)*, 대상 *All packages*(첫 게시 전엔 고를 패키지가 없음), *Bypass 2FA*(자동 게시용), 만료는 쓰기 토큰 최대(90일).
4. **첫 게시 때 npm이 `0.0.0-stage`라는 자리표시 버전을 먼저 만들 수 있다**(단계적 게시 기능, 설명 "Temporary package placeholder for staged publishing"). 실제 버전은 몇 분 안에 `latest`로 올라온다. 게시 직후 `0.0.0-stage`만 보여도 놀라지 말고 몇 분 뒤 `npm view <pkg> dist-tags`로 다시 확인한다. 2단계 인증 승인이 필요한 경우에만 *Staged Packages*에 나타난다.
5. **Trusted Publishing은 이미 있는 패키지에만** 설정할 수 있다. 첫 게시는 토큰으로 하고, 직후 전환한 뒤 토큰을 지운다.

### 4.4 GitHub
- 저장소 *Settings › Secrets and variables › Actions*에 토큰 등록(이름은 워크플로와 정확히 같게).
- `gh secret list -R <owner>/<repo>`로 등록 여부(이름만)를 확인할 수 있다.
- **저장소 공개 전 점검:** 파일과 **커밋 이력 전체**에서 토큰·키를 찾는다(`git log -p`에 정규식). 커밋 작성자 이메일이 공개된다는 점을 알고 진행한다.

---

## 5. 게시

### 5.1 순서
1. **저장소 공개** (README 이미지·링크, Open VSX 소유권 근거).
2. **VS Code Marketplace 업로드** — 가장 엄격한 검사. 여기서 고칠 게 생기면 아직 다른 마켓에 같은 번호를 올리지 않았으니 고쳐서 다시 올리면 된다.
3. **Marketplace 반영 확인** — 업로드 직후에는 "public"으로 등록돼도 **자동 검사가 끝날 때까지 확장 페이지가 404**이고 검색에도 안 나온다. 이 프로젝트는 **약 8분** 뒤 페이지와 검색이 함께 열렸다(5.4의 확인 명령).
4. **Open VSX 소유권 신청** (Marketplace 페이지가 열린 뒤). 승인에 며칠 걸리므로 **태그보다 먼저** 낸다.
5. **태그 푸시** (`git tag vX.Y.Z && git push origin vX.Y.Z`) → 워크플로가 테스트, `.vsix`·npm `.tgz` 만들기, GitHub Release 첨부, Open VSX·npm 게시.
6. **Open VSX 승인 → Cursor 반영.** 네임스페이스가 검증되기 전에는 Open VSX에 올린 확장이 비활성으로 보일 수 있다. 승인된 뒤에도 Cursor가 Open VSX 목록을 가져오기까지 시간이 조금 더 걸릴 수 있다.

### 5.2 배포 워크플로(GitHub Actions)에서 실제로 틀렸던 것
- **토큰은 job 수준 `env`에 둔다.** 단계(step)의 `if: env.TOKEN != ''`는 **같은 단계에 적은 `env`를 보지 못한다** → 토큰을 넣어도 게시 단계가 항상 건너뛰어진다.
- **pnpm 워크스페이스에 새 패키지를 추가하면 lockfile을 갱신**하고 `pnpm install --frozen-lockfile`이 통과하는지 확인한다. pnpm 12는 의존성이 하나도 없는 패키지는 lockfile에 넣지 않으면서 frozen 설치에서는 요구했다 → 실제로 쓰는 개발 의존성(예: `typescript`)을 명시해 해결.
- 통합 테스트 **한 번 재시도**(3.1).
- Node 버전 경고 같은 공지는 당장 막지 않지만 다음 정비 때 액션 버전을 올린다.

### 5.3 Marketplace가 거절할 때
- **"Your extension has suspicious content. Please fix your extension metadata"**: 이유를 알려 주지 않는다. **추측으로 기능을 지우지 말고** 반씩 나눠 시험한다.
  1. 같은 코드 + 최소 정보(짧은 소개, 검색어 3개, 짧은 README) / 최소 확장(hello) → 코드·계정 문제인지 가른다.
  2. 실제 문서만 / 실제 소개문·검색어·배너만 → 정보 중 어느 묶음인지.
  3. 그 묶음을 다시 반으로, 마지막엔 한 단어씩.
  - 시험 확장은 **시험용 이름**으로 올리고 통과하면 바로 *Remove*. **12시간 생성 한도**(4.1)를 염두에 두고 한 번에 몇 개씩만.
  - 그래도 모르면 vsmarketplace@microsoft.com 또는 https://aka.ms/marketplacepublishersupport 에 확장 ID, 오류 문구, 시험 결과를 보낸다.
- **"maximum number of extensions … in 12 hour(s)"**: 기다린다. 그 사이 재시도하지 않는다.

---

### 5.4 반영 확인 명령
사람이 검색해 보기 전에, 마켓 API로 상태를 확인할 수 있다(`<publisher>.<name>`만 바꿔 쓴다).

```bash
# VS Code Marketplace: 등록 상태와 버전 검증 여부(flags가 validated가 되면 페이지가 열린다)
curl -s -X POST "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery" \
  -H "Content-Type: application/json" -H "Accept: application/json;api-version=7.1-preview.1" \
  -d '{"filters":[{"criteria":[{"filterType":7,"value":"HastyCapybara.tasks-for-markdown"}]}],"flags":914}' \
  | python3 -c "import json,sys; e=json.load(sys.stdin)['results'][0]['extensions']; print(e[0]['flags'], e[0]['versions'][0]['version'], e[0]['versions'][0]['flags']) if e else print('없음')"
# 확장 페이지(200이면 열림)
curl -s -o /dev/null -w "%{http_code}\n" "https://marketplace.visualstudio.com/items?itemName=HastyCapybara.tasks-for-markdown"
# Open VSX
curl -s https://open-vsx.org/api/HastyCapybara/tasks-for-markdown | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('version'), d.get('verified'), d.get('error'))"
```
- VS Code 안의 확장 검색은 결과를 잠시 저장해 두므로, 마켓에 나온 뒤에도 바로 안 보이면 VS Code를 재시작한다.

## 6. 공개 후
- 각 마켓에서 검색·설치해 본다(아이콘, 퍼블리셔 이름, README 이미지, 링크).
- 개발 중 `.vsix`로 설치한 사본은 지우고 마켓에서 다시 설치한다.
- 시험 확장이 남아 있으면 모두 *Remove*.
- npm·Open VSX를 Trusted Publishing으로 바꾸고 토큰 삭제. 그 전까지 토큰 만료일을 달력에 적는다.
- 필요하면 Marketplace 도메인 인증(파란 체크).
- 이후 버전: 기능 추가는 마이너, 수정은 패치. 같은 번호는 재사용 불가. npm은 게시 후 72시간 안에만 unpublish 가능.

---

## 7. 이 프로젝트의 관련 문서
- [release.md](release.md) — 이 프로젝트의 계정 이름, 이름 표기 규칙, 체크리스트, 공개 직후 할 일
- [manual-checklist.md](manual-checklist.md) — 수동 점검표와 결과
- [postmortems/](postmortems/README.md) — 실패 기록
- [history-internal.md](history-internal.md) — 공개 전 내부 개발 이력
