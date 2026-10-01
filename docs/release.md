# 릴리스 절차

## 첫 공개 순서 (1.0.0, 사용자가 할 일)

코드·문서·패키지 준비는 끝났다(M18). 아래를 위에서부터 한 번씩 하면 된다.

1. **수동 점검.** Cursor에 설치된 1.0.0으로 [manual-checklist.md](manual-checklist.md)를 한 바퀴. 문제가 있으면 고친 뒤 다시 패키징.
2. **VS Code Marketplace 퍼블리셔와 토큰.**
   - https://marketplace.visualstudio.com/manage → Microsoft 계정으로 로그인 → *Create publisher*: **ID `HastyCapybara`**(package.json의 `publisher`와 대소문자까지 똑같이), 표시 이름(Display name)도 `HastyCapybara`.
   - **토큰(PAT) 대신 웹 업로드를 쓴다 (2026-10-01).** PAT를 받으려면 Azure DevOps 조직이 필요한데, 조직을 만들 때 **Azure 구독(결제 계정) 연결을 요구**한다. 그래서 VS Code Marketplace는 토큰 없이 **웹에서 `.vsix`를 업로드**한다: https://marketplace.visualstudio.com/manage → 퍼블리셔 `HastyCapybara` → *+ New extension* → *Visual Studio Code* → `.vsix` 끌어다 놓기 → *Upload*(몇 분간 자동 검사 후 공개). 새 버전도 같은 페이지에서 확장의 *…* → *Update*로 올린다. `VSCE_PAT`가 없으면 Release 워크플로는 Marketplace 단계만 건너뛴다. 나중에 Azure 구독이 생기면 PAT(Organization: All accessible organizations, Scope: Marketplace › Manage)를 만들어 `VSCE_PAT`로 등록하면 자동 게시로 바뀐다.
3. **Open VSX 네임스페이스와 토큰** (Cursor가 이 마켓을 쓴다).
   - https://open-vsx.org → GitHub로 로그인 → 프로필에서 **Eclipse 계정 연결과 Publisher Agreement 서명**(안 하면 게시가 거부됨).
   - *Settings › Access Tokens*에서 토큰 발급.
   - 네임스페이스 만들기(한 번): `npx ovsx create-namespace HastyCapybara -p <토큰>`(package.json의 `publisher`와 같은 표기).
4. **npm 조직과 토큰.**
   - https://www.npmjs.com 가입 → *Add Organization*: 이름 `hastycapybara`(무료, 공개 패키지).
   - *Access Tokens › Generate New Token › Granular*: 패키지·스코프 `@hastycapybara` **Read and write**. (계정에 2단계 인증이 켜져 있으면 "Bypass 2FA"가 가능한 토큰이어야 자동 게시가 된다.)
5. **저장소 공개.** GitHub 저장소 *Settings › General › Danger Zone › Change visibility › Public* (또는 `gh repo edit W-Leester/tasks-for-markdown --visibility public --accept-visibility-change-consequences`). 공개해야 마켓 README의 이미지·링크가 보인다. 커밋 작성자 이메일이 공개된다.
6. **Secrets 등록.** 저장소 *Settings › Secrets and variables › Actions › New repository secret*: `OVSX_PAT`, `NPM_TOKEN` (`VSCE_PAT`는 Azure 구독이 생긴 뒤에).
7. **태그 푸시.**
   ```bash
   git tag v1.0.0 && git push origin v1.0.0
   ```
   GitHub Actions의 *Release* 워크플로가 테스트 → `.vsix`·npm `.tgz` 만들기 → GitHub Release 첨부 → Open VSX·npm 게시까지 한다. **그다음 VS Code Marketplace에는 같은 `.vsix`를 웹에서 업로드**한다(2번). 진행 상황은 저장소 *Actions* 탭.
8. **확인.** 몇 분 뒤 VS Code 확장 검색 "Tasks for Markdown", Cursor 확장 검색(Open VSX), https://www.npmjs.com/org/hastycapybara 에서 세 패키지. 사내 `.vsix` 사용자에게는 마켓에서 설치하라고 안내(1.13.0 → 1.0.0은 번호가 낮아 업데이트 알림이 안 뜸).

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

## 공개 직후 할 일 (토큰 정리)

- [ ] **npm Trusted Publishing으로 전환.** 첫 게시는 2FA 우회 토큰(`NPM_TOKEN`, 2026-10-01 발급, **90일 만료 → 2026-12-30 전후**)으로 한다. npm의 Trusted Publishing은 이미 있는 패키지에만 설정할 수 있으므로, 첫 게시 뒤 세 패키지(`@hastycapybara/tasks-core`, `tasks-cli`, `tasks-api`) 각각의 *Settings › Trusted Publisher*에 GitHub(`W-Leester/tasks-for-markdown`, 워크플로 `release.yml`)를 등록하고, 워크플로에 `permissions: id-token: write`와 npm CLI 11.5 이상을 맞춘 뒤 `NPM_TOKEN`을 삭제한다.
- [ ] **Open VSX Trusted Publishers로 전환**(네임스페이스 `HastyCapybara` 소유권 승인 뒤). 등록 후 `OVSX_PAT` 삭제.
- [ ] 전환 전까지는 토큰 만료일을 달력에 적어 두고, 만료되면 새로 발급해 GitHub Secret만 바꾼다.
- [ ] **Open VSX 네임스페이스 소유권 신청**: VS Code Marketplace 업로드와 저장소 공개가 끝난 뒤 GitHub 이슈(Option 1 — 같은 이름의 Marketplace 퍼블리셔, 저장소는 신청자 소유)로 제출.

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
pnpm package            # tasks-for-markdown-<ver>.vsix
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
- [ ] **설정.** `package.json` contributes, `package.nls.json`·`package.nls.ko.json` 설명, README 설정 표(한·영).
- [ ] **화면 문구.** `l10n/bundle.l10n.ko.json`에 한국어(누락은 `l10n-coverage` 테스트가 잡는다).
- [ ] **문서.** user-guide, README(한·영), api.md·api.en.md, docs/Tasks.md 진행 표, design.md 변경 이력.

