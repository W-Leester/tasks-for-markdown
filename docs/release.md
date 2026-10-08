# 릴리스 절차

이 프로젝트의 배포 절차와 체크리스트입니다. 다른 확장에도 쓸 수 있는 일반 절차는 [배포 가이드라인](publishing-guide.md), 실패 기록은 [postmortems/](postmortems/README.md)에 있습니다.

## 1.0.0 공개 현황 (2026-10-02 기준)

| 마켓 | 쓰는 편집기 | 상태 |
|---|---|---|
| VS Code Marketplace | VS Code | ✅ **공개** (10-02 10:03 KST 업로드, 10:11 페이지·검색 반영) — https://marketplace.visualstudio.com/items?itemName=HastyCapybara.tasks-for-markdown |
| Open VSX | **Cursor**, VSCodium 등 | ✅ **공개** — 10-03 태그로 게시, 같은 날 네임스페이스 승인(#13675 `granted`, 신청 약 9시간 뒤). https://open-vsx.org/extension/HastyCapybara/tasks-for-markdown — 1.0.0은 승인 전에 게시돼 페이지에 "검증되지 않은 게시자" 경고가 남음(다음 버전부터 사라짐, 실패 사례 21) |
| npm | CLI·MCP·라이브러리 사용자 | ✅ 공개 — tasks-core·tasks-cli·tasks-api 1.0.0 (tasks-api는 npm이 첫 게시 때 만든 `0.0.0-stage` 자리표시 버전이 함께 보이며, 1.0.0은 2분 뒤 반영) |

### 완료
- [x] 수동 점검(VS Code·Cursor·원격·테마·MCP) — [manual-checklist.md](manual-checklist.md)
- [x] 계정: Marketplace 퍼블리셔 `HastyCapybara`, Open VSX(Eclipse 계정·Publisher Agreement·네임스페이스 `HastyCapybara`), npm 사용자 `hastycapybara`(2FA 패스키)
- [x] GitHub Secrets: `OVSX_PAT`, `NPM_TOKEN`(90일, 2026-12-30 전후 만료). `VSCE_PAT`는 없음(Azure 구독 필요 → 웹 업로드)
- [x] 저장소 공개
- [x] VS Code Marketplace 웹 업로드(검색어 문제 해결 후, [포스트모템](postmortems/2026-10-01-marketplace-upload-rejected.md))

### 남은 일 (순서대로)
1. [ ] **시험 확장 삭제** — 관리 페이지에서 `TFM …` 이름의 시험 확장들을 *… → Remove*.
2. [x] **Open VSX 네임스페이스 소유권 신청** — 2026-10-03 제출: https://github.com/EclipseFdn/open-vsx.org/issues/13675 (**승인됨**, `granted` 라벨). 실수로 같은 신청을 두 번 내 #13674는 중복으로 닫힘(운영자 댓글의 "Dup of #1675"는 #13675의 오타). — open-vsx.org › 네임스페이스 `HastyCapybara` › *Claim Ownership* → GitHub 이슈: Ownership ☑, Account Age ☑, **Option 1** ☑, Claim evidence에 Marketplace 링크·퍼블리셔 링크·저장소 링크(신청자 W-Leester 소유). 승인까지 며칠.
3. [x] **태그 푸시** (2026-10-03, Release 성공) → Release 워크플로가 Open VSX·npm 게시, GitHub Release에 `.vsix`·`.tgz` 첨부.
   ```bash
   git tag v1.0.0 && git push origin v1.0.0
   ```
   *Actions* 탭에서 Release가 모두 초록인지 확인. 실패하면 로그 끝부분으로 원인 확인.
4. [ ] **확인** — Open VSX 페이지(https://open-vsx.org/extension/HastyCapybara/tasks-for-markdown), npm(https://www.npmjs.com/~hastycapybara 의 패키지 3개). 소유권 승인 뒤 **Cursor 확장 검색**에 나오는지.
5. [ ] **설치본 교체** — VS Code·Cursor에서 개발용 `.vsix` 설치본을 Uninstall하고 각 마켓에서 다시 설치(이후 자동 업데이트).
6. [ ] 아래 "공개 직후 할 일"(Trusted Publishing 전환 등).

**손으로 게시하고 싶다면**(워크플로 대신, 토큰은 위와 같음):
```bash
pnpm package
pnpm exec vsce publish --no-dependencies --packagePath tasks-for-markdown-1.0.0.vsix -p <VSCE_PAT>
pnpm exec ovsx publish tasks-for-markdown-1.0.0.vsix -p <OVSX_PAT>
pnpm build:packages
npm login   # 한 번
for p in tasks-core tasks-cli tasks-api; do pnpm --filter @hastycapybara/$p publish --access public; done
```

**문제가 생기면.** Marketplace는 같은 버전을 다시 올릴 수 없다(내리기는 가능: `vsce unpublish`). 고칠 게 있으면 1.0.1로 올린다. npm은 게시 후 72시간 안에만 `npm unpublish` 가능.

## 1.0.1 게시 (2026-10-05)
- Marketplace: 관리 페이지 *… → Update*로 `tasks-for-markdown-1.0.1.vsix` 업로드 → 검사 후 공개(`validated`). 목록의 Version 칸은 검사 중에 옛 번호 옆에 "▶ Verifying…"으로 보인다.
- 태그 `v1.0.1` → Release 워크플로 성공(약 2분): Open VSX `Published v1.0.1`(이제 `verified=True`, 1.0.0의 경고 없음), npm `tasks-core`·`tasks-cli`·`tasks-api` 1.0.1.
- **npm Trusted Publishing(OIDC) 확인:** 로그에 `Signed provenance statement`, 세 패키지 모두 provenance 기록 있음 → 토큰 없이 게시됨. 다음 단계: GitHub Secret `NPM_TOKEN` 삭제, npm 토큰 폐기, 각 패키지 Publishing access 강화(아래).
- npm·Open VSX 반영은 게시 뒤 1~3분(캐시).

## 1.1.0 게시 (2026-10-08)
- [x] 검증: typecheck·lint, 단위 819, 웹뷰 33, 통합 61 통과, `build:packages`, `pnpm package`(35 files, vsix에 `dist/tasksmd.cjs`·`THIRD_PARTY_NOTICES.md`·walkthrough 포함), `tasks-cli` 1.1.0 `npm pack`에 `THIRD_PARTY_NOTICES.md` 포함
- [x] 수동 점검 1·3~10·13 통과, 2(Copilot 없음)는 통합 테스트로 대신, 11 원격·12 Windows는 배포 후로(manual-checklist 5장)
- [x] Marketplace: 관리 페이지 *… → Update*로 `tasks-for-markdown-1.1.0.vsix` 업로드(사용자) → 09:46 KST 공개(업로드 후 약 10분 "▶ Verifying…")
- [x] 태그 `v1.1.0` 푸시(Marketplace 공개 확인 뒤) → Release 워크플로 성공(약 2분): Open VSX, npm 3개(OIDC, 토큰 없이), GitHub Release에 vsix·tgz 3개·latest.json
- [x] 확인: Open VSX 1.1.0(`verified=true`), npm `tasks-core`·`tasks-cli`·`tasks-api` 1.1.0(provenance 모두 있음), `tasks-cli`에 THIRD_PARTY_NOTICES. **`tasks-api`만 레지스트리 반영이 약 4분 늦음**(로그는 09:47 Published, 목록은 09:52) — 기다리면 됨
- [x] 설치본 교체: 개발용 vsix 대신 마켓 설치본(VS Code는 Marketplace, Cursor는 Open VSX) — 2026-10-09 사용자

## 보관 파일 (`releases/`, git에 안 올림)

배포한 파일을 로컬에 모아 둔다. 같은 파일은 GitHub Release에도 있다(태그마다 vsix·npm tgz·latest.json 자동 첨부).

| 버전 | 파일 | 출처 | SHA-256 |
|---|---|---|---|
| 1.1.0 | `tasks-for-markdown-1.1.0.marketplace.vsix` | VS Code Marketplace에 올린 파일(마켓에서 다시 받음) | `e979cc919ffe2d87…` |
| 1.1.0 | `tasks-for-markdown-1.1.0.github.vsix` | GitHub Release·Open VSX(Actions 빌드) | `f45cb03d54eacaca…` |
| 1.0.1 | `tasks-for-markdown-1.0.1.marketplace.vsix` | VS Code Marketplace에 올린 파일(마켓에서 다시 받음) | `bd43ade46bfff3a1…` |
| 1.0.1 | `tasks-for-markdown-1.0.1.github.vsix` | GitHub Release·Open VSX(Actions 빌드) | `91e06bd16f9232de…` |
| 1.0.0 | `tasks-for-markdown-1.0.0.marketplace.vsix` | VS Code Marketplace에 올린 파일(마켓에서 다시 받음) | `5d9b73b8a1a1c207…` |
| 1.0.0 | `tasks-for-markdown-1.0.0.github.vsix` | GitHub Release·Open VSX(Actions 빌드) | `944bec251653fba4…` |
| 1.0.0–1.1.0 | `hastycapybara-tasks-{core,cli,api}-<버전>.tgz` | npm에 올라간 것과 같은 GitHub Release 첨부본 | — |

- Marketplace 사본은 `https://marketplace.visualstudio.com/_apis/public/gallery/publishers/HastyCapybara/vsextensions/tasks-for-markdown/<버전>/vspackage`로 다시 받을 수 있다(1.1.0: 받은 파일 크기 865,206바이트 = 업로드한 로컬 파일과 같음). 지문 전체는 `shasum -a 256 releases/*.vsix`.
- 보관 규칙: 게시한 `.vsix`는 지우지 않고 `releases/tasks-for-markdown-<버전>.marketplace.vsix`로 옮기고, 태그 뒤 GitHub Release 파일은 `gh release download v<버전> -D releases --pattern '*.vsix' --pattern '*.tgz'`(`.github.vsix`로 이름 변경).

## 공개 직후 할 일 (토큰 정리)

- [~] **npm Trusted Publishing으로 전환 (1.0.1에서 OIDC 게시 확인, 2026-10-05 — 토큰 삭제·접근 강화만 남음).** 워크플로 변경(208f40e)·세 패키지 Trusted Publisher 등록(Allow npm publish) 완료. 남은 것: 다음 게시에서 OIDC 확인 후 토큰 삭제·Publishing access 강화. 세 패키지가 게시되어 조건 충족.
  - 계획: (1) 워크플로에 `permissions: id-token: write` 추가 — 첫 게시 로그의 `Skipped OIDC: ERR_PNPM_ID_TOKEN_GITHUB_WORKFLOW_INCORRECT_PERMISSIONS`가 이것 때문. pnpm이 OIDC 토큰을 받으면 토큰 없이 게시하고 출처 증명(provenance)도 붙는다. (2) npm 게시 단계를 토큰 유무와 상관없이 실행하고, `NPM_TOKEN`이 있을 때만 `.npmrc`에 쓴다(전환 확인 전까지 대비책). (3) 사용자가 npmjs.com에서 세 패키지 각각 *Settings › Trusted Publisher › GitHub Actions*: Organization or user `W-Leester`, Repository `tasks-for-markdown`, Workflow filename `release.yml`, Environment 비움. (4) 다음 게시(1.1.0)에서 로그에 OIDC 사용이 확인되면 GitHub Secret `NPM_TOKEN` 삭제 + npm에서 토큰 폐기, 각 패키지 *Publishing access*를 "Require two-factor authentication and disallow tokens"로.
- [ ] **Open VSX Trusted Publishers로 전환**(네임스페이스 `HastyCapybara` 소유권 승인 뒤). 등록 후 `OVSX_PAT` 삭제.
- [ ] 전환 전까지는 토큰 만료일을 달력에 적어 두고, 만료되면 새로 발급해 GitHub Secret만 바꾼다.
- [x] **Open VSX 네임스페이스 소유권 신청**(2026-10-03 승인, #13675): VS Code Marketplace 업로드와 저장소 공개가 끝난 뒤 GitHub 이슈(Option 1 — 같은 이름의 Marketplace 퍼블리셔, 저장소는 신청자 소유)로 제출.

## 한 번만 (계정·토큰)

1. **VS Code Marketplace**: https://marketplace.visualstudio.com/manage 에서 퍼블리셔 `HastyCapybara` 생성 → Azure DevOps에서 PAT(Marketplace › Manage 권한) 발급 → GitHub 저장소 Secrets에 `VSCE_PAT`.
2. **Open VSX** (Cursor용): https://open-vsx.org 에서 로그인 → 네임스페이스 `HastyCapybara` 생성(`ovsx create-namespace HastyCapybara -p <token>`) → Secrets에 `OVSX_PAT`.
3. 두 토큰이 없으면 워크플로는 게시 단계를 건너뛰고 `.vsix`만 Release에 첨부한다.

## npm 패키지 (`@hastycapybara/tasks-core`, `@hastycapybara/tasks-cli`)

1. 한 번만: npm 계정에서 조직/스코프 `hastycapybara` 생성, `npm login`.
2. `packages/*/package.json`의 `version`을 확장과 같은 번호로 맞춘다(pnpm workspace).
3. 빌드·검증·발행:
   ```bash
   pnpm build:packages && pnpm test
   pnpm --filter @hastycapybara/tasks-core publish --access public
   pnpm --filter @hastycapybara/tasks-cli publish --access public
   ```
4. npm에 올릴 수 없으면 `pnpm --filter <pkg> pack`으로 만든 `.tgz`를 GitHub Release에 첨부하고, 사용자는 `npm i -g ./tasks-cli-<ver>.tgz`로 설치한다.

## 매 릴리스

```bash
# 1. 버전·변경 이력
#    package.json version, CHANGELOG.md 갱신
# 2. 검증
pnpm typecheck && pnpm lint && pnpm test && pnpm test:integration
# 3. 로컬 패키징 확인
pnpm package            # tasks-for-markdown-<ver>.vsix, dist/latest.json
code --install-extension tasks-for-markdown-<ver>.vsix   # 또는 cursor --install-extension
# 4. 태그 푸시 → GitHub Actions가 빌드·테스트·Release 첨부·(토큰 있으면) 게시
git tag v<ver> && git push origin v<ver>
```

## 이름 표기 규칙

| 쓰는 곳 | 표기 | 이유 |
|---|---|---|
| 사람이 읽는 이름(마켓 표시 이름, LICENSE, npm `author`), **퍼블리셔 ID**(`package.json` `publisher`), 확장 ID `HastyCapybara.tasks-for-markdown`, Open VSX 네임스페이스 | **HastyCapybara** | 결정 2026-10-01. `.vsix`로 설치하면 확장 화면에 퍼블리셔 ID가 그대로 보이므로 ID도 이 표기로 함. 게시 후에는 ID를 바꿀 수 없다. 확장 ID는 대소문자를 구분하지 않아 `hastycapybara.tasks-for-markdown`으로 찾아도 된다 |
| npm 조직·패키지 `@hastycapybara/tasks-core` 등 | `hastycapybara` | npm은 패키지 이름에 대문자를 허용하지 않는다 |

## 빠뜨리지 말 것 (버전 관리·배포 체크리스트)

기능을 추가하거나 릴리스할 때마다 이 목록을 위에서부터 확인한다.

### A. 기능을 추가·변경할 때

- [ ] **세 곳 동시 반영.** 외부에서 쓸 수 있는 기능이면 확장 API(`src/api`), CLI(`packages/cli/src/commands.ts`·`main.ts`), MCP(`packages/cli/src/mcp.ts`)에 함께 넣는다. 못 넣으면 이유를 api.md에 적는다. (1.8.0 메모가 확장 API에만 들어갔던 일의 재발 방지)
- [ ] **AI용 문법 설명서**(`packages/cli/src/syntax.ts`)에 새 문법·규칙 반영.
- [ ] **기능 목록.** 확장 API의 `features`에 이름 추가, api.md "기능 목록" 표에 이름·추가 버전 기록.
- [ ] **공개 타입.** `src/api/types.ts`에 추가(import 없는 한 파일 유지). 내부 DTO와의 양방향 검사가 통과해야 한다.
- [ ] **API 호환.** 추가만이면 버전 1 유지. 제거·의미 변경은 `getAPI(2)`를 새로 만들고 1을 최소 한 릴리스 병행.
- [ ] **검색어(keywords).** 바꿀 때는 마켓 업로드로 확인한다. `checklist`·`kanban`·`calendar`·`gtd`가 들어가면 "suspicious content"로 거절됐다(M20, 2026-10-01). 통과 확인된 것: `markdown, tasks, todo, productivity, recurring, dataview, mcp`.
- [ ] **설정.** `package.json` contributes, `package.nls.json`·`package.nls.ko.json` 설명, README 설정 표(한·영).
- [ ] **화면 문구.** `l10n/bundle.l10n.ko.json`에 한국어(누락은 `l10n-coverage` 테스트가 잡는다).
- [ ] **npm 패키지 README**(`packages/*/README.md`)는 영어 기본(한국어 문서로 링크). npm 페이지의 README는 **새 버전을 게시해야** 바뀐다.
- [ ] **문서.** user-guide, README(한·영), api.md·api.en.md, docs/Tasks.md 진행 표, design.md 변경 이력.

### B. 릴리스할 때

- [ ] **버전 번호 한곳에 맞추기.** `package.json`(확장). npm 패키지를 낼 때는 `packages/core`·`packages/cli`의 `version`도 같은 번호로(지금은 1.3.0으로 뒤처져 있음 — npm 첫 발행 전에 맞출 것). CLI의 `tasksmd info`·MCP `tasks_info`가 보여 주는 버전은 `packages/cli/package.json`의 값이라, 맞추지 않으면 AI·스크립트에 옛 번호가 나간다.
- [ ] **CHANGELOG.md**에 버전·날짜·추가/변경/수정, 외부 연동 변경은 "API" 항목으로.
- [ ] **검증.** `pnpm typecheck && pnpm lint && pnpm test && pnpm test:webviews && pnpm test:integration`.
- [ ] **패키징.** `pnpm package` → `.vsix`(사내 배포용 `dist/latest.json`도 생성), 타입 파일 `dist/api-types/api/types.d.ts` 포함 확인(`unzip -l`).
- [ ] **새 파일로 설치 확인.** 개발 중 만든 `.vsix`는 덮어써도 된다(저장소 루트, git에 안 올림).
- [ ] **게시한 파일 보관(2026-10-09~).** Marketplace에 올린 바로 그 `.vsix`를 `releases/`로 옮긴다(git에 안 올림, `.gitignore`): `mv tasks-for-markdown-<버전>.vsix releases/ && shasum -a 256 releases/tasks-for-markdown-<버전>.vsix` → 아래 "보관 파일" 표에 지문 기록. GitHub Release의 `.vsix`(Open VSX에 올라간 것)는 Actions가 같은 소스로 다시 만든 것이라 파일 지문이 다르다.
- [ ] **출처 고지.** 새로 이식한 코드가 있으면 파일 상단 주석과 NOTICE.md 목록에 추가. 번들에 들어가는 패키지는 `pnpm notices`가 `THIRD_PARTY_NOTICES.md`(라이선스 전문)를 다시 만든다(`pnpm package`에 포함, 최신이 아니면 테스트 실패). npm `tasks-cli`에도 복사된다.
- [ ] **번들 CLI(1.1.0~).** vsix에 `extension/dist/tasksmd.cjs`가 있는지(`unzip -l`), 에디터 내장 Node로 도는지: `ELECTRON_RUN_AS_NODE=1 "<에디터 Helper (Plugin) 실행 파일>" dist/tasksmd.cjs info`.
- [ ] **실제 에디터 점검.** 자동 테스트가 못 보는 것(Cursor 자동 MCP 등록, 시작 안내 버튼, 링크 클릭, Claude 연결)은 `manual-checklist.md` 5절.
- [ ] **마켓 검사 주의.** 외부 프로세스 실행(`claude`, MCP 서버)·홈 폴더 파일 생성 코드가 들어 있다. 거절되면 `publishing-guide.md` 5.3(시험 이름으로 반씩 나누기, 12시간 생성 한도).
- [ ] **알려진 한계 확인.** Windows(런처 `.cmd`, Claude Desktop 경로)는 코드·단위 테스트만 있고 실제 Windows에서 확인하지 않음(1.1.0). 확인 전에는 CHANGELOG·문서에 그대로 둔다.
- [ ] 태그 `v<버전>` 푸시(Actions가 게시).

### C. 마켓플레이스 첫 공개(1.0.0) 때 한 번

- [x] **버전 번호 결정 (2026-09-30): 1.0.0으로 다시 시작.** 내부 개발 버전은 1.13.0까지였다. 영향:
  - 사내 `.vsix` 사용자의 업데이트 알림(`latest.json` 비교)이 1.0.0을 "새 버전"으로 보지 않는다 → 마켓 설치(자동 업데이트)로 옮기거나 1.0.0을 직접 설치하도록 안내.
  - Marketplace·Open VSX·npm에는 처음 올리는 것이라 문제없다.
  - API 문서의 "추가된 버전"은 공개 기준(1.0.0)으로 적는다. 내부 버전 번호는 docs/history-internal.md에만.
- [x] **저장소 공개 (결정 2026-09-30).** 공개 전 비밀 값 검사(2026-09-30: 파일·140개 커밋 이력에서 토큰·키 없음). 커밋 작성자 이메일이 공개된다.
- [x] **마켓 페이지 언어 (결정 2026-09-30):** README.md 영어 기본, README.ko.md로 연결. README 이미지는 PNG/GIF만(마켓이 SVG 거부).
- [x] **npm 동시 배포 (결정 2026-09-30):** tasks-core, tasks-cli, tasks-api.
- [x] **CHANGELOG 정리 (2026-09-30).** CHANGELOG.md는 "1.0.0 — 첫 공개"(영어·한국어 요약)부터 시작. 내부 이력(내부 1.0.0~1.13.0)과 옛 post-release-changes.md는 docs/history-internal.md로 옮김.
- [ ] **npm 패키지 발행**: `@hastycapybara/tasks-core`, `@hastycapybara/tasks-cli`, `@hastycapybara/tasks-api` — 태그 푸시로 자동(위 "남은 일" 3).
- [x] 계정: Marketplace 퍼블리셔 `HastyCapybara`, Open VSX 네임스페이스, npm 사용자 `hastycapybara`(2026-10-01).
- [ ] 마켓플레이스 소개문(package.json `description`, README 첫머리)과 Obsidian Tasks 출처 문구 최종 확인. 로고·이름을 우리 것처럼 쓰지 않았는지.
- [x] docs/manual-checklist.md 수동 테스트 한 바퀴(2026-10-01).

## 사내 `.vsix` 배포 (보조 경로)

1. Release에 첨부된 `tasks-for-markdown-<ver>.vsix`와 `latest.json`을 사내 공유 경로(파일 서버 또는 HTTP)에 올린다.
2. `latest.json`의 `vsix`를 실제 경로/URL로 고친다 (`node scripts/make-latest.mjs "<경로>" "<릴리스 노트>"`로 생성 가능).
3. 사용자는 `tasksmd.updateCheckUrl`에 `latest.json` 위치를 설정하면 하루 1회 새 버전 알림을 받는다. Marketplace 설치본은 자동 업데이트되므로 알림이 뜨지 않는다.

## 설치 방법 (사용자)

- Marketplace / Open VSX: "Tasks for Markdown" 검색
- `.vsix`: 확장 뷰 `…` › *Install from VSIX…* 또는 `code --install-extension <file>.vsix`
