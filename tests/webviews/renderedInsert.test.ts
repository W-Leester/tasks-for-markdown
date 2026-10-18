import { describe, expect, it } from 'vitest';
import type { FromWebview } from '../../src/webviews/shared/protocol';
import { posted, receive } from './setup';

const row = (line: number, text: string, extra = '') =>
  `<li class="tfm-task" data-tfm-line="${line}"${extra}><input type="checkbox" class="tfm-check"><span class="tfm-desc">${text}</span></li>`;
const html = (rows: string) => `<ul>${rows}</ul>`;
const send = (rows: string) => receive({ type: 'doc/html', html: html(rows), fontSize: 14, lineHeight: 1.6, fieldsAlign: 'inline', maxWidth: 0, today: '2026-10-18', view: { sort: 'document', scope: 'all' } });
const key = (el: Element, k: string, init: KeyboardEventInit = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }));
const inserts = () => posted.filter((m: FromWebview) => m.type === 'doc/insertTask');

describe('rendered view: new task lines (M27)', () => {
  it('click selects a row; Enter opens an input below it; Enter posts doc/insertTask and continues below the new task', async () => {
    document.body.innerHTML = '<div id="content"></div>';
    window.scrollTo = () => undefined;
    await import('../../src/webviews/rendered/main');
    send(row(2, 'a') + row(3, 'b'));
    posted.length = 0;

    const a = document.querySelector<HTMLElement>('li.tfm-task[data-tfm-line="2"] .tfm-desc')!;
    a.click();
    const li = document.querySelector<HTMLElement>('li.tfm-task[data-tfm-line="2"]')!;
    expect(li.classList.contains('rv-selected')).toBe(true);
    expect(document.activeElement).toBe(li);
    // The host learns the selection, so Cmd/Alt+Shift+C edits this task instead of asking which one.
    expect(posted.filter((m: FromWebview) => m.type === 'doc/select').at(-1)).toEqual({ type: 'doc/select', line: 2 });

    // Ctrl+Shift+Enter on the selected row toggles done (as in the editor) and does not open an input; other modifiers do nothing.
    posted.length = 0;
    key(li, 'Enter', { ctrlKey: true, shiftKey: true });
    expect(posted).toEqual([{ type: 'doc/toggle', path: null, line: 2 }]);
    expect(document.querySelector('li.rv-task-form')).toBeNull();
    key(li, 'Enter', { metaKey: true });
    key(li, 'Enter', { shiftKey: true });
    expect(document.querySelector('li.rv-task-form')).toBeNull();
    expect(posted).toHaveLength(1);

    key(li, 'Enter');
    const input = document.querySelector<HTMLInputElement>('li.rv-task-form input')!;
    expect(input).not.toBeNull();
    expect(input.closest('li')!.previousElementSibling).toBe(li); // right below the row
    expect(document.activeElement).toBe(input);

    // Korean IME: the Enter that ends a composition must not add.
    input.value = '보고서';
    key(input, 'Enter', { isComposing: true });
    expect(inserts()).toEqual([]);

    key(input, 'Enter');
    expect(inserts()).toEqual([{ type: 'doc/insertTask', line: 2, text: '보고서' }]);
    expect(input.disabled).toBe(true);

    // Host: inserted at line 3, then the re-rendered note arrives → the next input opens below the new task.
    receive({ type: 'doc/inserted', line: 3 });
    send(row(2, 'a') + row(3, '보고서') + row(4, 'b'));
    const next = document.querySelector<HTMLInputElement>('li.rv-task-form input')!;
    expect(next).not.toBeNull();
    expect((next.closest('li')!.previousElementSibling as HTMLElement).dataset.tfmLine).toBe('3');

    // The other order: the re-render first, then the host's reply.
    next.value = 'c';
    key(next, 'Enter');
    send(row(2, 'a') + row(3, '보고서') + row(4, 'c') + row(5, 'b'));
    expect(document.querySelector('li.rv-task-form')).toBeNull(); // not yet: line unknown
    receive({ type: 'doc/inserted', line: 4 });
    const third = document.querySelector<HTMLInputElement>('li.rv-task-form input')!;
    expect((third.closest('li')!.previousElementSibling as HTMLElement).dataset.tfmLine).toBe('4');

    // A second re-render (the save after the edit) must keep the fresh, still-empty input. Real Chrome fires blur on
    // the focused input while innerHTML removes it — simulate that (found in the real view, jsdom does not do it).
    const contentEl = document.getElementById('content')!;
    const realInner = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')!;
    Object.defineProperty(contentEl, 'innerHTML', { configurable: true, set(v: string) { (document.activeElement as HTMLElement | null)?.dispatchEvent(new FocusEvent('blur')); realInner.set!.call(this, v); }, get() { return realInner.get!.call(this); } });
    expect(third.value).toBe('');
    send(row(2, 'a') + row(3, '보고서') + row(4, 'c') + row(5, 'b'));
    const kept = document.querySelector<HTMLInputElement>('li.rv-task-form input')!;
    expect(kept).not.toBeNull();
    expect((kept.closest('li')!.previousElementSibling as HTMLElement).dataset.tfmLine).toBe('4');
    // …and what was typed so far.
    kept.value = 'half typed';
    send(row(2, 'a') + row(3, '보고서') + row(4, 'c') + row(5, 'b'));
    const kept2 = document.querySelector<HTMLInputElement>('li.rv-task-form input')!;
    expect(kept2.value).toBe('half typed');
    delete (contentEl as unknown as Record<string, unknown>).innerHTML;
    kept2.value = '';

    // Empty Enter stops.
    key(kept2, 'Enter');
    expect(document.querySelector('li.rv-task-form')).toBeNull();
    expect(inserts()).toHaveLength(2);
  });

  it('＋ on the row and "＋ Add task" at the end of the list; none for query-result rows', async () => {
    send(row(5, 'x') + row(6, 'y'));
    posted.length = 0;
    const plus = document.querySelector<HTMLButtonElement>('li.tfm-task[data-tfm-line="5"] .rv-actions button[data-act="add"]')!;
    expect(plus).not.toBeNull();
    plus.click();
    expect((document.querySelector('li.rv-task-form')!.previousElementSibling as HTMLElement).dataset.tfmLine).toBe('5');
    key(document.querySelector('li.rv-task-form input')!, 'Escape');
    expect(document.querySelector('li.rv-task-form')).toBeNull();

    const addRow = document.querySelector<HTMLElement>('li.rv-addrow button')!;
    expect(addRow).not.toBeNull();
    addRow.click();
    const input = document.querySelector<HTMLInputElement>('li.rv-task-form input')!;
    expect((input.closest('li')!.previousElementSibling as HTMLElement).dataset.tfmLine).toBe('6'); // after the last task
    input.value = 'z';
    key(input, 'Enter');
    expect(inserts()).toEqual([{ type: 'doc/insertTask', line: 6, text: 'z' }]);

    // A query-result row (has a path): no ＋, and clicking it does not select it.
    receive({ type: 'doc/html', html: `<div class="tfm-query-block"><div class="tfm-query"><ul>${row(9, 'q', ' data-tfm-path="other.md"')}</ul></div></div>`, fontSize: 14, lineHeight: 1.6, fieldsAlign: 'inline', maxWidth: 0, today: '2026-10-18', view: { sort: 'document', scope: 'all' } });
    expect(document.querySelector('.rv-actions button[data-act="add"]')).toBeNull();
    expect(document.querySelector('li.rv-addrow')).toBeNull();
    document.querySelector<HTMLElement>('li.tfm-task .tfm-desc')!.click();
    expect(document.querySelector('li.rv-selected')).toBeNull();
  });
});
