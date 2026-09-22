import { cleanup } from '@testing-library/svelte';
import { afterEach, vi } from 'vitest';
import type { FromWebview, ToWebview } from '../../src/webviews/shared/protocol';

/** Fake VS Code webview API: records posted messages and lets tests push messages in. */
export const posted: FromWebview[] = [];
(globalThis as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({
  // Real webviews structured-clone messages; a Svelte $state proxy would throw here.
  postMessage: (m: FromWebview) => posted.push(structuredClone(m)),
  getState: () => undefined,
  setState: () => undefined,
});
export function receive(msg: ToWebview): void {
  window.dispatchEvent(new MessageEvent('message', { data: msg }));
}
vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
afterEach(() => cleanup());