### B. 릴리스할 때

- [ ] **버전 번호 한곳에 맞추기.** `package.json`(확장). npm 패키지를 낼 때는 `packages/core`·`packages/cli`의 `version`도 같은 번호로(지금은 1.3.0으로 뒤처져 있음 — npm 첫 발행 전에 맞출 것). CLI의 `tasksmd info`·MCP `tasks_info`가 보여 주는 버전은 `packages/cli/package.json`의 값이라, 맞추지 않으면 AI·스크립트에 옛 번호가 나간다.
- [ ] **CHANGELOG.md**에 버전·날짜·추가/변경/수정, 외부 연동 변경은 "API" 항목으로.
- [ ] **검증.** `pnpm typecheck && pnpm lint && pnpm test && pnpm test:webviews && pnpm test:integration`.
- [ ] **패키징.** `pnpm package` → `.vsix`, 타입 파일 `dist/api-types/api/types.d.ts` 포함 확인(`unzip -l`). 설치 파일에 외부 프로그램 실행(`child_process`)이나 자체 업데이트 코드가 들어가지 않게 한다 — Marketplace가 "suspicious content"로 거절한다(M20).
- [ ] **이전 `.vsix` 삭제**, 새 파일로 설치 확인.
- [ ] **출처 고지.** 새로 이식한 코드가 있으면 파일 상단 주석과 NOTICE.md 목록에 추가. 새 런타임 의존성은 NOTICE.md 표에 라이선스와 함께.
- [ ] 태그 `v<버전>` 푸시(Actions가 게시).

### C. 마켓플레이스 첫 공개(1.0.0) 때 한 번

- [x] **버전 번호 결정 (2026-09-30): 1.0.0으로 다시 시작.** 내부 개발 버전은 1.13.0까지였다. 영향:
  - 사내 `.vsix` 사용자는 마켓 설치(자동 업데이트)로 옮기도록 안내한다. `.vsix` 업데이트 확인 기능은 M20에서 제거했다.
  - Marketplace·Open VSX·npm에는 처음 올리는 것이라 문제없다.
  - API 문서의 "추가된 버전"은 공개 기준(1.0.0)으로 적는다. 내부 버전 번호는 docs/history-internal.md에만.
- [x] **저장소 공개 (결정 2026-09-30).** 공개 전 비밀 값 검사(2026-09-30: 파일·140개 커밋 이력에서 토큰·키 없음). 커밋 작성자 이메일이 공개된다.
- [x] **마켓 페이지 언어 (결정 2026-09-30):** README.md 영어 기본, README.ko.md로 연결. README 이미지는 PNG/GIF만(마켓이 SVG 거부).
- [x] **npm 동시 배포 (결정 2026-09-30):** tasks-core, tasks-cli, tasks-api.
- [x] **CHANGELOG 정리 (2026-09-30).** CHANGELOG.md는 "1.0.0 — 첫 공개"(영어·한국어 요약)부터 시작. 내부 이력(내부 1.0.0~1.13.0)과 옛 post-release-changes.md는 docs/history-internal.md로 옮김.
- [ ] **npm 패키지 발행**: `@hastycapybara/tasks-core`, `@hastycapybara/tasks-cli`, 그리고 타입 패키지 `@hastycapybara/tasks-api`(src/api/types.ts로 만든 `.d.ts`만 담은 패키지; 폴더 `packages/api` 신설). npm 계정·스코프 `hastycapybara` 필요.
- [ ] 계정: Marketplace 퍼블리셔 `HastyCapybara`, Open VSX 네임스페이스, npm 스코프(위 "한 번만" 절).
- [ ] 마켓플레이스 소개문(package.json `description`, README 첫머리)과 Obsidian Tasks 출처 문구 최종 확인. 로고·이름을 우리 것처럼 쓰지 않았는지.
- [ ] docs/manual-checklist.md 수동 테스트 한 바퀴.

## 사내 `.vsix` 배포 (보조 경로)

Release에 첨부된 `tasks-for-markdown-<ver>.vsix`를 공유 경로에 올리고, 사용자는 확장 뷰 `…` › *Install from VSIX…*로 설치한다. 자동 업데이트는 없으므로(M20에서 `.vsix` 업데이트 확인 제거) 가능하면 마켓 설치를 안내한다.

## 설치 방법 (사용자)

- Marketplace / Open VSX: "Tasks for Markdown" 검색
- `.vsix`: 확장 뷰 `…` › *Install from VSIX…* 또는 `code --install-extension <file>.vsix`
