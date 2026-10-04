import { describe, expect, it } from 'vitest';
import type { FromWebview } from '../../src/webviews/shared/protocol';
import { posted, receive } from './setup';

describe('rendered view 💬 add note (M13)', () => {
  it('opens an input under the task; Enter posts doc/addNote, Esc closes', async () => {
    document.body.innerHTML = '<div id="content"></div>';
    window.scrollTo = () => undefined;
    await import('../../src/webviews/rendered/main');
    const html = '<ul><li class="tfm-task" data-tfm-line="4"><input type="checkbox" class="tfm-check"><span class="tfm-desc">review</span><ul><li class="tfm-note">old</li></ul></li></ul>';
    receive({ type: 'doc/html', html, fontSize: 14, lineHeight: 1.6, fieldsAlign: 'inline', maxWidth: 0, today: '2026-09-29', view: { sort: 'document', scope: 'all' } });
    const button = document.querySelector<HTMLButtonElement>('.rv-actions button[data-act="note"]')!;
    expect(button).not.toBeNull();
    button.click();
    const input = document.querySelector<HTMLInputElement>('.rv-note-form input')!;
    // The form sits on the task's own line, before its nested list.
    expect(input.closest('li')!.dataset.tfmLine).toBe('4');
    expect(input.parentElement!.nextElementSibling?.tagName).toBe('UL');
    input.value = '  new note ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(posted.filter((m: FromWebview) => m.type === 'doc/addNote')).toEqual([{ type: 'doc/addNote', path: null, line: 4, text: 'new note' }]);
    expect(document.querySelector('.rv-note-form')).toBeNull();

    button.click();
    const again = document.querySelector<HTMLInputElement>('.rv-note-form input')!;
    again.value = 'ignored';
    again.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.rv-note-form')).toBeNull();
    expect(posted.filter((m: FromWebview) => m.type === 'doc/addNote')).toHaveLength(1);
  });
});

describe('rendered view hover buttons are visible wherever they are placed', () => {
  it('row, <p> (loose list), description cell (columns) and <p> > description cell', async () => {
    const fs = await import('node:fs');
    const src = fs.readFileSync('src/preview/RenderedView.ts', 'utf8');
    const css = src.slice(src.indexOf('<style>') + 7, src.indexOf('</style>')).replace(/:hover/g, '.hov');
    const shapes = [
      '<li class="tfm-task hov"><span class="rv-actions"></span></li>',
      '<li class="tfm-task hov"><p><span class="rv-actions"></span></p></li>',
      '<li class="tfm-task hov"><span class="tfm-desc"><span class="rv-actions"></span></span></li>',
      '<li class="tfm-task hov"><p><span class="tfm-desc"><span class="rv-actions"></span></span></p></li>',
    ];
    document.head.innerHTML = `<style>${css}</style>`;
    for (const shape of shapes) {
      document.body.innerHTML = `<ul>${shape}</ul>`;
      const actions = document.querySelector('.rv-actions')!;
      expect(getComputedStyle(actions).display, shape).toBe('inline-flex');
      document.querySelector('li')!.classList.remove('hov');
      expect(getComputedStyle(actions).display, shape).toBe('none');
    }
    document.head.innerHTML = '';
  });
});

describe('rendered view column menu (M14)', () => {
  it('columnTracks drops hidden tracks so the rest close up', async () => {
    const { columnTracks } = await import('../../src/webviews/rendered/view');
    expect(columnTracks([])).toBe('1.4em minmax(8em, 1fr) 8.6em 8.6em minmax(0, 18em)');
    expect(columnTracks(['created'])).toBe('1.4em minmax(8em, 1fr) 8.6em minmax(0, 18em)');
    expect(columnTracks(['due', 'created', 'more', 'bogus'])).toBe('1.4em minmax(8em, 1fr)');
  });

  it('applies hiddenColumns from the host, and a toggle posts doc/columns and updates classes, tracks and label', async () => {
    document.body.innerHTML = `<details id="view-cols"><summary data-l-label="열" data-l-hidden="열 · {0}개 숨김">열</summary>
      <input type="checkbox" data-col="due" checked><input type="checkbox" data-col="created" checked><input type="checkbox" data-col="more" checked></details><div id="content"></div>`;
    window.scrollTo = () => undefined;
    const { vi } = await import('vitest');
    vi.resetModules();
    await import('../../src/webviews/rendered/main');
    receive({ type: 'doc/html', html: '<p>x</p>', fontSize: 14, lineHeight: 1.6, fieldsAlign: 'columns', maxWidth: 0, today: '2026-09-30', view: { sort: 'document', scope: 'all' }, hiddenColumns: ['more'] });
    const box = (c: string) => document.querySelector<HTMLInputElement>(`input[data-col="${c}"]`)!;
    expect(document.body.classList.contains('hide-col-more')).toBe(true);
    expect(box('more').checked).toBe(false);
    expect(document.querySelector('summary')!.textContent).toBe('열 · 1개 숨김');

    posted.length = 0;
    box('created').checked = false;
    box('created').dispatchEvent(new Event('change'));
    expect(posted).toEqual([{ type: 'doc/columns', hidden: ['created', 'more'] }]);
    expect(document.body.classList.contains('hide-col-created')).toBe(true);
    expect(document.body.style.getPropertyValue('--rv-cols')).toBe('1.4em minmax(8em, 1fr) 8.6em');
    expect(document.querySelector('summary')!.textContent).toBe('열 · 2개 숨김');

    // Another rendered view changed the choice.
    receive({ type: 'doc/columns', hidden: [] });
    expect(document.body.className).not.toMatch(/hide-col/);
    expect(box('created').checked).toBe(true);
    expect(document.querySelector('summary')!.textContent).toBe('열');
  });
});

