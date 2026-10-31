import { describe, expect, it } from 'vitest';
import type { FromWebview } from '../../src/webviews/shared/protocol';
import { posted, receive } from './setup';

const quote = (start: number, end: number, text: string, inner: string) =>
  `<blockquote data-tfm-quote="${start}-${end}" data-tfm-quote-text="${text}">${inner}</blockquote>`;
const send = (html: string) => receive({ type: 'doc/html', html, fontSize: 14, lineHeight: 1.6, fieldsAlign: 'inline', maxWidth: 0, today: '2026-10-31', view: { sort: 'document', scope: 'all' } });
const key = (el: Element, k: string, init: KeyboardEventInit = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
const edits = () => posted.filter((m: FromWebview) => m.type === 'doc/editQuote');
const area = () => document.querySelector<HTMLTextAreaElement>('blockquote textarea.rv-quote-input');
const note = () =>
  '<h2>1. 비전</h2>' +
  quote(3, 4, '정의 **굵게**', '<p>정의 <strong>굵게</strong> <a href="x.md">링크</a></p>') +
  quote(5, 8, '답변:&#10;&#10;', '<p>답변:</p>');

describe('rendered view: typing into a blockquote (M38)', () => {
  it('click opens the quote as a text area with its source, the cursor after the last character', async () => {
    document.body.innerHTML = '<div id="content"></div>';
    window.scrollTo = () => undefined;
    await import('../../src/webviews/rendered/main');
    send(note());
    posted.length = 0;

    const answer = document.querySelectorAll<HTMLElement>('blockquote')[1]!;
    expect(answer.classList.contains('rv-quote')).toBe(true);
    answer.querySelector('p')!.click();
    const ta = area()!;
    expect(ta).not.toBeNull();
    expect(ta.closest('blockquote')).toBe(answer);
    expect(ta.value).toBe('답변:\n\n');
    expect(document.activeElement).toBe(ta);
    expect(ta.selectionStart).toBe(3); // after "답변:", not on the blank lines
    expect(answer.querySelector('p')).toBeNull(); // the rendered text is replaced while typing

    // Enter is a new line; the Enter that ends a Korean composition does not save.
    key(ta, 'Enter');
    key(ta, 'Enter', { metaKey: true, isComposing: true });
    expect(edits()).toEqual([]);

    ta.value = '답변: 동의합니다\n\n';
    key(ta, 'Enter', { metaKey: true });
    expect(edits()).toEqual([{ type: 'doc/editQuote', start: 5, end: 8, expected: '답변:\n\n', text: '답변: 동의합니다\n\n' }]);
    // Leaving the area right after does not post again.
    ta.dispatchEvent(new FocusEvent('blur'));
    expect(edits()).toHaveLength(1);
  });

  it('blur saves (Ctrl+Enter too); unchanged text and Esc post nothing and bring the quote back', () => {
    send(note());
    posted.length = 0;
    const [def, answer] = Array.from(document.querySelectorAll<HTMLElement>('blockquote'));
    answer!.click();
    key(area()!, 'Escape');
    expect(area()).toBeNull();
    expect(answer!.querySelector('p')!.textContent).toBe('답변:');

    answer!.click();
    area()!.dispatchEvent(new FocusEvent('blur')); // unchanged
    expect(area()).toBeNull();
    expect(edits()).toEqual([]);

    def!.click();
    expect(area()!.value).toBe('정의 **굵게**');
    area()!.value = '정의 바꿈';
    area()!.dispatchEvent(new FocusEvent('blur'));
    expect(edits()).toEqual([{ type: 'doc/editQuote', start: 3, end: 4, expected: '정의 **굵게**', text: '정의 바꿈' }]);

    send(note());
    document.querySelectorAll<HTMLElement>('blockquote')[1]!.click();
    area()!.value = 'x';
    key(area()!, 'Enter', { ctrlKey: true });
    expect(edits().at(-1)).toMatchObject({ start: 5, text: 'x' });
  });

  it('a link in a quote still opens; only one area at a time; quotes in query results stay as they are', () => {
    send(note() + '<div class="tfm-query-block"><div class="tfm-query"><blockquote data-tfm-quote="20-21" data-tfm-quote-text="q"><p>q</p></blockquote></div></div>');
    posted.length = 0;
    const def = document.querySelector<HTMLElement>('blockquote')!;
    def.querySelector('a')!.click();
    expect(posted).toEqual([{ type: 'doc/link', href: 'x.md' }]);
    expect(area()).toBeNull();

    def.click();
    document.querySelectorAll<HTMLElement>('blockquote')[1]!.click(); // the first one closes (unchanged → nothing posted)
    expect(document.querySelectorAll('textarea.rv-quote-input')).toHaveLength(1);
    expect(area()!.closest('blockquote')).toBe(document.querySelectorAll('blockquote')[1]);

    const inQuery = document.querySelector<HTMLElement>('.tfm-query blockquote')!;
    expect(inQuery.classList.contains('rv-quote')).toBe(false);
  });

  it('Cmd/Ctrl+C/V/X reach the window (VS Code copies and pastes there in the desktop app); other keys stop at the area', () => {
    send(note());
    document.querySelectorAll<HTMLElement>('blockquote')[0]!.click();
    const ta = area()!;
    const seen: string[] = [];
    const spy = (e: KeyboardEvent) => seen.push(`${e.metaKey ? 'Cmd+' : ''}${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.key}`);
    window.addEventListener('keydown', spy);
    key(ta, 'v', { metaKey: true, keyCode: 86 });
    key(ta, 'c', { ctrlKey: true, keyCode: 67 });
    key(ta, 'x', { metaKey: true, keyCode: 88 });
    key(ta, 'v', { metaKey: true, shiftKey: true, keyCode: 86 });
    key(ta, 'z', { metaKey: true, keyCode: 90 });
    key(ta, 'a', { keyCode: 65 });
    window.removeEventListener('keydown', spy);
    expect(seen).toEqual(['Cmd+v', 'Ctrl+c', 'Cmd+x']);
    key(ta, 'Escape');
  });

  it('an empty quote (">" alone) shows a faint "Type here", hidden while typing; the empty area shows it too', () => {
    send(note() + quote(10, 11, '', '') + quote(12, 14, '&#10;', ''));
    const [, answer, empty, blank] = Array.from(document.querySelectorAll<HTMLElement>('blockquote'));
    expect(answer!.classList.contains('rv-quote-empty')).toBe(false);
    for (const bq of [empty!, blank!]) {
      expect(bq.classList.contains('rv-quote-empty')).toBe(true);
      expect(bq.dataset.placeholder).toBe('Type here');
    }
    empty!.click();
    expect(area()!.value).toBe('');
    expect(area()!.placeholder).toBe('Type here');
    expect(empty!.classList.contains('rv-quote-editing')).toBe(true); // CSS hides the faint text while editing
    key(area()!, 'Escape');
    expect(empty!.classList.contains('rv-quote-empty')).toBe(true);
  });

  it('a re-render while typing keeps the area, what was typed and the text it was drawn with', () => {
    send(note());
    posted.length = 0;
    document.querySelectorAll<HTMLElement>('blockquote')[1]!.click();
    area()!.value = '답변: 반쯤';
    area()!.setSelectionRange(4, 4);
    // Real Chrome blurs the focused element while innerHTML removes it — that is not the user leaving it.
    const contentEl = document.getElementById('content')!;
    const realInner = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!;
    Object.defineProperty(contentEl, 'innerHTML', { configurable: true, set(v: string) { (document.activeElement as HTMLElement | null)?.dispatchEvent(new FocusEvent('blur')); realInner.set!.call(this, v); }, get() { return realInner.get!.call(this); } });
    send(note().replace('정의', '정의 (다른 곳이 바뀜)'));
    delete (contentEl as unknown as Record<string, unknown>).innerHTML;
    expect(edits()).toEqual([]);
    const ta = area()!;
    expect(ta.value).toBe('답변: 반쯤');
    expect(ta.selectionStart).toBe(4);
    expect(document.activeElement).toBe(ta);
    key(ta, 'Enter', { metaKey: true });
    expect(edits()).toEqual([{ type: 'doc/editQuote', start: 5, end: 8, expected: '답변:\n\n', text: '답변: 반쯤' }]);
    // After saving, the next render (the file changed) shows the quote again.
    send(note().replace('<p>답변:</p>', '<p>답변: 반쯤</p>'));
    expect(area()).toBeNull();
  });
});
