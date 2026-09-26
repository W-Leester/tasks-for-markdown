# @hastycapybara/tasks-cli

Tasks for Markdown의 명령줄 도구입니다. 편집기를 띄우지 않고 마크다운 폴더의 태스크를 조회하고 만들고 완료합니다. 확장과 같은 코드(`@hastycapybara/tasks-core`)를 쓰므로 완료일·반복 다음 회차·필드 순서가 편집기에서 한 것과 똑같습니다.

```bash
npx @hastycapybara/tasks-cli query "not done
due before today" --root ~/notes --md

tasksmd add "월간 결산 #업무 ⏫ 📅 2026-10-05" --file notes/inbox.md
tasksmd done notes/todo.md:12 --expect "- [ ] 원문 줄"      # 줄이 바뀌었으면 거부(STALE_LINE)
tasksmd set notes/todo.md:12 --due 2026-10-20 --priority 1
tasksmd postpone notes/todo.md:12 "next monday"
tasksmd query "not done" --json | jq '.tasks[] | select(.priority == "0") | .description'
```

- `--root`(기본 현재 폴더) 아래의 `.md`/`.markdown`을 `.gitignore`와 `tasksmd.exclude`를 존중해 훑습니다. 설정은 `<root>/.vscode/settings.json`의 `tasksmd.*`를 읽습니다(전역 필터, 완료일 기록, 반복 삽입 위치, 사용자 정의 상태 등).
- 줄 번호는 사람이 읽는 1부터 시작하는 번호입니다. 출력은 터미널이면 마크다운, 파이프면 JSON이 기본이고 `--json`/`--md`로 고정합니다.
- 파일을 직접 고칩니다. 편집기에 저장하지 않은 변경이 있는 파일을 고치면 편집기가 "덮어쓸까요?"를 물을 수 있으니 저장한 뒤 쓰세요. `--expect`로 줄 원문을 함께 주면 그사이 바뀐 줄을 덮어쓰지 않습니다.
- 종료 코드: 0 성공, 1 실행 오류(`NOT_FOUND`, `STALE_LINE`, `INVALID_QUERY`, `IO`), 2 인자 오류.

## MCP 서버 (AI 에이전트)

```bash
claude mcp add tasks -- npx -y @hastycapybara/tasks-cli mcp --root "$PWD"
```
등록 후 Claude Code에 "이번 주 마감인 업무 태스크 중 안 끝난 거 보여주고 계약서 검토는 완료 처리해 줘"처럼 말하면 `tasks_query`, `tasks_set_status` 도구가 호출됩니다. 도구 목록과 인자는 저장소의 docs/api.md 8절에 있습니다.

라이선스 MIT.
