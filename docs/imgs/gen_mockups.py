# Generates hand-drawn SVG mockups for docs/design.md
import html, os
import os as _os
OUT = _os.path.dirname(_os.path.abspath(__file__))
FONT = "'Apple SD Gothic Neo','Noto Sans KR','Helvetica Neue',Arial,sans-serif"
MONO = "'SF Mono','JetBrains Mono',Menlo,Consolas,monospace"

# Palette (VS Code light-ish, readable on GitHub light & dark since we paint a bg)
C = dict(bg='#ffffff', panel='#f3f3f3', panel2='#e8e8e8', border='#c8c8c8', text='#1f1f1f', muted='#6b6b6b',
         accent='#0066b8', accentbg='#dbe9f7', warn='#bf8803', warnbg='#fff4ce', err='#c72e2e', errbg='#fde7e9',
         ok='#2e7d32', okbg='#e6f4ea', done='#9a9a9a', code='#f6f8fa', purple='#7c4dff', chip='#eaeaea',
         layer1='#fff8e1', layer2='#e8f5e9', layer3='#e3f2fd', layer4='#f3e5f5', node='#ffffff')

def esc(s): return html.escape(str(s), quote=True)

class SVG:
    def __init__(s, w, h, title):
        s.w, s.h, s.el = w, h, []
        s.title = title
    def rect(s, x, y, w, h, fill=C['node'], stroke=C['border'], r=4, sw=1, dash=None, opacity=None):
        d = f' stroke-dasharray="{dash}"' if dash else ''
        o = f' opacity="{opacity}"' if opacity is not None else ''
        s.el.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}{o}/>')
    def text(s, x, y, t, size=13, fill=C['text'], anchor='start', weight='normal', mono=False, italic=False, opacity=None):
        fam = MONO if mono else FONT
        st = ' font-style="italic"' if italic else ''
        o = f' opacity="{opacity}"' if opacity is not None else ''
        s.el.append(f'<text x="{x}" y="{y}" font-family="{fam}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" font-weight="{weight}"{st}{o}>{esc(t)}</text>')
    def line(s, x1, y1, x2, y2, stroke=C['border'], sw=1, dash=None, marker=False):
        d = f' stroke-dasharray="{dash}"' if dash else ''
        m = ' marker-end="url(#arrow)"' if marker else ''
        s.el.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{stroke}" stroke-width="{sw}"{d}{m}/>')
    def path(s, d, stroke=C['muted'], sw=1.5, marker=True, dash=None, fill='none'):
        da = f' stroke-dasharray="{dash}"' if dash else ''
        m = ' marker-end="url(#arrow)"' if marker else ''
        s.el.append(f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{da}{m}/>')
    def circle(s, cx, cy, r, fill, stroke='none'):
        s.el.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" stroke="{stroke}"/>')
    def chip(s, x, y, t, fill=C['chip'], color=C['text'], size=11, pad=6, h=18, mono=False):
        w = int(len(t) * (size * 0.62 if not any('가' <= ch <= '힣' for ch in t) else size * 0.95)) + pad * 2
        # better width estimate: count wide chars
        wide = sum(1 for ch in t if ord(ch) > 0x2e80)
        narrow = len(t) - wide
        w = int(wide * size * 1.0 + narrow * size * 0.6) + pad * 2
        s.rect(x, y, w, h, fill=fill, stroke='none', r=9)
        s.text(x + w / 2, y + h * 0.7, t, size=size, fill=color, anchor='middle', mono=mono)
        return w
    def checkbox(s, x, y, checked=False, size=12, partial=False):
        s.rect(x, y, size, size, fill='#fff' if not checked else C['accent'], stroke=C['accent'] if not checked else C['accent'], r=2, sw=1.2)
        if checked:
            s.path(f'M{x+2.5} {y+size/2} l{size*0.22} {size*0.25} l{size*0.42} -{size*0.5}', stroke='#fff', sw=1.8, marker=False)
        if partial:
            s.line(x+3, y+size-3, x+size-3, y+3, stroke=C['accent'], sw=1.5)
    def save(s, name):
        defs = ('<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">'
                '<path d="M0 0 L10 5 L0 10 z" fill="#666"/></marker></defs>')
        body = '\n'.join(s.el)
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{s.w}" height="{s.h}" viewBox="0 0 {s.w} {s.h}" font-family="{FONT}">'
               f'<title>{esc(s.title)}</title>{defs}<rect width="{s.w}" height="{s.h}" fill="{C["bg"]}" rx="8"/>\n{body}\n</svg>')
        with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f: f.write(svg)
        print('wrote', name)

