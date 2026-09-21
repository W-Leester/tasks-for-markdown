import type { FromWebview, ToWebview, WebviewApi } from './protocol';

declare function acquireVsCodeApi(): WebviewApi;

let api: WebviewApi | undefined;
export function vscode(): WebviewApi {
  if (!api) api = acquireVsCodeApi();
  return api;
}

export function post(msg: FromWebview): void {
  vscode().postMessage(msg);
}

export function onMessage(handler: (msg: ToWebview) => void): () => void {
  const listener = (e: MessageEvent<ToWebview>) => handler(e.data);
  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}

let requestCounter = 0;
export function nextRequestId(): number {
  return ++requestCounter;
}
