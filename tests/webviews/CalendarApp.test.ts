import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import CalendarApp from '../../src/webviews/calendar/CalendarApp.svelte';
import type { FromWebview, InitState } from '../../src/webviews/shared/protocol';
import { posted, receive } from './setup';

const init: InitState = {
  locale: 'en', l10n: {}, today: '2026-09-22', statuses: [], taskFormat: 'emoji', savedQueries: [],
  uiState: {}, editModal: { accessKeys: false, hiddenFields: [] }, globalFilter: '', calendarFontSize: 13,
};

async function boot(uiState: Record<string, unknown> = {}) {
  render(CalendarApp);
  await Promise.resolve();
  const ready = posted.findIndex((m: FromWebview) => m.type === 'ui/ready');
  expect(ready).toBeGreaterThanOrEqual(0);
  receive({ type: 'state/init', state: { ...init, uiState } });
  await Promise.resolve();
  const run = posted.find((m: FromWebview) => m.type === 'query/run') as { requestId: number } | undefined;
  expect(run).toBeDefined();
  receive({ type: 'query/result', requestId: run!.requestId, tasks: [], groups: null, matched: 0, errors: [] });
  await Promise.resolve();
}

describe('CalendarApp full screen', () => {
  it('asks the host to go full screen, reflects the confirmed state, and exits on Escape', async () => {
    await boot();
    const button = screen.getByRole('button', { name: /Full screen/ });
    await fireEvent.click(button);
    expect(posted.at(-1)).toEqual({ type: 'ui/fullscreen', on: true });

    receive({ type: 'ui/fullscreen', on: true });
    await Promise.resolve();
    expect(screen.getByRole('button', { name: /Exit full screen/ })).toBeTruthy();

    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(posted.at(-1)).toEqual({ type: 'ui/fullscreen', on: false });
  });

  it('restores the full-screen label from uiState after a webview reload', async () => {
    await boot({ fullscreen: true });
    expect(screen.getByRole('button', { name: /Exit full screen/ })).toBeTruthy();
  });
});
