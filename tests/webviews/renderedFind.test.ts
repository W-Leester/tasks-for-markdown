import { describe, expect, it } from 'vitest';
import { receive } from './setup';

const send = (html: string) => receive({ type: 'doc/html', html, fontSize: 14, lineHeight: 1.6, fieldsAlign: 'inline', maxWidth: 0, today: '2026-11-01', view: { sort: 'document', scope: 'all' } });
const key = (el: EventTarget, k: string, init: KeyboardEventInit = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
const bar = () => document.querySelector<HTMLElement>('.rv-find');
const count = () => bar()?.querySelector('.rv-find-count')?.textContent;
const typeTerm = (text: string) => {
  const input = bar()!.querySelector('input')!;
  input.value = text;
  input.dispatchEvent(new Event('input'));
};

describe('rendered view: find (Cmd/Ctrl+F)', () => {
  it('opens its own bar (not passed on), counts matches case-insensitively, steps with Enter/Shift+Enter, Esc closes', async () => {
    document.body.innerHTML = '<div id="content"></div>';
    window.scrollTo = () => undefined;
    await import('../../src/webviews/rendered/main');
    send('<h1>답변 모음</h1><p>첫 답변, 그리고 <strong>답</strong>변</p><p>Done done DONE</p>');
    let scrolled = 0;
    Element.prototype.scrollIntoView = () => { scrolled++; };
    const seen: string[] = [];
    const spy = () => seen.push('x');
    window.addEventListener('keydown', spy);
    key(document.body, 'f', { metaKey: true, keyCode: 70 });
    window.removeEventListener('keydown', spy);
    expect(seen).toEqual([]);
    expect(bar()).not.toBeNull();
    expect(document.activeElement).toBe(bar()!.querySelector('input'));

    typeTerm('답변');
    expect(count()).toBe('1/2'); // "답" + "변" split by <strong> is not one match (as in a browser's find)
    typeTerm('done');
    expect(count()).toBe('1/3');
    const input = bar()!.querySelector('input')!;
    key(input, 'Enter');
    expect(count()).toBe('2/3');
    key(input, 'Enter', { shiftKey: true });
    key(input, 'Enter', { shiftKey: true });
    expect(count()).toBe('3/3'); // wraps
    expect(scrolled).toBeGreaterThan(0);
    typeTerm('없는 말');
    expect(count()).toBe('No results');
    expect(bar()!.classList.contains('rv-find-none')).toBe(true);

    // A re-render keeps the bar and searches the new note.
    typeTerm('done');
    send('<p>done</p>');
    expect(count()).toBe('1/1');
    key(input, 'Escape');
    expect(bar()).toBeNull();
  });
});