# ---------------------------------------------------------------- 3.1 layers (hand-drawn)
def layers():
    s = SVG(1100, 690, '3.1 레이어 구조')
    s.text(20, 30, '레이어 구조 — 위에서 아래로만 의존 (Core는 vscode를 모른다)', size=15, weight='bold')
    x0, W = 20, 880
    def layer(y, h, title, fill, boxes, note=None):
        s.rect(x0, y, W, h, fill=fill, stroke=C['border'], r=8)
        s.text(x0 + 14, y + 20, title, size=13, weight='bold', fill=C['muted'])
        n = len(boxes); gap = 14; bw = (W - 28 - gap * (n - 1)) / n
        for i, (t, lines) in enumerate(boxes):
            bx = x0 + 14 + i * (bw + gap); by = y + 30; bh = h - 44
            s.rect(bx, by, bw, bh, fill=C['node'], stroke=C['border'], r=6)
            s.text(bx + bw / 2, by + 20, t, size=13, anchor='middle', weight='bold', mono=True)
            for j, l in enumerate(lines):
                s.text(bx + bw / 2, by + 40 + j * 16, l, size=11.5, anchor='middle', fill=C['muted'])
    layer(50, 130, 'Presentation — VS Code UI', C['layer4'], [
        ('editor/', ['Decoration · CodeLens', 'Hover · Completion', 'Diagnostics · QuickPick']),
        ('views/', ['TreeView', '(스마트 뷰 · 저장 쿼리)', 'StatusBar']),
        ('webviews/ (Svelte)', ['편집 모달 · 칸반', '쿼리 빌더', '캘린더 · 통계']),
        ('preview/', ['markdown-it 플러그인', '미리보기 스크립트', 'PreviewBridge'])])
    layer(200, 130, 'Application', C['layer3'], [
        ('commands/', ['명령 등록 · 라우팅', '키바인딩 · 메뉴']),
        ('services/', ['TaskEditService (유일한 쓰기 경로)', 'QueryService · SavedQueryStore', 'Notification · Archive · Stats · UpdateCheck'])])
    layer(350, 120, 'Index', C['layer2'], [
        ('index/', ['WorkspaceScanner · FileWatcher', 'TaskIndex (in-memory, 파일 단위 교체)', 'IndexEvents → 구독자에게 변경 통지'])])
    layer(490, 150, 'Core — vscode 의존 없음 (Vitest로 단위 테스트, v1.x MCP 서버에서 재사용)', C['layer1'], [
        ('core/task', ['Task · Parser', 'Serializer · Status', 'Priority · Urgency']),
        ('core/recurrence', ['rrule 래퍼', 'next() · when done']),
        ('core/dates', ['자연어 · 상대 날짜', '범위 (week/month/Q)']),
        ('core/query', ['Tokenizer · Filters', 'Sort · Group', 'Layout · Explain']),
        ('core/archive·stats', ['순수 계산'])])
    # arrows between layers (dependency)
    for (y1, y2) in [(180, 200), (330, 350), (470, 490)]:
        s.path(f'M{x0+W/2} {y1} L{x0+W/2} {y2}', stroke=C['muted'], sw=2)
    s.text(x0 + W/2 + 10, 194, '의존', size=11, fill=C['muted'])
    s.text(x0 + W/2 + 10, 344, '의존', size=11, fill=C['muted'])
    s.text(x0 + W/2 + 10, 484, '의존', size=11, fill=C['muted'])
    # subscription dashed arrow from Index up to Presentation (right side)
    s.path(f'M{x0+W-30} 350 L{x0+W-30} 180', stroke=C['accent'], sw=1.5, dash='5,4')
    s.text(x0 + W - 36, 270, '이벤트 구독', size=11, fill=C['accent'], anchor='end')
    # settings box on the right
    sx = x0 + W + 20
    s.rect(sx, 50, 180, 590, fill=C['panel'], stroke=C['border'], r=8)
    s.text(sx + 90, 75, 'settings/', size=13, anchor='middle', weight='bold', mono=True)
    for i, l in enumerate(['설정 스키마', '타입 안전 읽기', 'onDidChange 이벤트']):
        s.text(sx + 90, 100 + i * 16, l, size=11.5, anchor='middle', fill=C['muted'])
    for y in (115, 265, 410, 565):
        s.path(f'M{sx} {y} L{x0+W} {y}', stroke=C['muted'], sw=1, dash='3,3')
    s.text(sx + 90, 630, '모든 레이어가 참조', size=11, anchor='middle', fill=C['muted'], italic=True)
    # legend
    s.text(20, 672, '실선 = import 의존 · 점선 = 이벤트 구독/설정 참조 · 가로 레이어끼리(editor/views/webviews/preview)는 서로 참조하지 않음', size=11, fill=C['muted'])
    s.save('03-1-layers.svg')

