# docs/imgs

`design.md`에 삽입되는 SVG 이미지와 생성 스크립트.

| 파일 | 출처 | 재생성 |
|---|---|---|
| `02-…`, `04-…`, `05-…`(5.7 렌더 보기 포함), `06-…`, `07-2-…`, `08-…`, `12-…`, `13-…` | `design.md`의 Mermaid 블록 | `python3 docs/imgs/render-mermaid.py` |
| `03-1-layers.svg`, `04-1-line-anatomy.svg`, `07-1/3/4/5/6/8/9-….svg` | 직접 그린 UI 목업 / 레이어 다이어그램 | `python3 docs/imgs/gen_mockups.py` |

- Mermaid 렌더링은 `mermaid.config.json`을 사용하며 `htmlLabels: false`로 두어 `foreignObject` 없이 순수 `<text>`로 출력한다 (GitHub `<img>`, VS Code 미리보기 모두에서 안전).
- `design.md`의 Mermaid 블록을 수정했으면 `render-mermaid.py`를 다시 실행하고, 블록을 추가/삭제했으면 그 안의 `NAMES` 순서도 맞춘다.
- 목업 SVG는 외부 폰트 없이 시스템 폰트 스택만 사용한다.
