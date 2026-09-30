# 릴리스 절차

## 한 번만 (계정·토큰)

1. **VS Code Marketplace**: https://marketplace.visualstudio.com/manage 에서 퍼블리셔 `hastycapybara` 생성 → Azure DevOps에서 PAT(Marketplace › Manage 권한) 발급 → GitHub 저장소 Secrets에 `VSCE_PAT`.
2. **Open VSX** (Cursor용): https://open-vsx.org 에서 로그인 → 네임스페이스 `hastycapybara` 생성(`ovsx create-namespace hastycapybara -p <token>`) → Secrets에 `OVSX_PAT`.
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
- [ ] **패키징.** `pnpm package` → `.vsix`와 `dist/latest.json`, 타입 파일 `dist/api-types/api/types.d.ts` 포함 확인(`unzip -l`).
- [ ] **이전 `.vsix` 삭제**, 새 파일로 설치 확인.
- [ ] **출처 고지.** 새로 이식한 코드가 있으면 파일 상단 주석과 NOTICE.md 목록에 추가. 새 런타임 의존성은 NOTICE.md 표에 라이선스와 함께.
- [ ] 태그 `v<버전>` 푸시(Actions가 게시).

### C. 마켓플레이스 첫 공개(1.0.0) 때 한 번

- [ ] **버전 번호 결정.** 내부 버전이 이미 1.x(현재 1.13 근처)라 1.0.0으로 내리면 **번호가 뒤로 간다.** 영향:
  - 사내 `.vsix` 사용자의 업데이트 알림(`latest.json` 비교)이 1.0.0을 "새 버전"으로 보지 않는다 → 사내 사용자에게 수동 설치 안내, 또는 `latest.json` 교체.
  - Marketplace·Open VSX에는 아직 올린 적이 없으니 1.0.0으로 시작해도 문제없다.
  - 대안: 공개 버전을 지금 번호 다음(예 1.14.0)으로 이어 가기. 결정 후 이 줄을 갱신.
- [ ] **CHANGELOG 정리.** 내부 이력을 "1.0.0 — 첫 공개" 요약으로 묶을지 결정(사용자 결정: 1.0.0 때 정리). docs/post-release-changes.md(1.4.0 이후 갱신 안 됨)도 이때 정리.
- [ ] **npm 패키지 발행**: `@hastycapybara/tasks-core`, `@hastycapybara/tasks-cli`, 그리고 타입 패키지 `@hastycapybara/tasks-api`(src/api/types.ts로 만든 `.d.ts`만 담은 패키지; 폴더 `packages/api` 신설). npm 계정·스코프 `hastycapybara` 필요.
- [ ] 계정: Marketplace 퍼블리셔 `hastycapybara`, Open VSX 네임스페이스, npm 스코프(위 "한 번만" 절).
- [ ] 마켓플레이스 소개문(package.json `description`, README 첫머리)과 Obsidian Tasks 출처 문구 최종 확인. 로고·이름을 우리 것처럼 쓰지 않았는지.
- [ ] docs/manual-checklist.md 수동 테스트 한 바퀴.

## 사내 `.vsix` 배포 (보조 경로)

1. Release에 첨부된 `tasks-for-markdown-<ver>.vsix`와 `latest.json`을 사내 공유 경로(파일 서버 또는 HTTP)에 올린다.
2. `latest.json`의 `vsix`를 실제 경로/URL로 고친다 (`node scripts/make-latest.mjs "<경로>" "<릴리스 노트>"`로 생성 가능).
3. 사용자는 `tasksmd.updateCheckUrl`에 `latest.json` 위치를 설정하면 하루 1회 새 버전 알림을 받는다. Marketplace 설치본은 자동 업데이트되므로 알림이 뜨지 않는다.

## 설치 방법 (사용자)

- Marketplace / Open VSX: "Tasks for Markdown" 검색
- `.vsix`: 확장 뷰 `…` › *Install from VSIX…* 또는 `code --install-extension <file>.vsix`