# ---------------------------------------------------------------- 4.1 line anatomy
def anatomy():
    s = SVG(1180, 360, '4.1 한 줄의 해부')
    s.text(20, 30, '태스크 한 줄의 구조 — 파서는 줄 끝에서부터 필드를 벗겨내고, 남은 앞부분을 description으로 삼는다 (필드 순서 무관)', size=14, weight='bold')
    toks = [('␣␣', 'indentation', C['muted']), ('-', 'listMarker', C['muted']), ('[ ]', 'status.symbol', C['accent']),
            ('보고서 작성 #work', 'description (+tags)', C['text']), ('🆔 a1b2c3', 'id', C['accent']), ('⏫', 'priority', '#d84315'),
            ('🔁 every week', 'recurrence', C['purple']), ('🛫 2026-09-20', 'start', C['ok']), ('⏳ 2026-09-22', 'scheduled', C['warn']),
            ('📅 2026-09-25', 'due', C['err']), ('^blk1', 'blockLink', C['muted'])]
    x = 70; y = 70; h = 40
    s.rect(16, 58, 1148, 64, fill=C['code'], stroke=C['border'], r=6)
    for i, (t, lbl, col) in enumerate(toks):
        wide = sum(1 for ch in t if ord(ch) > 0x2e80); narrow = len(t) - wide
        w = int(wide * 17 + narrow * 9) + 18
        s.rect(x, y, w, h, fill='#fff', stroke=col, r=5, sw=1.5)
        s.text(x + w / 2, y + 26, t, size=15, fill=col, anchor='middle', mono=True)
        row = i % 3
        ly = y + h + 26 + row * 30
        s.line(x + w / 2, y + h, x + w / 2, ly - 16, stroke=col, sw=1, dash='2,2')
        lw = len(lbl) * 7.2 + 16
        s.rect(x + w / 2 - lw / 2, ly - 14, lw, 20, fill='#fff', stroke=col, r=10)
        s.text(x + w / 2, ly, lbl, size=11, fill=col, anchor='middle', mono=True)
        x += w + 6
    s.text(20, 245, '읽기: 줄 끝에서부터  blockLink → 날짜/ID/반복/우선순위 정규식을 반복 매칭  → 남은 텍스트 = description',
           size=12, fill=C['muted'])
    s.text(20, 270, '쓰기(Obsidian과 동일): description → 🆔 id → ⛔ dependsOn → priority → 🔁 recurrence → 🏁 onCompletion → ➕ created → 🛫 start → ⏳ scheduled → 📅 due → ❌ cancelled → ✅ done → blockLink',
           size=12, fill=C['muted'])
    s.text(20, 305, 'Dataview 포맷도 동일 구조:  - [ ] 보고서 작성 #work [id:: a1b2c3] [priority:: high] [repeat:: every week] [start:: 2026-09-20] [scheduled:: 2026-09-22] [due:: 2026-09-25]',
           size=10.5, fill=C['muted'], mono=True)
    s.text(20, 340, 'Task는 불변(immutable) — 변경은 새 Task를 만들어 직렬화 → 파일 쓰기 → 변경 이벤트로 재파싱', size=12, fill=C['accent'])
    s.save('04-1-line-anatomy.svg')

