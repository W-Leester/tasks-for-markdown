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

describe('query result column header (M15)', () => {
  const row = (line: number) => `<li class="tfm-task" data-tfm-path="n.md" data-tfm-line="${line}"><input type="checkbox" class="tfm-check"><span class="tfm-desc">t${line}</span><span class="tfm-col tfm-col-due"></span><span class="tfm-col tfm-col-created"></span><span class="tfm-col tfm-col-more"></span></li>`;
  const block = (key: string) => `<div class="tfm-query-block" data-tfm-query-key="${key}"><div class="tfm-query"><ul class="tfm-list">${row(1)}${row(2)}</ul></div></div>`;
  const html = `<ul>${row(0)}</ul>${block('aa')}${block('bb')}<div class="tfm-query-block" data-tfm-query-key="empty"><div class="tfm-query"><div class="tfm-empty-result">none</div></div></div>`;

  it('adds a header to result blocks only; ✕ hides a column in that block, + brings it back; global hides are union and not offered', async () => {
    document.body.innerHTML = `<details id="view-cols"><summary>열</summary><input type="checkbox" data-col="due" checked><input type="checkbox" data-col="created" checked><input type="checkbox" data-col="more" checked></details><div id="content"></div>`;
    Object.assign(document.body.dataset, { lColDesc: '설명', lColDue: '마감일', lColCreated: '생성일', lColMore: '나머지 필드', lColHide: '열 숨기기', lColShow: '열 다시 보이기' });
    window.scrollTo = () => undefined;
    const { vi } = await import('vitest');
    vi.resetModules();
    await import('../../src/webviews/rendered/main');
    receive({ type: 'doc/html', html, fontSize: 14, lineHeight: 1.6, fieldsAlign: 'columns', maxWidth: 0, today: '2026-09-30', view: { sort: 'document', scope: 'all' }, hiddenColumns: ['more'], blockColumns: { bb: ['created'] } });

    const blockEl = (k: string) => document.querySelector<HTMLElement>(`[data-tfm-query-key="${k}"]`)!;
    const headText = (k: string) => Array.from(blockEl(k).querySelectorAll('.rv-colhead-cell')).map((c) => c.textContent);
    expect(document.querySelectorAll('.rv-colhead')).toHaveLength(2); // not in the note body, not in an empty result
    // Global "more" hidden: not offered anywhere; block bb also hides "created" and offers it back.
    expect(headText('aa')).toEqual(['설명', '마감일✕', '생성일✕']);
    expect(headText('bb')).toEqual(['설명', '마감일✕']);
    expect(blockEl('bb').querySelector('[data-show]')!.textContent).toBe('+ 생성일');
    expect(blockEl('bb').classList.contains('hide-col-created')).toBe(true);
    expect(blockEl('bb').style.getPropertyValue('--rv-cols')).toBe('1.4em minmax(8em, 1fr) 8.6em');
    expect(blockEl('aa').style.getPropertyValue('--rv-cols')).toBe('1.4em minmax(8em, 1fr) 8.6em 8.6em');

    posted.length = 0;
    blockEl('aa').querySelector<HTMLButtonElement>('[data-hide="due"]')!.click();
    expect(posted).toEqual([{ type: 'doc/blockColumns', key: 'aa', hidden: ['due'] }]);
    expect(headText('aa')).toEqual(['설명', '생성일✕']);
    expect(blockEl('aa').classList.contains('hide-col-due')).toBe(true);
    expect(blockEl('bb').classList.contains('hide-col-due')).toBe(false); // other block untouched

    posted.length = 0;
    blockEl('bb').querySelector<HTMLButtonElement>('[data-show="created"]')!.click();
    expect(posted).toEqual([{ type: 'doc/blockColumns', key: 'bb', hidden: [] }]);
    expect(blockEl('bb').querySelector('[data-show]')).toBeNull();
    expect(headText('bb')).toEqual(['설명', '마감일✕', '생성일✕']);

    // Showing "more" again from the toolbar adds its title back to every header.
    receive({ type: 'doc/columns', hidden: [] });
    expect(headText('bb')).toEqual(['설명', '마감일✕', '생성일✕', '나머지 필드✕']);
  });
});