describe('column header (M15, revised: global setting)', () => {
  const row = (line: number) => `<li class="tfm-task" data-tfm-line="${line}"><input type="checkbox" class="tfm-check"><span class="tfm-desc">t${line}</span><span class="tfm-col tfm-col-due"></span><span class="tfm-col tfm-col-created"></span><span class="tfm-col tfm-col-more"></span></li>`;
  const block = `<div class="tfm-query-block"><div class="tfm-query"><ul class="tfm-list">${row(10)}${row(11)}</ul></div></div>`;
  const html = `<ul>${row(0)}<li>plain<ul>${row(2)}</ul></li></ul><ul><li>no tasks</li></ul>${block}<div class="tfm-query-block"><div class="tfm-query"><div class="tfm-empty-result">none</div></div></div>`;

  it('headers on result boxes and top-level note task lists; ✕ and + change the global setting and the toolbar checks', async () => {
    document.body.innerHTML = `<details id="view-cols"><summary data-l-label="열" data-l-hidden="열 · {0}개 숨김">열</summary><input type="checkbox" data-col="due" checked><input type="checkbox" data-col="created" checked><input type="checkbox" data-col="more" checked></details><div id="content"></div>`;
    Object.assign(document.body.dataset, { lColDesc: '설명', lColDue: '마감일', lColCreated: '생성일', lColMore: '나머지 필드', lColHide: '열 숨기기', lColShow: '열 다시 보이기' });
    window.scrollTo = () => undefined;
    const { vi } = await import('vitest');
    vi.resetModules();
    await import('../../src/webviews/rendered/main');
    receive({ type: 'doc/html', html, fontSize: 14, lineHeight: 1.6, fieldsAlign: 'columns', maxWidth: 0, today: '2026-09-30', view: { sort: 'document', scope: 'all' }, hiddenColumns: ['more'] });

    const heads = () => Array.from(document.querySelectorAll<HTMLElement>('.rv-colhead'));
    // First note list (has a task row) and the result box with tasks; not the nested list, the task-less list or the empty result.
    expect(heads().map((h) => h.tagName)).toEqual(['LI', 'DIV']);
    expect(heads()[0]!.parentElement!.firstElementChild).toBe(heads()[0]);
    // Cell titles without the chips.
    const titles = (h: HTMLElement) => Array.from(h.querySelectorAll('.rv-colhead-cell')).map((c) =>
      Array.from(c.childNodes).filter((n) => !(n as Element).classList?.contains('rv-colhead-chips')).map((n) => n.textContent).join(''));
    for (const h of heads()) {
      expect(titles(h)).toEqual(['설명', '마감일✕', '생성일✕']);
      expect(h.querySelector('[data-show]')!.textContent).toBe('+ 나머지 필드');
      // incident #24: chips live in the description cell (flexible track), not over the last column title.
      expect(h.querySelector('.rv-colhead-chips')!.parentElement!.classList.contains('rv-colhead-desc')).toBe(true);
    }
    const box = (c: string) => document.querySelector<HTMLInputElement>(`#view-cols input[data-col="${c}"]`)!;

    posted.length = 0;
    heads()[1]!.querySelector<HTMLButtonElement>('[data-hide="created"]')!.click();
    expect(posted).toEqual([{ type: 'doc/columns', hidden: ['created', 'more'] }]);
    expect(box('created').checked).toBe(false);
    expect(document.body.classList.contains('hide-col-created')).toBe(true);
    expect(document.body.style.getPropertyValue('--rv-cols')).toBe('1.4em minmax(8em, 1fr) 8.6em');
    for (const h of heads()) expect(titles(h)).toEqual(['설명', '마감일✕']); // every header follows
    expect(document.querySelector('summary')!.textContent).toBe('열 · 2개 숨김');

    posted.length = 0;
    heads()[0]!.querySelector<HTMLButtonElement>('[data-show="more"]')!.click();
    expect(posted).toEqual([{ type: 'doc/columns', hidden: ['created'] }]);
    expect(box('more').checked).toBe(true);
    for (const h of heads()) expect(titles(h)).toEqual(['설명', '마감일✕', '나머지 필드✕']);

    // Toolbar change updates the headers too.
    box('created').checked = true;
    box('created').dispatchEvent(new Event('change'));
    for (const h of heads()) {
      expect(titles(h)).toEqual(['설명', '마감일✕', '생성일✕', '나머지 필드✕']);
      expect(h.querySelector('.rv-colhead-chips')).toBeNull();
    }
  });
});