# ---------------------------------------------------------------- 7.1 overall layout
def layout():
    W, H = 1280, 600
    s = SVG(W, H, '7.1 전체 레이아웃')
    # title bar
    s.rect(0, 0, W, 34, fill='#dddddd', stroke='none', r=0)
    s.text(W/2, 22, 'week-38.md — Tasks-workspace', size=12, anchor='middle', fill=C['muted'])
    # activity bar
    s.rect(0, 34, 48, H - 34 - 24, fill='#2c2c2c', stroke='none', r=0)
    for i, ic in enumerate(['⎘', '🔍', '⑂', '▶', '⊞']):
        s.text(24, 70 + i * 44, ic, size=18, anchor='middle', fill='#9a9a9a')
    s.rect(0, 34 + 5 * 44 - 4, 3, 36, fill='#fff', stroke='none', r=0)
    s.text(24, 70 + 5 * 44, '☑', size=20, anchor='middle', fill='#ffffff')
    s.text(24, 70 + 5 * 44 + 16, 'TASKS', size=7, anchor='middle', fill='#ffffff')
    # sidebar
    sx, sw = 48, 270
    s.rect(sx, 34, sw, H - 34 - 24, fill=C['panel'], stroke='none', r=0)
    s.text(sx + 14, 56, 'TASKS', size=11, weight='bold', fill=C['muted'])
    y = 80
    def section(title):
        nonlocal y
        s.rect(sx, y - 14, sw, 22, fill=C['panel2'], stroke='none', r=0)
        s.text(sx + 12, y + 1, '▾ ' + title, size=12, weight='bold'); y += 24
    def item(label, count=None, icon='☐', sel=False, color=None):
        nonlocal y
        if sel: s.rect(sx, y - 13, sw, 22, fill=C['accentbg'], stroke='none', r=0)
        s.text(sx + 26, y + 2, icon, size=12, fill=color or C['muted'])
        s.text(sx + 44, y + 2, label, size=12.5)
        if count is not None:
            s.chip(sx + sw - 46, y - 10, str(count), fill=C['chip'], size=10, h=16, pad=6)
        y += 22
    section('스마트 뷰')
    item('오늘', 4, sel=True, color=C['accent']); item('예정 7일', 12); item('기한 초과', 2, icon='⚠', color=C['err'])
    item('진행 중', 3, icon='◐'); item('차단됨', 1, icon='⛔'); item('미완료 전체', 57); item('완료 (30일)', 41, icon='☑')
    y += 6; section('저장된 쿼리')
    item('이번 주 업무', icon='⚙', color=C['accent']); item('프로젝트 A', icon='📄'); item('새 쿼리…', icon='+', color=C['accent'])
    y += 6; section('칸반')
    kx = sx + 12; kw = (sw - 24 - 8) / 2
    for i, (t, n) in enumerate([('할 일', 12), ('진행', 3)]):
        s.rect(kx + i * (kw + 8), y - 8, kw, 110, fill='#fff', stroke=C['border'], r=4)
        s.text(kx + i * (kw + 8) + 8, y + 8, f'{t} ({n})', size=11, weight='bold')
        for j in range(2 if i == 0 else 1):
            s.rect(kx + i * (kw + 8) + 6, y + 16 + j * 40, kw - 12, 34, fill=C['panel'], stroke=C['border'], r=3)
            s.text(kx + i * (kw + 8) + 12, y + 30 + j * 40, ['보고서 작성', '예산안', '배포 준비'][i * 2 + j], size=10.5)
            s.text(kx + i * (kw + 8) + 12, y + 43 + j * 40, ['📅 9/25', '⚠ 2일 지남', '⛔ 대기 1'][i * 2 + j], size=9.5, fill=C['muted'])
    # editor
    ex, ew = sx + sw, 500
    s.rect(ex, 34, ew, H - 34 - 24, fill='#fff', stroke='none', r=0)
    s.rect(ex, 34, ew, 30, fill=C['panel2'], stroke='none', r=0)
    s.rect(ex, 34, 150, 30, fill='#fff', stroke='none', r=0)
    s.text(ex + 12, 54, 'week-38.md', size=12)
    s.text(ex + 12 + 150, 54, 'Archive.md', size=12, fill=C['muted'])
    lines = [
        ('## 이번 주', 'h', None),
        ('', 'blank', None),
        ('    ✔ 완료  ·  ⏫ 높음 ▾  ·  📅 9/25 ▾  ·  🔁 매주 ▾  ·  ✎ 편집', 'lens', None),
        ('- [ ] 보고서 작성 #work ⏫ 📅 2026-09-25', 'task', '⏳ 4일 남음'),
        ('- [x] 회의록 정리 ✅ 2026-09-21', 'done', None),
        ('- [ ] 배포 준비 ⛔ a1b2c3', 'task', '⛔ 대기 중 (1)'),
        ('- [ ] 계약서 검토 📅 2026-09-19', 'overdue', '⚠ 2일 지남'),
        ('', 'blank', None),
        ('```tasks', 'code', None),
        ('not done', 'code', None),
        ('due before next week', 'code', None),
        ('sort by urgency', 'code', None),
        ('```', 'code', None),
    ]
    ly = 90
    for i, (t, kind, deco) in enumerate(lines):
        yy = ly + i * 24
        if kind == 'lens':
            s.text(ex + 46, yy, t, size=10.5, fill=C['accent'], mono=True); continue
        if kind == 'overdue': s.rect(ex + 40, yy - 15, ew - 50, 22, fill=C['errbg'], stroke='none', r=3)
        if kind == 'task' and i == 3: s.rect(ex + 40, yy - 15, ew - 50, 22, fill='#f0f6ff', stroke='none', r=3)
        s.text(ex + 14, yy, str(i + 11) if kind != 'blank' else '', size=11, fill=C['muted'], mono=True, anchor='start')
        col = C['text']
        if kind == 'h': col = C['accent']
        if kind == 'done': col = C['done']
        if kind == 'code': col = '#6a3d9a'
        if kind in ('task', 'overdue', 'done'):
            # split description vs fields: fields drawn muted
            head = t[:6]; rest = t[6:]
            idx = next((k for k, ch in enumerate(rest) if ch in '⏫🔁📅✅⛔'), len(rest))
            s.text(ex + 46, yy, head + rest[:idx], size=12.5, fill=col, mono=True)
            s.text(ex + 46 + (len(head) * 7.4) + sum(15 if ord(c) > 0x2e80 else 7.4 for c in rest[:idx]), yy, rest[idx:], size=12.5, fill=C['muted'], mono=True)
        else:
            s.text(ex + 46, yy, t, size=12.5, fill=col, mono=True)
        if deco:
            s.text(ex + ew - 14, yy, deco, size=11, fill=C['err'] if '⚠' in deco else C['muted'], anchor='end', italic=True)
    s.text(ex + ew - 14, 138, '← CodeLens (커서 줄에만)', size=10.5, fill=C['accent'], italic=True, anchor='end')
    ny = 430
    s.rect(ex + 40, ny, ew - 50, 84, fill=C['panel'], stroke='none', r=6)
    s.text(ex + 52, ny + 20, '에디터 안 보조 UI', size=11, weight='bold', fill=C['muted'])
    s.text(ex + 52, ny + 40, '· CodeLens: 커서 줄 위에 클릭 가능한 액션', size=10.5, fill=C['muted'])
    s.text(ex + 52, ny + 56, '· 줄 끝 장식(이탤릭): 상대 날짜 · 차단 · 경고', size=10.5, fill=C['muted'])
    s.text(ex + 52, ny + 72, '· 기한 초과 줄 배경색 · 필드는 옅은 색 · 완료는 회색', size=10.5, fill=C['muted'])
    # preview
    px, pw = ex + ew, W - ex - ew
    s.rect(px, 34, pw, H - 34 - 24, fill='#fafafa', stroke='none', r=0)
    s.line(px, 34, px, H - 24, stroke=C['border'])
    s.rect(px, 34, pw, 30, fill=C['panel2'], stroke='none', r=0)
    s.text(px + 12, 54, 'Preview: week-38.md', size=12)
    s.text(px + 20, 100, '이번 주', size=18, weight='bold')
    def ptask(y, label, chips, checked=False, overdue=False):
        s.checkbox(px + 20, y - 11, checked=checked, size=13)
        s.text(px + 42, y, label, size=13, fill=C['done'] if checked else C['text'])
        cx = px + 42
        for (t, f, c) in chips:
            cx += 0
        cy = y + 8
        cx = px + 42
        for (t, f, c) in chips:
            cx += s.chip(cx, cy, t, fill=f, color=c, size=10, h=16) + 5
        s.text(px + pw - 16, y, '✎', size=12, fill=C['muted'], anchor='end')
    ptask(130, '보고서 작성 #work', [('높음', '#ffe0d6', '#b3341c'), ('📅 9/25 · 4일 남음', C['chip'], C['text']), ('🔁 매주', '#ede7f6', C['purple'])])
    ptask(180, '회의록 정리', [('✅ 9/21', C['okbg'], C['ok'])], checked=True)
    ptask(230, '배포 준비', [('⛔ 대기 중 1', C['warnbg'], C['warn'])])
    ptask(280, '계약서 검토', [('📅 9/19 · 2일 지남', C['errbg'], C['err'])])
    # query result card
    qy = 330
    s.rect(px + 16, qy, pw - 32, 140, fill='#fff', stroke=C['border'], r=6)
    s.rect(px + 16, qy, pw - 32, 26, fill=C['panel'], stroke='none', r=6)
    s.text(px + 28, qy + 17, 'tasks 쿼리 결과 · 2개', size=11.5, weight='bold', fill=C['muted'])
    s.text(px + 28, qy + 48, '기한 초과 (2)', size=12, weight='bold')
    s.checkbox(px + 30, qy + 62, size=12); s.text(px + 50, qy + 72, '계약서 검토', size=12); s.chip(px + 150, qy + 61, '⚠ 2일', fill=C['errbg'], color=C['err'], size=10, h=15)
    s.checkbox(px + 30, qy + 88, size=12); s.text(px + 50, qy + 98, '예산안', size=12); s.chip(px + 110, qy + 87, '⚠ 5일', fill=C['errbg'], color=C['err'], size=10, h=15)
    s.text(px + 28, qy + 130, '체크박스 클릭 → 원본 줄 토글 · 제목 클릭 → 원본으로 이동', size=10, fill=C['muted'], italic=True)
    # status bar
    s.rect(0, H - 24, W, 24, fill='#0066b8', stroke='none', r=0)
    s.text(60, H - 8, '☑ 미완료 57 · 오늘 4 · 초과 2', size=11.5, fill='#fff')
    s.text(W - 20, H - 8, '⚠ 1  ·  Markdown  ·  UTF-8', size=11.5, fill='#fff', anchor='end')
    s.save('07-1-layout.svg')

