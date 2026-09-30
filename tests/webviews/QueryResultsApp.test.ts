import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import QueryResultsApp from '../../src/webviews/query-results/QueryResultsApp.svelte';
import type { FromWebview, InitState, TaskDto } from '../../src/webviews/shared/protocol';
import { posted, receive } from './setup';

const init: InitState = {
  locale: 'en', l10n: {}, today: '2026-09-22', statuses: [], taskFormat: 'emoji', savedQueries: [],
  uiState: {}, editModal: { accessKeys: false, hiddenFields: [] }, globalFilter: '', calendarFontSize: 13, requireDueDate: false,
};
const task = (description: string, line: number): TaskDto => ({
  key: 'file:///n.md', path: 'n.md', line, heading: null, parentLine: null, depth: 0, notes: [], description, status: { symbol: ' ', name: 'Todo', type: 'TODO' },
  priority: '3', priorityName: 'Normal', created: null, start: null, scheduled: null, due: '2026-09-23', done: null, cancelled: null,
  recurrence: null, onCompletion: null, id: null, dependsOn: [], tags: [], isCompleted: false, isDone: false, isBlocked: false, isBlocking: false, urgency: 1, originalMarkdown: `- [ ] ${description}`,
});
const lastRun = () => [...posted].reverse().find((m: FromWebview) => m.type === 'query/run') as { requestId: number; query: string; source?: string | null };

describe('QueryResultsApp', () => {
  it('renders a tree with indented sub-tasks and faded context rows', async () => {
    render(QueryResultsApp);
    await Promise.resolve();
    receive({ type: 'state/init', state: { ...init, uiState: { queryTarget: { text: 'not done', source: 'a.md', label: 'a.md:1' } } } });
    await Promise.resolve();
    const run = lastRun();
    const parent = task('trip', 0), child = { ...task('hotel', 1), parentLine: 0, depth: 1 };
    receive({ type: 'query/result', requestId: run.requestId, tasks: [], matched: 1, errors: [],
      groups: { name: '', count: 1, children: [], tasks: [parent], tree: [{ task: parent, matched: true, children: [{ task: child, matched: false, children: [] }] }] } });
    await Promise.resolve();
    const rows = Array.from(document.querySelectorAll<HTMLElement>('.tree-row'));
    expect(rows.map((r) => r.textContent?.includes('hotel') ? 'hotel' : 'trip')).toEqual(['trip', 'hotel']);
    expect(rows[1]!.style.marginLeft).toBe('18px');
    expect(rows[1]!.classList.contains('context')).toBe(true);
  });

  it('runs the block it is given with its source and renders grouped results', async () => {
    render(QueryResultsApp);
    await Promise.resolve();
    receive({ type: 'state/init', state: { ...init, uiState: { queryTarget: { text: 'not done\ngroup by folder', source: 'notes/a.md', label: 'notes/a.md:3' } } } });
    await Promise.resolve();
    const run = lastRun();
    expect(run.query).toBe('not done\ngroup by folder');
    expect(run.source).toBe('notes/a.md');
    receive({ type: 'query/result', requestId: run.requestId, tasks: [], matched: 2, errors: [],
      groups: { name: '', count: 2, tasks: [], children: [{ name: 'notes', count: 2, children: [], tasks: [task('Write report', 1), task('Call Bob', 2)] }] } });
    await Promise.resolve();
    expect(screen.getByText('notes')).toBeTruthy();
    expect(screen.getByText('Write report')).toBeTruthy();
    expect(screen.getByText(/2 tasks match/)).toBeTruthy();
  });

  it('switches to a new block when the host follows the cursor, and toggles a task from the card', async () => {
    render(QueryResultsApp);
    await Promise.resolve();
    receive({ type: 'state/init', state: init });
    await Promise.resolve();
    expect(posted.some((m: FromWebview) => m.type === 'query/run')).toBe(false);
    receive({ type: 'results/query', target: { text: 'due today', source: 'b.md', label: 'b.md:9' } });
    await Promise.resolve();
    const run = lastRun();
    expect(run.query).toBe('due today');
    receive({ type: 'query/result', requestId: run.requestId, tasks: [task('Pay rent', 4)], groups: null, matched: 1, errors: [] });
    await Promise.resolve();
    await fireEvent.click(screen.getByRole('checkbox', { name: 'toggle' }));
    expect(posted.at(-1)).toEqual({ type: 'task/toggle', key: 'file:///n.md', line: 4 });
  });
});
