import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import EditApp from '../../src/webviews/edit/EditApp.svelte';
import type { FromWebview, InitState } from '../../src/webviews/shared/protocol';
import { posted, receive } from './setup';

const init: InitState = {
  locale: 'en', l10n: {}, today: '2026-09-22', taskFormat: 'emoji', savedQueries: [], uiState: { editTarget: { key: 'file:///n.md', line: 36 } },
  statuses: [{ symbol: ' ', name: 'Todo', type: 'TODO', nextSymbol: 'x' }, { symbol: 'x', name: 'Done', type: 'DONE', nextSymbol: ' ' }],
  editModal: { accessKeys: true, hiddenFields: [] }, globalFilter: '', calendarFontSize: 13, requireDueDate: false,
};

async function boot() {
  posted.length = 0;
  render(EditApp);
  await waitFor(() => expect(posted.some((m) => m.type === 'ui/ready')).toBe(true));
  receive({ type: 'state/init', state: init });
  await waitFor(() => expect(posted.some((m) => m.type === 'task/load')).toBe(true));
  const load = posted.find((m) => m.type === 'task/load') as { requestId: number };
  receive({ type: 'task/loaded', requestId: load.requestId, task: null, candidates: [], dependants: [] });
  await screen.findByLabelText(/Description|설명/);
}

describe('EditApp field order and More section (M12)', () => {
  const open = async (task: unknown) => {
    render(EditApp);
    await Promise.resolve();
    receive({ type: 'state/init', state: { ...init, uiState: { editTarget: { key: 'file:///n.md', line: 3 } } } });
    await Promise.resolve();
    const load = [...posted].reverse().find((m: FromWebview) => m.type === 'task/load') as { requestId: number };
    receive({ type: 'task/loaded', requestId: load.requestId, task: task as never, candidates: [], dependants: [] });
    await Promise.resolve();
  };
  const labels = () => Array.from(document.querySelectorAll('.grid > label, .grid > .lbl')).map((l) => l.textContent?.replace(/\s+[A-Z]$/, '').trim());

  it('shows status, description, priority, due, tags, repeat first; More is collapsed for a new task and has no done/cancelled', async () => {
    await open(null);
    expect(labels().slice(0, 6)).toEqual(['Status', 'Description', 'Priority', 'Due', 'Tags', 'Repeat']);
    expect(document.getElementById('f-scheduled')).toBeNull();
    await fireEvent.click(screen.getByRole('button', { name: /More/ }));
    expect(document.getElementById('f-scheduled')).not.toBeNull();
    expect(document.getElementById('f-done')).toBeNull();
    expect(document.getElementById('f-cancelled')).toBeNull();
  });

  it('editing: trailing tags go to the Tags field and come back on Apply; More opens when a hidden field has a value; done/cancelled available', async () => {
    const task = { key: 'file:///n.md', path: 'n.md', line: 3, heading: null, parentLine: null, depth: 0, description: 'write #urgent report #work #proj', status: { symbol: ' ', name: 'Todo', type: 'TODO' },
      priority: '3', priorityName: 'none', created: null, start: null, scheduled: '2026-10-01', due: '2026-10-02', done: null, cancelled: null,
      recurrence: null, onCompletion: null, id: null, dependsOn: [], tags: ['#urgent', '#work', '#proj'], isCompleted: false, isDone: false, isBlocked: false, urgency: 1, originalMarkdown: '' };
    await open(task);
    expect((document.getElementById('f-description') as HTMLTextAreaElement).value).toBe('write #urgent report');
    expect((document.getElementById('f-tags') as HTMLInputElement).value).toBe('#work #proj');
    expect(document.getElementById('f-scheduled')).not.toBeNull(); // opened because scheduled has a value
    expect(document.getElementById('f-done')).not.toBeNull();
    await fireEvent.input(document.getElementById('f-tags')!, { target: { value: 'work later' } });
    await fireEvent.click(screen.getByRole('button', { name: /Apply|적용/ }));
    const set = posted.find((m: FromWebview) => m.type === 'task/setFields') as { fields: { description: string } };
    expect(set.fields.description).toBe('write #urgent report #work #later');
  });
});