# ---------------------------------------------------------------- 7.3 edit modal
def modal():
    W, H = 760, 560
    s = SVG(W, H, '7.3 편집 모달')
    s.rect(10, 10, W - 20, H - 20, fill='#fff', stroke=C['border'], r=8)
    s.rect(10, 10, W - 20, 40, fill=C['panel'], stroke='none', r=8)
    s.text(28, 36, 'Tasks: Create or edit', size=14, weight='bold')
    s.text(W - 28, 36, '✕', size=14, anchor='end', fill=C['muted'])
    lx, fx = 30, 150
    def label(y, t, key): s.text(lx, y, f'{t}', size=13); s.text(lx + len(t) * 12 + 4, y, f'({key})', size=11, fill=C['muted'])
    def field(y, x, w, val, hint=None, icon=None):
        s.rect(x, y - 16, w, 26, fill='#fff', stroke=C['border'], r=4)
        s.text(x + 8, y + 2, val, size=12.5, mono=True)
        if icon: s.text(x + w - 10, y + 2, icon, size=12, anchor='end', fill=C['muted'])
        if hint: s.text(x + w + 10, y + 2, hint, size=11.5, fill=C['ok'])
    y = 80
    label(y, '설명', 'D'); field(y, fx, 570, '보고서 작성 #work')
    y += 40
    label(y, '우선순위', 'P')
    for i, (t, sel) in enumerate([('최고', 0), ('높음', 1), ('중간', 0), ('없음', 0), ('낮음', 0), ('최저', 0)]):
        cx = fx + 10 + i * 78
        s.circle(cx, y - 4, 6, '#fff', C['accent'])
        if sel: s.circle(cx, y - 4, 3.5, C['accent'])
        s.text(cx + 12, y, t, size=12.5)
    y += 40
    label(y, '반복', 'R'); field(y, fx, 260, 'every week', hint='✓ 매주 월요일')
    y += 30
    s.text(fx, y, '프리셋:', size=11.5, fill=C['muted'])
    cx = fx + 50
    for t in ['매일', '평일', '매주', '매월', '매년']:
        cx += s.chip(cx, y - 13, t, fill=C['accentbg'], color=C['accent'], size=11, h=18) + 6
    s.rect(cx + 14, y - 12, 12, 12, fill='#fff', stroke=C['border'], r=2); s.text(cx + 32, y, 'when done', size=12)
    y += 40
    label(y, '시작', 'S'); field(y, fx, 150, '2026-09-20', icon='📆')
    s.text(fx + 200, y, '예정', size=13); s.text(fx + 228, y, '(C)', size=11, fill=C['muted']); field(y, fx + 260, 150, '2026-09-22', icon='📆')
    y += 40
    label(y, '마감', 'U'); field(y, fx, 150, 'next friday', icon='📆', hint='→ 2026-09-25 (금)')
    y += 36
    s.text(lx, y, '▸ 생성 / 완료 / 취소일 (접힘)', size=12, fill=C['muted'])
    y += 36
    label(y, '상태', 'T'); field(y, fx, 180, '[ ] Todo', icon='▾')
    y += 40
    s.text(lx, y, '의존성', size=13)
    s.text(fx, y, '이 태스크 전에:', size=11.5, fill=C['muted'])
    cx = fx + 100
    cx += s.chip(cx, y - 13, '데이터 수집 (a1b2c3) ×', fill=C['chip'], size=11, h=18) + 6
    s.rect(cx, y - 15, 160, 22, fill='#fff', stroke=C['border'], r=4, dash='3,2'); s.text(cx + 8, y + 1, '검색…', size=11.5, fill=C['muted'])
    y += 28
    s.text(fx, y, '이 태스크 후에:', size=11.5, fill=C['muted']); s.chip(fx + 100, y - 13, '배포 준비 (z9y8x7)', fill=C['chip'], size=11, h=18)
    y += 40
    s.text(lx, y, '완료 시', size=13)
    for i, (t, sel) in enumerate([('유지', 1), ('삭제', 0)]):
        cx = fx + 10 + i * 78
        s.circle(cx, y - 4, 6, '#fff', C['accent'])
        if sel: s.circle(cx, y - 4, 3.5, C['accent'])
        s.text(cx + 12, y, t, size=12.5)
    # preview line
    y += 30
    s.line(20, y, W - 20, y)
    y += 24
    s.text(lx, y, '미리보기', size=11.5, fill=C['muted'])
    s.rect(fx - 40, y - 16, W - fx + 10, 26, fill=C['code'], stroke='none', r=4)
    s.text(fx - 32, y + 2, '- [ ] 보고서 작성 #work ⏫ 🔁 every week 🛫 2026-09-20 ⏳ 2026-09-22 📅 2026-09-25 🆔 a1b2c3', size=11, mono=True)
    y += 44
    s.rect(W - 250, y - 20, 100, 30, fill='#fff', stroke=C['border'], r=4); s.text(W - 200, y, '취소 (Esc)', size=12.5, anchor='middle')
    s.rect(W - 138, y - 20, 108, 30, fill=C['accent'], stroke='none', r=4); s.text(W - 84, y, '적용 (⏎)', size=12.5, anchor='middle', fill='#fff', weight='bold')
    s.save('07-3-edit-modal.svg')

