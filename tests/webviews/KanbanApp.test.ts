import { fireEvent, render } from '@testing-library/svelte';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import KanbanApp from '../../src/webviews/kanban/KanbanApp.svelte';
import type { FromWebview, InitState, TaskDto } from '../../src/webviews/shared/protocol';
import { posted, receive } from './setup';

const init: InitState = {
  locale: 'en', l10n: {}, today: '2026-09-22', taskFormat: 'emoji', savedQueries: [], uiState: {}, editModal: { accessKeys: false, hiddenFields: [] }, globalFilter: '', calendarFontSize: 13,
  statuses: [
    { symbol: ' ', name: 'Todo', type: 'TODO', nextSymbol: 'x' },
    { symbol: '/', name: 'In Progress', type: 'IN_PROGRESS', nextSymbol: 'x' },
    { symbol: 'x', name: 'Done', type: 'DONE', nextSymbol: ' ' },
  ],
};
const task = (i: number): TaskDto => ({
  key: 'file:///n.md', path: 'n.md', line: i, heading: null, description: `task ${i}`, status: { symbol: ' ', name: 'Todo', type: 'TODO' },
  priority: '3', priorityName: 'Normal', created: null, start: null, scheduled: null, due: null, done: null, cancelled: null,
  recurrence: null, onCompletion: null, id: null, dependsOn: [], tags: [], isCompleted: false, isDone: false, isBlocked: false, urgency: 1, originalMarkdown: `- [ ] task ${i}`,
});

let heightDescriptor: PropertyDescriptor | undefined;
beforeAll(() => {
  // jsdom has no layout; pretend the board is 600px tall so windowing has a viewport.
  heightDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 600 });
});
afterAll(() => {
  if (heightDescriptor) Object.defineProperty(HTMLElement.prototype, 'clientHeight', heightDescriptor);
  else delete (HTMLElement.prototype as unknown as Record<string, unknown>)['clientHeight'];
});

async function boot(tasks: TaskDto[]) {
  const r = render(KanbanApp);
  await Promise.resolve();
  receive({ type: 'state/init', state: init });
  await Promise.resolve();
  const run = [...posted].reverse().find((m: FromWebview) => m.type === 'query/run') as { requestId: number };
  receive({ type: 'query/result', requestId: run.requestId, tasks, groups: null, matched: tasks.length, errors: [] });
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
  return r;
}

describe('KanbanApp', () => {
  it('windows a column with many cards instead of rendering them all', async () => {
    const { container } = await boot(Array.from({ length: 1000 }, (_, i) => task(i)));
    const cards = container.querySelectorAll('.card');
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.length).toBeLessThan(60); // ~600px / 64px + overscan on both sides
    expect(container.querySelector('.spacer')).toBeTruthy();
  });

  it('renders every card when the column is small', async () => {
    const { container } = await boot([task(1), task(2), task(3)]);
    expect(container.querySelectorAll('.card').length).toBe(3);
    expect(container.querySelector('.spacer')).toBeNull();
  });

  it('Alt+ArrowRight / ArrowLeft moves the focused card to the neighbouring column', async () => {
    const { container } = await boot([task(1)]);
    const card = container.querySelector<HTMLElement>('.card')!;
    card.focus();
    await fireEvent.keyDown(card, { key: 'ArrowRight', altKey: true });
    expect(posted.at(-1)).toEqual({ type: 'task/setField', key: 'file:///n.md', line: 1, field: 'status', value: 'x' }); // Todo → Done column
    await fireEvent.keyDown(card, { key: 'ArrowLeft', altKey: true });
    expect(posted.at(-1)).toEqual({ type: 'task/setField', key: 'file:///n.md', line: 1, field: 'status', value: '/' }); // Todo → In Progress column
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toContain('Moved to');
  });
});
