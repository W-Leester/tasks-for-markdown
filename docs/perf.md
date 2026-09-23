# 성능 측정 (M8.2)

측정일 2026-09-21 · Apple Silicon(arm64) macOS · Node 26 · `BENCH=1 pnpm vitest run tests/perf`

## 합성 워크스페이스

`tests/perf/parse.bench.test.ts`가 5,000개 파일(프론트매터·헤딩·본문·코드블록 포함, 파일당 태스크 13개)을 메모리에서 생성해 파싱한다. 목표(NFR-2): 5,000 파일 / 50,000 태스크.

| 항목 | 결과 | 목표 |
|---|---|---|
| 5,000 파일 / 65,000 태스크 파싱 + 인덱스 적재 (CPU) | **265 ms** (0.053 ms/파일) | 초기 스캔 < 5 s (파일 I/O 포함) |
| 단일 파일 재인덱스 | **0.12 ms** | < 50 ms |

실제 초기 스캔은 여기에 `workspace.findFiles` + `fs.stat`/`readFile` 5,000회가 더해진다. 50파일 청크마다 이벤트 루프에 양보하므로 UI는 차단되지 않는다(진행률은 상태바).

## 쿼리 (50,000 태스크, `tests/perf/query.bench.test.ts`)

| 쿼리 | 시간 | 일치 |
|---|---|---|
| `not done` | 62 ms | 41,666 |
| `not done` + `due before next week` + `sort by urgency` | 31 ms | 8,333 |
| `(tags include #work) OR (priority is high)` + `sort by due` | 35 ms | 20,000 |
| `not done` + `group by folder` + `group by due` | 76 ms | 41,666 |
| `description regex matches /^(report|deploy)/` | 21 ms | 12,500 |
| `filter by function task.priorityNumber < 3 && task.due.isValid` | 105 ms | 3,334 |

목표 < 100 ms. 첫 구현은 `not done`이 780 ms였고, 정렬 키 사전 계산(decorate-sort-undecorate) + 날짜 그룹명 캐시 + 할당 없는 urgency 계산으로 55~75 ms가 되었다. `by function`은 태스크마다 스크립트 객체를 만들어 약간 넘지만 opt-in 기능이라 허용.

## 메모리

Task 객체는 원문 + 파싱 필드만 보유. 65,000 태스크 인덱스가 vitest 프로세스에서 약 60 MB(힙 증가분 관측치) — D§9 상한(≈50 MB/50k)과 비슷한 수준.

## 남은 튜닝 후보

- 초기 스캔의 `fs.stat` 생략(크기 제한은 읽은 뒤 바이트 길이로 판단)
- 트리 뷰 5,000+ 노드 가상화는 VS Code가 처리하므로 별도 조치 없음
- 칸반 컬럼 150장 이상은 윈도잉(보이는 범위 ± 6장, 카드 64px 추정 스페이서). 캘린더 월간 칸은 높이에 맞는 개수만 표시. 쿼리 결과 패널·렌더 보기 긴 목록은 `content-visibility: auto`