# ---------------------------------------------------------------- 7.4 kanban
def kanban():
    W, H = 1000, 420
    s = SVG(W, H, '7.4 칸반 / 컬럼 뷰')
    s.rect(0, 0, W, 44, fill=C['panel'], stroke='none', r=8)
    x = 16
    for lbl, val in [('컬럼 기준', '상태 ▾'), ('데이터', '저장된 쿼리: 이번 주 업무 ▾'), ('그룹', '파일 ▾')]:
        s.text(x, 28, lbl + ':', size=12, fill=C['muted']); x += len(lbl) * 12 + 10
        w = len(val) * 9 + 20
        s.rect(x, 12, w, 24, fill='#fff', stroke=C['border'], r=4); s.text(x + 10, 28, val, size=12); x += w + 20
    s.rect(W - 200, 12, 184, 24, fill='#fff', stroke=C['border'], r=4); s.text(W - 190, 28, '🔍 필터…', size=12, fill=C['muted'])
    cols = [('할 일', 12, [('보고서 작성', '⏫', [('📅 9/25', C['chip'], C['text']), ('#work', C['accentbg'], C['accent'])]),
                           ('예산안', '', [('⚠ 2일 지남', C['errbg'], C['err'])]),
                           ('계약서 검토', '🔼', [('📅 9/19', C['errbg'], C['err'])])]),
            ('진행 중', 3, [('배포 준비', '', [('⛔ 대기 1', C['warnbg'], C['warn'])])]),
            ('보류', 1, [('벤더 회신 대기', '🔽', [('⏳ 10/2', C['chip'], C['text'])])]),
            ('완료', 8, [('회의록 정리', '', [('✅ 9/21', C['okbg'], C['ok'])]), ('주간 데이터 수집', '', [('✅ 9/20', C['okbg'], C['ok']), ('🔁', '#ede7f6', C['purple'])])])]
    cw = (W - 32 - 12 * 3) / 4
    for i, (t, n, cards) in enumerate(cols):
        cx = 16 + i * (cw + 12); cy = 60
        s.rect(cx, cy, cw, H - 76, fill=C['panel'], stroke=C['border'], r=6)
        s.text(cx + 12, cy + 22, f'{t}', size=13, weight='bold'); s.chip(cx + 12 + len(t) * 13 + 4, cy + 9, str(n), fill=C['panel2'], size=10, h=16)
        for j, (title, pri, chips) in enumerate(cards):
            ky = cy + 40 + j * 78
            done = t == '완료'
            s.rect(cx + 8, ky, cw - 16, 66, fill='#fff', stroke=C['border'], r=5)
            s.text(cx + 16, ky + 22, (pri + ' ' if pri else '') + title, size=12.5, fill=C['done'] if done else C['text'])
            chx = cx + 16
            for (ct, cf, cc) in chips:
                chx += s.chip(chx, ky + 36, ct, fill=cf, color=cc, size=10, h=17) + 5
    # drag hint
    # ghost card being dragged from 할 일 → 진행 중
    gx0 = 16 + cw + 12 + 8; gy0 = 60 + 40 + 78
    s.rect(gx0, gy0, cw - 16, 66, fill='#fff', stroke=C['accent'], r=5, dash='4,3', opacity=0.9)
    s.text(gx0 + 8, gy0 + 22, '예산안', size=12.5, fill=C['accent'])
    s.chip(gx0 + 8, gy0 + 36, '⚠ 2일 지남', fill=C['errbg'], color=C['err'], size=10, h=17)
    s.path(f'M{16 + cw - 8} {gy0 + 33} L{gx0 - 2} {gy0 + 33}', stroke=C['accent'], sw=2, dash='6,4')
    s.rect(gx0, gy0 + 80, cw - 16, 64, fill='#fff', stroke=C['accent'], r=5)
    s.text(gx0 + 10, gy0 + 100, '놓으면 → task/setField', size=11.5, fill=C['accent'], weight='bold')
    s.text(gx0 + 10, gy0 + 118, '상태 컬럼 = status → [/]', size=10.5, fill=C['muted'])
    s.text(gx0 + 10, gy0 + 134, '마감 버킷 = due · 우선순위 = priority', size=10.5, fill=C['muted'])
    s.text(16, H - 6, '카드 클릭 → 편집 모달 · 더블클릭 → 원본으로 이동 · 사이드바 버전은 컬럼을 탭으로 전환', size=11, fill=C['muted'], italic=True)
    s.save('07-4-kanban.svg')

