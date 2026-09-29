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
