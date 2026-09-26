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

## 사내 `.vsix` 배포 (보조 경로)

1. Release에 첨부된 `tasks-for-markdown-<ver>.vsix`와 `latest.json`을 사내 공유 경로(파일 서버 또는 HTTP)에 올린다.
2. `latest.json`의 `vsix`를 실제 경로/URL로 고친다 (`node scripts/make-latest.mjs "<경로>" "<릴리스 노트>"`로 생성 가능).
3. 사용자는 `tasksmd.updateCheckUrl`에 `latest.json` 위치를 설정하면 하루 1회 새 버전 알림을 받는다. Marketplace 설치본은 자동 업데이트되므로 알림이 뜨지 않는다.

## 설치 방법 (사용자)

- Marketplace / Open VSX: "Tasks for Markdown" 검색
- `.vsix`: 확장 뷰 `…` › *Install from VSIX…* 또는 `code --install-extension <file>.vsix`