# ---------------------------------------------------------------- 7.5 calendar
def calendar():
    W, H = 1000, 420
    s = SVG(W, H, '7.5 캘린더')
    s.rect(0, 0, W, 44, fill=C['panel'], stroke='none', r=8)
    s.text(16, 28, '◀', size=12, fill=C['muted']); s.text(40, 28, '2026년 9월', size=14, weight='bold'); s.text(130, 28, '▶', size=12, fill=C['muted'])
    s.rect(170, 12, 60, 24, fill=C['accent'], stroke='none', r=4); s.text(200, 28, '월간', size=12, anchor='middle', fill='#fff')
    s.rect(232, 12, 60, 24, fill='#fff', stroke=C['border'], r=4); s.text(262, 28, '주간', size=12, anchor='middle')
    s.text(320, 28, '표시:', size=12, fill=C['muted'])
    x = 360
    for t, on in [('📅 마감', 1), ('⏳ 예정', 1), ('🛫 시작', 0)]:
        s.rect(x, 17, 12, 12, fill=C['accent'] if on else '#fff', stroke=C['accent'], r=2)
        if on: s.path(f'M{x+2.5} {23} l3 3 l5 -6', stroke='#fff', sw=1.6, marker=False)
        s.text(x + 18, 28, t, size=12); x += 80
    s.text(660, 28, '데이터:', size=12, fill=C['muted']); s.rect(710, 12, 110, 24, fill='#fff', stroke=C['border'], r=4); s.text(720, 28, '전체 ▾', size=12)
    s.rect(W - 150, 12, 134, 24, fill='#fff', stroke=C['border'], r=4); s.text(W - 83, 28, '오늘로 이동', size=12, anchor='middle')
    days = ['월', '화', '수', '목', '금', '토', '일']
    gx, gy, cw, ch = 16, 60, (W - 32) / 7, 100
    for i, d in enumerate(days):
        s.rect(gx + i * cw, gy, cw, 24, fill=C['panel2'], stroke=C['border'], r=0)
        s.text(gx + i * cw + cw / 2, gy + 16, d, size=12, anchor='middle', fill=C['err'] if i == 6 else C['text'], weight='bold')
    weeks = [
        [('14', []), ('15', []), ('16', []), ('17', []), ('18', [('📅 예산안', 'over')]), ('19', [('📅 계약서 검토', 'over')]), ('20', [('🛫 보고서 작성', 'start')])],
        [('21', [('📅 회의록 정리', 'done'), ('⏳ 벤더 회신', 'sched')]), ('22', [('⏳ 보고서 작성', 'sched')]), ('23', []), ('24', [('📅 배포 준비', 'due')]), ('25', [('📅 보고서 작성', 'due'), ('📅 주간 보고', 'due'), ('+2', 'more')]), ('26', []), ('27', [])],
        [('28', [('📅 월간 결산', 'due')]), ('29', []), ('30', []), ('1', []), ('2', [('⏳ 벤더 회신', 'sched')]), ('3', []), ('4', [])],
    ]
    colors = dict(over=(C['errbg'], C['err']), due=(C['accentbg'], C['accent']), sched=(C['warnbg'], C['warn']), start=(C['okbg'], C['ok']), done=(C['chip'], C['done']), more=('none', C['muted']))
    for r, week in enumerate(weeks):
        for c, (d, items) in enumerate(week):
            x = gx + c * cw; y = gy + 24 + r * ch
            today = (r == 1 and c == 0)
            s.rect(x, y, cw, ch, fill='#f0f6ff' if today else '#fff', stroke=C['border'], r=0)
            if today: s.circle(x + 16, y + 14, 10, C['accent'])
            s.text(x + 16, y + 18, d, size=11.5, anchor='middle', fill='#fff' if today else (C['muted'] if r == 2 and c >= 3 else C['text']), weight='bold' if today else 'normal')
            for k, (t, kind) in enumerate(items):
                f, col = colors[kind]
                iy = y + 28 + k * 21
                if kind == 'more':
                    s.text(x + 8, iy + 12, t, size=10.5, fill=col); continue
                s.rect(x + 5, iy, cw - 10, 18, fill=f, stroke='none', r=3)
                s.text(x + 10, iy + 13, t, size=10.5, fill=col)
    # drag hint
    tx, ty = gx + 5 * cw + 8, gy + 24 + ch + 50
    s.rect(tx, ty - 2, cw - 16, 18, fill=C['accentbg'], stroke=C['accent'], r=3, dash='4,3')
    s.text(tx + 5, ty + 11, '📅 주간 보고', size=10.5, fill=C['accent'])
    s.path(f'M{gx + 4*cw + cw/2 + 20} {gy+24+ch+58} C {gx + 4*cw + cw - 10} {gy+24+ch+30}, {tx - 30} {ty - 10}, {tx - 3} {ty + 8}', stroke=C['accent'], sw=2, dash='6,4')
    s.text(tx, ty + 34, '드래그 → 📅 변경', size=10.5, fill=C['accent'])
    s.text(gx + 6 * cw + 8, gy + 24 + ch + 60, '빈 칸 더블클릭', size=10.5, fill=C['muted'], italic=True)
    s.text(gx + 6 * cw + 8, gy + 24 + ch + 74, '→ 새 태스크', size=10.5, fill=C['muted'], italic=True)
    s.text(16, H - 10, '항목 클릭 → 편집 모달 · 더블클릭 → 원본 이동 · 색: 기한 초과(빨강) 마감(파랑) 예정(노랑) 시작(초록) 완료(회색)', size=11, fill=C['muted'], italic=True)
    s.save('07-5-calendar.svg')

