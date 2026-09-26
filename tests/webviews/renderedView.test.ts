import { describe, expect, it } from 'vitest';
import { applyView, matchesScope } from '../../src/webviews/rendered/view';

const li = (line: number, attrs: Record<string, string>, children = '') => `<li class="tfm-task" data-tfm-line="${line}" ${Object.entries(attrs).map(([k, v]) => `data-tfm-${k}="${v}"`).join(' ')}><span class="tfm-desc">t${line}</span>${children}</li>`;
const TODAY = '2026-09-26'; // Saturday → week Mon 09-21 … Sun 09-27

describe('rendered view sort and scope', () => {
  it('sorts task items within a list by due date (missing last) and keeps non-task items in place', () => {
    document.body.innerHTML = `<ul>${li(0, { due: '2026-10-05' })}<li>plain</li>${li(2, { due: '2026-09-01' })}${li(3, {})}${li(4, { due: '2026-09-20' })}</ul>`;
    applyView(document.body, { sort: 'due', scope: 'all' }, TODAY);
    const order = Array.from(document.querySelectorAll('ul > li')).map((el) => el.textContent);
    expect(order).toEqual(['t2', 'plain', 't4', 't0', 't3']);
    applyView(document.body, { sort: 'document', scope: 'all' }, TODAY);
    // document order is restored by re-rendering in the real page; here a second sort by created just must not throw
    applyView(document.body, { sort: 'created', scope: 'all' }, TODAY);
  });

  it('nested lists travel with their parent when sorting', () => {
    document.body.innerHTML = `<ul>${li(0, { due: '2026-10-05' }, `<ul>${li(1, { due: '2026-09-01' })}</ul>`)}${li(2, { due: '2026-09-15' })}</ul>`;
    applyView(document.body, { sort: 'due', scope: 'all' }, TODAY);
    const top = Array.from(document.querySelectorAll('body > ul > li')).map((el) => (el as HTMLElement).dataset.tfmLine);
    expect(top).toEqual(['2', '0']);
    expect(document.querySelector('[data-tfm-line="0"] ul li')?.getAttribute('data-tfm-line')).toBe('1');
  });

  it('scope hides non-matching items, dims a parent whose child matches, and reports the count', () => {
    document.body.innerHTML = `<ul>${li(0, { due: '2026-09-25' })}${li(1, { due: '2026-10-20' })}${li(2, { done: '1', due: '2026-09-25' })}${li(3, {}, `<ul>${li(4, { due: '2026-09-27' })}</ul>`)}</ul>`;
    const hidden = applyView(document.body, { sort: 'document', scope: 'week' }, TODAY);
    expect(hidden).toBe(2); // t1 (next month) and t2 (done)
    expect(document.querySelector('[data-tfm-line="1"]')!.classList.contains('rv-hidden')).toBe(true);
    expect(document.querySelector('[data-tfm-line="3"]')!.classList.contains('rv-dim')).toBe(true);
    expect(document.querySelector('[data-tfm-line="4"]')!.classList.contains('rv-hidden')).toBe(false);
    expect(applyView(document.body, { sort: 'document', scope: 'all' }, TODAY)).toBe(0);
    expect(document.querySelector('.rv-hidden')).toBeNull();
  });

  it('scope rules', () => {
    const t = (due: string | null, done = false, happens: string | null = null) => ({ due, created: null, happens, priority: 3, urgency: 0, done, line: 0 });
    expect(matchesScope(t('2026-09-25'), 'overdue', TODAY)).toBe(true);
    expect(matchesScope(t('2026-09-26'), 'overdue', TODAY)).toBe(false);
    expect(matchesScope(t('2026-09-26'), 'today', TODAY)).toBe(true);
    expect(matchesScope(t('2026-09-27'), 'today', TODAY)).toBe(false);
    expect(matchesScope(t('2026-09-27'), 'week', TODAY)).toBe(true);
    expect(matchesScope(t('2026-09-28'), 'week', TODAY)).toBe(false);
    expect(matchesScope(t('2026-10-04'), 'nextWeek', TODAY)).toBe(true);
    expect(matchesScope(t('2026-10-05'), 'nextWeek', TODAY)).toBe(false);
    expect(matchesScope(t(null, false, '2026-09-22'), 'week', TODAY)).toBe(true); // scheduled/start counts when there is no due date
    expect(matchesScope(t('2026-09-25', true), 'today', TODAY)).toBe(false);
    expect(matchesScope(t(null), 'open', TODAY)).toBe(true);
    expect(matchesScope(t(null, true), 'open', TODAY)).toBe(false);
  });
});
