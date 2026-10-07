# 제3자 고지 (Third-party notices)

## Obsidian Tasks

`src/core/`의 태스크 파싱·직렬화, 반복(recurrence), 긴급도(urgency), 쿼리 로직 일부는
[Obsidian Tasks](https://github.com/obsidian-tasks-group/obsidian-tasks)에서 이식했거나 그 구현을 참고했습니다.
Copyright (c) 2021 Martin Schenck and Clare Macrae, MIT 라이선스.

이식한 파일에는 상단 주석으로 출처를 표시했습니다:
`src/core/recurrence/Recurrence.ts`, `src/core/task/Urgency.ts`, `src/core/task/statusPresets.ts`,
`tests/core/task/obsidian-port.test.ts`, `tests/core/recurrence/Recurrence.test.ts`, `tests/core/task/Urgency.test.ts`.

MIT 라이선스 전문은 `LICENSE`와 같습니다. 이 프로젝트는 Obsidian Tasks 프로젝트나 Obsidian(Dynalist Inc.)과
관련이 없으며, 그들의 보증을 받지 않았습니다.

## 함께 배포하는 오픈소스 (Bundled open-source packages)

확장(`dist/extension.js`), 웹뷰, `tasksmd` 명령·MCP 서버(`dist/tasksmd.cjs`, npm `@hastycapybara/tasks-cli`)에 함께 묶여 배포되는 패키지 목록과 **라이선스 전문**은 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)에 있습니다(빌드 때 자동 생성, 테스트가 최신인지 확인). 주요 패키지: dayjs, rrule, ignore, markdown-it, svelte, @modelcontextprotocol/sdk, zod, ajv — 모두 MIT·ISC·BSD 계열.

The full list of bundled packages with their license texts is in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) (generated at build time).
