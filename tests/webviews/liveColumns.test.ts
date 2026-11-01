import { describe, expect, it } from 'vitest';
import { QueryColumns } from '../../src/webviews/live/columns';

const labels = { desc: '설명', due: '마감일', created: '생성일', done: '완료일', more: '기타 필드', hide: '열 숨기기', show: '열 보이기', width: '열 너비', widthHint: '끌어서' };
const box = () => {
  const b = document.createElement('div');
  b.className = 'cm-lv-query';
  b.innerHTML = '<div class="tfm-query"><ul class="tfm-list"><li class="tfm-task" data-tfm-path="a.md" data-tfm-line="0"><span class="tfm-col tfm-col-due">x</span></li></ul></div>';
  return b;
};

describe('live view query column header (M40 A)', () => {
  it('adds a header to boxes with tasks; ✕ hides a column, ＋ shows it again, and the host is told', () => {
    document.body.innerHTML = '<div id="editor"></div>';
    const root = document.getElementById('editor')!;
    const saved: unknown[] = [];
    const cols = new QueryColumns(root, (c) => saved.push(c));
    cols.set({ hidden: ['done'], widths: { due: 10 }, labels });
    const b = box();
    root.appendChild(b);
    cols.addHeader(b);
    const head = () => b.querySelector('.rv-colhead')!;
    expect(Array.from(head().querySelectorAll('.rv-colhead-text')).map((e) => e.textContent)).toEqual(['설명', '마감일', '생성일', '기타 필드']);
    expect(head().querySelector('[data-show="done"]')?.textContent).toBe('+ 완료일');
    expect(document.body.classList.contains('hide-col-done')).toBe(true);
    expect(document.body.style.getPropertyValue('--rv-cols')).toContain('10em');

    head().querySelector<HTMLButtonElement>('[data-hide="created"]')!.click();
    expect(saved.at(-1)).toEqual({ hidden: ['created', 'done'] });
    expect(document.body.classList.contains('hide-col-created')).toBe(true);
    head().querySelector<HTMLButtonElement>('[data-show="done"]')!.click();
    expect(saved.at(-1)).toEqual({ hidden: ['created'] });

    // A box without tasks gets no header.
    const empty = document.createElement('div');
    empty.innerHTML = '<div class="tfm-query">0 tasks</div>';
    cols.addHeader(empty);
    expect(empty.querySelector('.rv-colhead')).toBeNull();
  });

  it('←/→ on a grip move the column’s edge by half an em, Home resets; widths go to the host', () => {
    document.body.innerHTML = '<div id="editor"></div>';
    const root = document.getElementById('editor')!;
    const saved: { widths?: Record<string, number> }[] = [];
    const cols = new QueryColumns(root, (c) => saved.push(c));
    cols.set({ hidden: [], widths: {}, labels });
    const b = box();
    root.appendChild(b);
    cols.addHeader(b);
    const grip = b.querySelector<HTMLElement>('.rv-colgrip[data-col="created"]')!;
    grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(saved.at(-1)!.widths).toBeDefined();
    grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
    expect(saved.at(-1)!.widths!.created).toBeUndefined();
  });
});
