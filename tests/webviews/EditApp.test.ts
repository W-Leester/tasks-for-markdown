import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it } from 'vitest';
import EditApp from '../../src/webviews/edit/EditApp.svelte';
import type { InitState } from '../../src/webviews/shared/protocol';
import { posted, receive } from './setup';

const init: InitState = {
  locale: 'en', l10n: {}, today: '2026-09-22', taskFormat: 'emoji', savedQueries: [], uiState: { editTarget: { key: 'file:///n.md', line: 36 } },
  statuses: [{ symbol: ' ', name: 'Todo', type: 'TODO', nextSymbol: 'x' }, { symbol: 'x', name: 'Done', type: 'DONE', nextSymbol: ' ' }],
  editModal: { accessKeys: true, hiddenFields: [] }, globalFilter: '', calendarFontSize: 13,
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
