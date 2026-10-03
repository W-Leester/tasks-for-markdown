# 실패 기록 (Postmortems)

실패와 그 원인을 남겨, 같은 일을 다시 겪지 않거나 겪더라도 빨리 끝내기 위한 폴더입니다. 누구의 잘못을 따지지 않고(blameless), **무엇이 일어났고 다음엔 어떻게 할지**에 집중합니다.

| 문서 | 내용 |
|---|---|
| [2026-10-01-marketplace-upload-rejected.md](2026-10-01-marketplace-upload-rejected.md) | VS Code Marketplace 첫 업로드 거절("suspicious content") — 원인은 검색어, 2026-10-02 해결 |
| [incidents.md](incidents.md) | 개발 중 실패 사례 모음(24건): 증상 → 원인 → 해결 → 재발 방지 |

## 쓰는 법
- **큰 사건**(공개·배포가 막힘, 사용자 데이터에 영향, 반나절 이상 소요): 날짜로 시작하는 별도 문서로 쓴다. 형식: 요약 → 타임라인 → 원인 → 잘한 점 / 아쉬운 점 → 재발 방지(조치와 상태) → 결과.
- **작은 사건**: [incidents.md](incidents.md)에 한 항목으로 추가한다.
- 고친 커밋 해시를 함께 적는다.
- 같은 교훈이 다른 프로젝트에도 해당하면 [배포 가이드라인](../publishing-guide.md)에도 반영한다.

## 관련 문서
- [배포 가이드라인](../publishing-guide.md) — 다른 확장에도 쓸 수 있는 일반 절차
- [release.md](../release.md) — 이 프로젝트의 배포 체크리스트
- [history-internal.md](../history-internal.md) — 공개 전 내부 개발 이력(초기 실패의 상세 경위 포함)
