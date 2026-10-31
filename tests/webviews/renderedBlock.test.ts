import { describe, expect, it } from 'vitest';
import type { FromWebview } from '../../src/webviews/shared/protocol';
import { posted, receive } from './setup';

const send = (html: string) => receive({ type: 'doc/html', html, fontSize: 14, lineHeight: 1.6, fieldsAlign: 'inline', maxWidth: 0, today: '2026-11-01', view: { sort: 'document', scope: 'all' } });
const key = (el: Element, k: string, init: KeyboardEventInit = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
const box = () => document.querySelector<HTMLTextAreaElement>('.rv-box textarea');
const sent = () => posted.filter((m: FromWebview) => m.type === 'doc/editBlock' || m.type === 'doc/append');
const b = (tag: string, range: string, text: string, inner: string, attrs = '') => `<${tag}${attrs} data-tfm-block="${range}" data-tfm-block-text="${text}">${inner}</${tag}>`;
const note = () =>
  b('h1', '0-1', '# 제목', '제목') +
  b('p', '2-4', '첫 줄&#10;둘째 줄', '첫 줄\n둘째 줄') +
  '<ul>' + b('li', '5-7', '- 항목&#10;  - 하위', '항목<ul>' + b('li', '6-7', '- 하위', '하위') + '</ul>') +
  '<li class="tfm-task" data-tfm-line="7" data-tfm-block="7-9" data-tfm-block-text="- [ ] 할 일&#10;  - 메모"><input type="checkbox" class="tfm-check"> 할 일<ul class="tfm-notes">' + b('li', '8-9', '- 메모', '메모', ' class="tfm-note"') + '</ul></li></ul>' +
  b('table', '10-13', '| a |&#10;|---|&#10;| 1 |', '<tr><td>1</td></tr>');

describe('rendered view: typing into a block (M39)', () => {
  it('marks note blocks but not task rows, notes under a task, or query results; adds "+ Write"', async () => {
    document.body.innerHTML = '<div id="content"></div>';
    window.scrollTo = () => undefined;
    await import('../../src/webviews/rendered/main');
    send(note() + '<div class="tfm-query">' + b('p', '20-21', 'q', 'q') + '</div>');
    const marked = Array.from(document.querySelectorAll<HTMLElement>('.rv-block')).map((e) => e.dataset.tfmBlock);
    expect(marked).toEqual(['0-1', '2-4', '5-7', '6-7', '10-13']);
    expect(document.querySelector('#content > .rv-write:last-child')?.textContent).toBe('＋ Write');
  });

  it('click opens the block’s source after it (hidden meanwhile); Cmd+Enter posts doc/editBlock; Esc puts it back', () => {
    send(note());
    posted.length = 0;
    const p = document.querySelector<HTMLElement>('p.rv-block')!;
    p.click();
    expect(p.hidden).toBe(true);
    expect(p.nextElementSibling?.className).toBe('rv-box');
    expect(box()!.value).toBe('첫 줄\n둘째 줄');
    expect(document.activeElement).toBe(box());
    box()!.value = '고친 줄';
    key(box()!, 'Enter', { metaKey: true });
    expect(sent()).toEqual([{ type: 'doc/editBlock', start: 2, end: 4, expected: '첫 줄\n둘째 줄', text: '고친 줄' }]);

    send(note());
    const h = document.querySelector<HTMLElement>('h1.rv-block')!;
    h.click();
    key(box()!, 'Escape');
    expect(box()).toBeNull();
    expect(h.hidden).toBe(false);
  });

  it('the innermost list item opens, its box an li; a table gets a div; dragging to select text opens nothing', () => {
    send(note());
    posted.length = 0;
    const inner = document.querySelectorAll<HTMLElement>('li.rv-block')[1]!;
    inner.click();
    expect(box()!.value).toBe('- 하위');
    expect(box()!.parentElement!.tagName).toBe('LI');
    box()!.value = '- 바꾼 하위';
    box()!.dispatchEvent(new FocusEvent('blur'));
    expect(sent()).toEqual([{ type: 'doc/editBlock', start: 6, end: 7, expected: '- 하위', text: '- 바꾼 하위' }]);

    send(note());
    document.querySelector<HTMLElement>('table.rv-block td')!.click();
    expect(box()!.parentElement!.tagName).toBe('DIV');
    key(box()!, 'Escape');

    const sel = window.getSelection()!;
    const p = document.querySelector<HTMLElement>('p.rv-block')!;
    sel.selectAllChildren(p);
    p.click();
    expect(box()).toBeNull();
    sel.removeAllRanges();
  });

  it('a click whose press began on another block (the open box closed on mousedown and the layout moved) opens the pressed one', () => {
    send(note());
    const inner = document.querySelectorAll<HTMLElement>('li.rv-block')[1]!;
    const outer = document.querySelectorAll<HTMLElement>('li.rv-block')[0]!;
    inner.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    outer.click(); // the click lands on the common parent
    expect(box()!.value).toBe('- 하위');
    key(box()!, 'Escape');
  });

  it('"+ Write" opens an empty box; text is appended (doc/append), Cmd+S saves the note too; empty posts nothing', () => {
    send(note());
    posted.length = 0;
    const write = document.querySelector<HTMLElement>('.rv-write')!;
    write.click();
    expect(write.hidden).toBe(true);
    expect(box()!.value).toBe('');
    box()!.dispatchEvent(new FocusEvent('blur'));
    expect(sent()).toEqual([]);
    expect(write.hidden).toBe(false);
    write.click();
    box()!.value = '새 문단';
    key(box()!, 's', { metaKey: true, keyCode: 83 });
    expect(sent()).toEqual([{ type: 'doc/append', text: '새 문단', save: true }]);
  });

  it('a fenced code block opens from its <pre> (markdown-it marks the <code>), in a monospace box', () => {
    send('<pre><code data-tfm-block="0-3" data-tfm-block-text="```js&#10;x&#10;```" class="language-js">x</code></pre>');
    const pre = document.querySelector<HTMLElement>('pre')!;
    expect(pre.classList.contains('rv-block')).toBe(true);
    pre.querySelector('code')!.click();
    expect(pre.hidden).toBe(true);
    expect(box()!.value).toBe('```js\nx\n```');
    expect(box()!.parentElement!.className).toBe('rv-box rv-box-code');
    key(box()!, 'Escape');
  });

  it('an open box survives a re-render with what was typed', () => {
    send(note());
    document.querySelector<HTMLElement>('p.rv-block')!.click();
    box()!.value = '쓰는 중';
    // Removing the area in a re-render blurs it; the view ignores that blur.
    send(note());
    expect(box()!.value).toBe('쓰는 중');
    expect(document.querySelector<HTMLElement>('p.rv-block')!.hidden).toBe(true);
    key(box()!, 'Escape');
  });
});