describe('EditApp notes (M13)', () => {
  const base = { key: 'file:///n.md', path: 'n.md', line: 3, heading: null, parentLine: null, depth: 0, description: 'review contract', status: { symbol: ' ', name: 'Todo', type: 'TODO' },
    priority: '3', priorityName: 'none', created: null, start: null, scheduled: null, due: '2026-10-02', done: null, cancelled: null,
    recurrence: null, onCompletion: null, id: null, dependsOn: [], tags: [], isCompleted: false, isDone: false, isBlocked: false, urgency: 1, originalMarkdown: '' };
  const open = async (task: unknown) => {
    posted.length = 0;
    render(EditApp);
    await Promise.resolve();
    receive({ type: 'state/init', state: { ...init, uiState: { editTarget: { key: 'file:///n.md', line: 3 } } } });
    await Promise.resolve();
    const load = [...posted].reverse().find((m: FromWebview) => m.type === 'task/load') as { requestId: number };
    receive({ type: 'task/loaded', requestId: load.requestId, task: task as never, candidates: [], dependants: [] });
    await Promise.resolve();
  };
  const apply = () => fireEvent.click(screen.getByRole('button', { name: /Apply|적용/ }));

  it('loads existing notes (More opens, count on the button) and sends the edited list', async () => {
    await open({ ...base, notes: [{ line: 4, text: 'clause 3' }, { line: 5, text: 'waiting for reply' }] });
    const area = document.getElementById('f-notes') as HTMLTextAreaElement;
    expect(area.value).toBe('clause 3\nwaiting for reply');
    expect(screen.getByRole('button', { name: /More/ }).textContent).toContain('💬 2');
    await fireEvent.input(area, { target: { value: 'clause 3 ok\n\n  ' } });
    await apply();
    const set = posted.find((m: FromWebview) => m.type === 'task/setFields') as { notes?: string[] };
    expect(set.notes).toEqual(['clause 3 ok']);
  });

  it('does not send notes when they were not changed', async () => {
    await open({ ...base, notes: [{ line: 4, text: 'clause 3' }] });
    await apply();
    const set = posted.find((m: FromWebview) => m.type === 'task/setFields') as { notes?: string[] };
    expect(set).toBeDefined();
    expect(set.notes).toBeUndefined();
  });

  it('a new task can be created with notes', async () => {
    await open(null);
    await fireEvent.input(screen.getByLabelText(/Description|설명/), { target: { value: 'new one' } });
    await fireEvent.click(screen.getByRole('button', { name: /More/ }));
    await fireEvent.input(document.getElementById('f-notes')!, { target: { value: 'first\nsecond' } });
    await apply();
    const create = posted.find((m: FromWebview) => m.type === 'task/create') as { notes?: string[] };
    expect(create.notes).toEqual(['first', 'second']);
  });
});

describe('EditApp with tasksmd.requireDueDate', () => {
  it('blocks Apply for a new task without a due date', async () => {
    render(EditApp);
    await Promise.resolve();
    receive({ type: 'state/init', state: { ...init, requireDueDate: true, uiState: { editTarget: { key: 'file:///n.md', line: 3 } } } });
    await Promise.resolve();
    const load = [...posted].reverse().find((m: FromWebview) => m.type === 'task/load') as { requestId: number };
    receive({ type: 'task/loaded', requestId: load.requestId, task: null, candidates: [], dependants: [] });
    await Promise.resolve();
    await fireEvent.input(screen.getByLabelText(/Description|설명/), { target: { value: 'needs a date' } });
    await fireEvent.click(screen.getByRole('button', { name: /Apply|적용/ }));
    expect(posted.some((m: FromWebview) => m.type === 'task/create')).toBe(false);
    expect(document.querySelector('.error')?.textContent).toMatch(/due date is required/);
  });
});

describe('EditApp', () => {
  beforeEach(() => { posted.length = 0; });

  it('creates a task with recurrence and a typed due date on Apply', async () => {
    await boot();
    await fireEvent.input(screen.getByLabelText(/Description|설명/), { target: { value: 'everyday test' } });
    const rec = document.getElementById('f-recurrence') as HTMLInputElement;
    await fireEvent.input(rec, { target: { value: 'every day' } });
    const validate = posted.find((m) => m.type === 'recurrence/validate') as { requestId: number };
    receive({ type: 'recurrence/validated', requestId: validate.requestId, valid: true, canonical: 'every day' });
    const due = document.getElementById('f-due') as HTMLInputElement;
    await fireEvent.input(due, { target: { value: '2026-09-23' } });
    await waitFor(() => expect(document.body.textContent).toContain('2026-09-23 (Wed)'));

    await fireEvent.click(screen.getByRole('button', { name: /Apply|적용/ }));
    const create = posted.find((m) => m.type === 'task/create') as { key: string; line: number; fields: Record<string, unknown> } | undefined;
    expect(create, `posted: ${posted.map((m) => m.type).join(',')} / error text: ${document.querySelector('.error')?.textContent}`).toBeDefined();
    expect(create!.key).toBe('file:///n.md');
    expect(create!.line).toBe(36);
    expect(create!.fields).toMatchObject({ description: 'everyday test', recurrence: 'every day', due: '2026-09-23', status: ' ', priority: '3' });
    expect(posted.some((m) => m.type === 'ui/close')).toBe(true);
  });

  it('blocks a recurring task without any date and shows the reason', async () => {
    await boot();
    await fireEvent.input(screen.getByLabelText(/Description|설명/), { target: { value: 'x' } });
    await fireEvent.input(document.getElementById('f-recurrence')!, { target: { value: 'every day' } });
    const validate = posted.find((m) => m.type === 'recurrence/validate') as { requestId: number };
    receive({ type: 'recurrence/validated', requestId: validate.requestId, valid: true, canonical: 'every day' });
    await fireEvent.click(screen.getByRole('button', { name: /Apply|적용/ }));
    expect(posted.some((m) => m.type === 'task/create')).toBe(false);
    expect(document.querySelector('.error')?.textContent).toMatch(/recurring task needs/);
  });
});