# ---------------------------------------------------------------- 7.6 stats
def stats():
    W, H = 1000, 440
    s = SVG(W, H, '7.6 주간 통계')
    s.rect(0, 0, W, 44, fill=C['panel'], stroke='none', r=8)
    s.text(16, 28, '최근 12주 (월요일 시작)', size=14, weight='bold')
    s.text(600, 28, '필터:', size=12, fill=C['muted'])
    s.rect(640, 12, 110, 24, fill='#fff', stroke=C['border'], r=4); s.text(650, 28, '태그: #work ▾', size=12)
    s.rect(760, 12, 110, 24, fill='#fff', stroke=C['border'], r=4); s.text(770, 28, '폴더: 전체 ▾', size=12)
    weeks = ['W27', 'W28', 'W29', 'W30', 'W31', 'W32', 'W33', 'W34', 'W35', 'W36', 'W37', 'W38']
    done = [12, 15, 9, 18, 20, 14, 11, 16, 19, 22, 17, 8]
    new = [10, 14, 12, 15, 17, 13, 12, 15, 18, 20, 16, 9]
    over = [1, 0, 2, 1, 3, 2, 1, 0, 1, 2, 1, 2]
    rem = [57, 56, 59, 56, 53, 52, 53, 52, 51, 49, 48, 49]
    # chart area
    cx, cy, cw, ch = 60, 70, 880, 220
    s.rect(cx, cy, cw, ch, fill='#fff', stroke=C['border'], r=4)
    maxv = 25
    for g in range(0, 26, 5):
        y = cy + ch - g / maxv * ch
        s.line(cx, y, cx + cw, y, stroke='#eee'); s.text(cx - 8, y + 4, str(g), size=10, anchor='end', fill=C['muted'])
    bw = cw / 12
    for i in range(12):
        x0 = cx + i * bw
        # bars: done (accent), new (muted), over (err)
        for k, (v, col) in enumerate([(done[i], C['accent']), (new[i], '#9ec5e8'), (over[i], C['err'])]):
            bx = x0 + 10 + k * 18; h = v / maxv * ch
            s.rect(bx, cy + ch - h, 14, h, fill=col, stroke='none', r=2, opacity=0.6 if i == 11 else None)
        s.text(x0 + bw / 2, cy + ch + 16, weeks[i], size=10.5, anchor='middle', fill=C['muted'])
    # remaining line (secondary axis, scaled 40..60)
    pts = []
    for i in range(12):
        x = cx + i * bw + bw / 2; y = cy + ch - (rem[i] - 40) / 20 * ch
        pts.append((x, y))
    s.path('M ' + ' L '.join(f'{x:.1f} {y:.1f}' for x, y in pts), stroke=C['purple'], sw=2, marker=False)
    for x, y in pts: s.circle(x, y, 3, C['purple'])
    for g in (40, 50, 60):
        y = cy + ch - (g - 40) / 20 * ch; s.text(cx + cw + 8, y + 4, str(g), size=10, fill=C['purple'])
    s.text(cx + cw - 60, cy + 14, '(진행 중)', size=10, fill=C['muted'], italic=True)
    # legend
    lx = 60; ly = cy + ch + 44
    for t, col in [('완료', C['accent']), ('신규 (➕ 기준)', '#9ec5e8'), ('기한 초과', C['err'])]:
        s.rect(lx, ly - 10, 12, 12, fill=col, stroke='none', r=2); s.text(lx + 18, ly, t, size=11.5); lx += len(t) * 11 + 40
    s.line(lx, ly - 4, lx + 20, ly - 4, stroke=C['purple'], sw=2); s.circle(lx + 10, ly - 4, 3, C['purple']); s.text(lx + 26, ly, '미완료 잔량 (주말 시점, 우측 축)', size=11.5)
    # summary tiles
    ty = ly + 24
    for i, (t, v, sub, col) in enumerate([('이번 주 완료', '8', 'W38 · 진행 중', C['accent']), ('신규', '9', '➕ 기준', '#5b8db8'), ('기한 초과', '2', '현재', C['err']), ('미완료 잔량', '49', '전주 대비 +1', C['purple'])]):
        tx = 60 + i * 225
        s.rect(tx, ty, 205, 56, fill=C['panel'], stroke='none', r=6)
        s.text(tx + 12, ty + 18, t, size=11, fill=C['muted']); s.text(tx + 12, ty + 44, v, size=22, weight='bold', fill=col); s.text(tx + 60, ty + 44, sub, size=10.5, fill=C['muted'])
    s.text(16, H - 10, 'ⓘ ✅/➕ 날짜가 없는 태스크 23개는 집계에서 제외됨 · 데이터는 인덱스에서 즉시 계산 (별도 저장 없음)', size=11, fill=C['muted'], italic=True)
    s.save('07-6-stats.svg')

layers(); anatomy(); layout(); modal(); kanban(); calendar(); stats()
