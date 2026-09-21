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

## 런타임 의존성

| 패키지 | 라이선스 | 용도 |
|---|---|---|
| [dayjs](https://github.com/iamkun/dayjs) | MIT | 날짜 계산 |
| [rrule](https://github.com/jkbrzt/rrule) | BSD-3-Clause | 반복 규칙 해석 |
| [ignore](https://github.com/kaelzhang/node-ignore) | MIT | `.gitignore` 규칙 적용 |
| [svelte](https://github.com/sveltejs/svelte) (웹뷰 번들에 포함) | MIT | 웹뷰 UI |
