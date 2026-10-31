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

  it('Cmd/Ctrl+C/V/X and the editor’s other shortcuts reach the window (VS Code does them in the desktop app); typing and the box’s own keys stop at the area', () => {
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
    key(ta, 'Enter', { keyCode: 13 });
    key(ta, 'Delete', { keyCode: 46 });
    key(ta, 'p', { metaKey: true, keyCode: 80 });
    key(ta, 'p', { metaKey: true, shiftKey: true, keyCode: 80 });
    key(ta, 'w', { ctrlKey: true, keyCode: 87 });
    key(ta, 'a', { metaKey: true, keyCode: 65 });
    key(ta, 's', { metaKey: true, keyCode: 83 }); // saves and leaves the box
    window.removeEventListener('keydown', spy);
    expect(seen).toEqual(['Cmd+v', 'Ctrl+c', 'Cmd+x', 'Cmd+p', 'Cmd+Shift+p', 'Ctrl+w']);
    expect(area()).toBeNull();
  });

  it('Cmd/Ctrl+S saves the quote and the note to disk; unchanged, just the note', () => {
    send(note());
    posted.length = 0;
    document.querySelectorAll<HTMLElement>('blockquote')[1]!.click();
    area()!.value = '답변: 저장';
    key(area()!, 's', { metaKey: true, keyCode: 83 });
    expect(posted.filter((m: FromWebview) => m.type === 'doc/editQuote' || m.type === 'doc/save')).toEqual([
      { type: 'doc/editQuote', start: 5, end: 8, expected: '답변:\n\n', text: '답변: 저장', save: true },
    ]);
    send(note());
    posted.length = 0;
    document.querySelectorAll<HTMLElement>('blockquote')[1]!.click();
    key(area()!, 's', { ctrlKey: true, keyCode: 83 });
    expect(posted.filter((m: FromWebview) => m.type === 'doc/editQuote' || m.type === 'doc/save')).toEqual([{ type: 'doc/save' }]);
  });

  it('Cmd/Ctrl+Z and Cmd+Shift+Z / Ctrl+Y undo and redo typing, Korean syllables and pastes in the box (not passed on); Cmd+A selects it all', () => {
    send(note());
    document.querySelectorAll<HTMLElement>('blockquote')[0]!.click();
    const ta = area()!;
    const start = ta.value;
    const type = (text: string, inputType = 'insertText') => {
      const at = ta.selectionStart;
      ta.value = ta.value.slice(0, at) + text + ta.value.slice(ta.selectionEnd);
      ta.setSelectionRange(at + text.length, at + text.length);
      ta.dispatchEvent(new InputEvent('input', { inputType, data: inputType === 'insertFromPaste' ? null : text }));
    };
    const seen: string[] = [];
    const spy = () => seen.push('x');
    window.addEventListener('keydown', spy);
    type('a'); type('b'); type(' '); // one step, ended by the space
    type('c');
    type('붙인 글', 'insertFromPaste');
    // A Korean syllable: input events while composing are not steps; the finished syllable is.
    ta.dispatchEvent(new CompositionEvent('compositionstart'));
    type('ㅎ'); ta.dispatchEvent(new InputEvent('input', { inputType: 'insertCompositionText', isComposing: true }));
    ta.value = ta.value.slice(0, -1) + '한';
    ta.dispatchEvent(new CompositionEvent('compositionend', { data: '한' }));
    expect(ta.value).toBe(`${start}ab c붙인 글한`);
    key(ta, 'z', { metaKey: true, keyCode: 90 });
    expect(ta.value).toBe(`${start}ab c붙인 글`);
    key(ta, 'z', { metaKey: true, keyCode: 90 });
    expect(ta.value).toBe(`${start}ab c`);
    key(ta, 'z', { ctrlKey: true, keyCode: 90 });
    expect(ta.value).toBe(`${start}ab `);
    key(ta, 'z', { metaKey: true, shiftKey: true, keyCode: 90 });
    expect(ta.value).toBe(`${start}ab c`);
    key(ta, 'y', { ctrlKey: true, keyCode: 89 });
    expect(ta.value).toBe(`${start}ab c붙인 글`);
    // Cmd+Z with a Korean input source mid-syllable (keyCode 229): waits for the syllable, then undoes it.
    ta.dispatchEvent(new CompositionEvent('compositionstart'));
    ta.value += 'ㄱ';
    key(ta, 'z', { metaKey: true, keyCode: 229, code: 'KeyZ' });
    ta.dispatchEvent(new CompositionEvent('compositionend', { data: 'ㄱ' }));
    expect(ta.value).toBe(`${start}ab c붙인 글`);
    for (let i = 0; i < 10; i++) key(ta, 'z', { metaKey: true, keyCode: 90 });
    expect(ta.value).toBe(start); // not past where the box opened
    key(ta, 'a', { metaKey: true, keyCode: 65 });
    window.removeEventListener('keydown', spy);
    expect(seen).toEqual([]);
    expect([ta.selectionStart, ta.selectionEnd]).toEqual([0, ta.value.length]);
    key(ta, 'Escape');
  });

  it('a "#heading" link scrolls to that heading in the view; "#L12" and other links go to the host', () => {
    send('<h2 data-tfm-anchor="1-비전">1. 비전</h2><p><a href="#1-%EB%B9%84%EC%A0%84">목차</a> <a href="#L3">줄</a> <a href="#없음">없음</a></p>');
    posted.length = 0;
    const h = document.querySelector<HTMLElement>('h2')!;
    let scrolled = 0;
    h.scrollIntoView = () => { scrolled++; };
    const [toc, line, missing] = Array.from(document.querySelectorAll<HTMLAnchorElement>('a'));
    toc!.click();
    missing!.click();
    expect(scrolled).toBe(1);
    expect(posted.filter((m: FromWebview) => m.type === 'doc/link')).toEqual([]);
    line!.click();
    expect(posted.filter((m: FromWebview) => m.type === 'doc/link')).toEqual([{ type: 'doc/link', href: '#L3' }]);
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