describe('column widths (M16)', () => {
  it('columnTracks uses custom widths, clamped to 3–40em; bad values fall back to defaults', async () => {
    const { columnTracks, clampWidth } = await import('../../src/webviews/rendered/view');
    expect(columnTracks([], { due: 12, more: 25 })).toBe('1.4em minmax(8em, 1fr) 12em 8.6em minmax(0, 25em)');
    expect(columnTracks(['due'], { due: 12, created: 1, more: Number.NaN })).toBe('1.4em minmax(8em, 1fr) 3em minmax(0, 18em)');
    expect(clampWidth(99)).toBe(40);
    expect(clampWidth(10.04)).toBe(10);
  });

  it('drag the left edge (wider to the left), keyboard steps, double-click resets; saves once per drag', async () => {
    const row = `<li class="tfm-task" data-tfm-line="0"><input type="checkbox" class="tfm-check"><span class="tfm-desc">t</span><span class="tfm-col tfm-col-due"></span><span class="tfm-col tfm-col-created"></span><span class="tfm-col tfm-col-more"></span></li>`;
    document.body.innerHTML = `<details id="view-cols"><summary>열</summary><input type="checkbox" data-col="due" checked><input type="checkbox" data-col="created" checked><input type="checkbox" data-col="more" checked></details><div id="content"></div>`;
    window.scrollTo = () => undefined;
    const { vi } = await import('vitest');
    vi.resetModules();
    await import('../../src/webviews/rendered/main');
    receive({ type: 'doc/html', html: `<ul>${row}</ul>`, fontSize: 14, lineHeight: 1.6, fieldsAlign: 'columns', maxWidth: 0, today: '2026-09-30', view: { sort: 'document', scope: 'all' }, hiddenColumns: [], columnWidths: { created: 10 } });
    const cols = () => document.body.style.getPropertyValue('--rv-cols');
    const grip = (c: string) => document.querySelector<HTMLElement>(`.rv-colgrip[data-col="${c}"]`)!;
    expect(cols()).toBe('1.4em minmax(8em, 1fr) 8.6em 10em minmax(0, 18em)');
    expect(grip('created').getAttribute('aria-valuenow')).toBe('10');

    // Drag: 32px to the left at jsdom's 16px font size → +2em. Only the release saves.
    posted.length = 0;
    const g = grip('due');
    g.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 200, button: 0 }));
    expect(document.body.classList.contains('rv-resizing')).toBe(true);
    g.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 184 }));
    g.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 168 }));
    expect(cols()).toBe('1.4em minmax(8em, 1fr) 10.6em 10em minmax(0, 18em)');
    expect(posted.filter((m) => m.type === 'doc/columnWidths')).toHaveLength(0);
    g.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 168 }));
    expect(document.body.classList.contains('rv-resizing')).toBe(false);
    expect(posted).toEqual([{ type: 'doc/columnWidths', widths: { created: 10, due: 10.6 } }]);

    // Keyboard: → narrows by 0.5em, Home resets; focus stays on the grip.
    posted.length = 0;
    grip('more').focus();
    grip('more').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(cols()).toBe('1.4em minmax(8em, 1fr) 10.6em 10em minmax(0, 17.5em)');
    expect(document.activeElement).toBe(grip('more'));
    grip('more').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(cols()).toBe('1.4em minmax(8em, 1fr) 10.6em 10em minmax(0, 18em)');
    expect(posted.at(-1)).toEqual({ type: 'doc/columnWidths', widths: { created: 10, due: 10.6 } });

    // Double-click resets; another view's change is applied.
    grip('created').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(cols()).toBe('1.4em minmax(8em, 1fr) 10.6em 8.6em minmax(0, 18em)');
    receive({ type: 'doc/columnWidths', widths: {} });
    expect(cols()).toBe('1.4em minmax(8em, 1fr) 8.6em 8.6em minmax(0, 18em)');
  });
});
