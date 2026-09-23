/**
 * Rendered view page: the host sends the note as HTML (`doc/html`); clicks on task checkboxes,
 * task rows and links go back as messages. Plain DOM — no framework needed here.
 */
import type { FromWebview, ToWebview, WebviewApi } from '../shared/protocol';

declare function acquireVsCodeApi(): WebviewApi;
// Plain objects only here, so no snapshot helper (and no Svelte runtime) is needed.
const api = acquireVsCodeApi();
const post = (msg: FromWebview) => api.postMessage(msg);
const content = document.getElementById('content')!;

window.addEventListener('message', (e: MessageEvent<ToWebview>) => {
  const m = e.data;
  if (m.type !== 'doc/html') return;
  const y = window.scrollY;
  content.innerHTML = m.html;
  addRowActions();
  window.scrollTo(0, y);
});

/** Obsidian-style per-row buttons (✎ edit, ⏩ postpone) that appear on hover. */
function addRowActions(): void {
  const labels = document.body.dataset;
  for (const li of Array.from(content.querySelectorAll<HTMLElement>('li.tfm-task'))) {
    if (!li.querySelector(':scope > input.tfm-check') || li.dataset.tfmLine === undefined) continue;
    const actions = document.createElement('span');
    actions.className = 'rv-actions';
    const button = (act: string, icon: string, title: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.act = act;
      b.textContent = icon;
      b.title = title;
      actions.appendChild(b);
    };
    button('edit', '✎', labels.lEdit ?? 'Edit');
    if (li.querySelector(':scope > .tfm-fields .tfm-due, :scope > .tfm-fields .tfm-scheduled, :scope > .tfm-badges .tfm-due, :scope > .tfm-badges .tfm-scheduled')) button('postpone', '⏩', labels.lPostpone ?? 'Postpone');
    // Before any nested list so the buttons stay on the task's own line.
    const nested = li.querySelector(':scope > ul, :scope > ol');
    if (nested) li.insertBefore(actions, nested);
    else li.appendChild(actions);
  }
}

function taskRef(el: Element | null): { path: string | null; line: number } | null {
  const li = el?.closest<HTMLElement>('li.tfm-task');
  if (!li || li.dataset.tfmLine === undefined) return null;
  return { path: li.dataset.tfmPath ?? null, line: Number(li.dataset.tfmLine) };
}

content.addEventListener('click', (e) => {
  const target = e.target as Element;
  const action = target.closest<HTMLButtonElement>('.rv-actions button');
  if (action) {
    e.preventDefault();
    const ref = taskRef(action);
    if (ref) post({ type: action.dataset.act === 'postpone' ? 'doc/postpone' : 'doc/edit', ...ref });
    return;
  }
  if (target.closest('input.tfm-check')) {
    e.preventDefault();
    const ref = taskRef(target);
    if (ref) post({ type: 'doc/toggle', ...ref });
    return;
  }
  const a = target.closest<HTMLAnchorElement>('a[href]');
  if (a) {
    e.preventDefault();
    post({ type: 'doc/link', href: a.getAttribute('href')! });
  }
});

content.addEventListener('dblclick', (e) => {
  const ref = taskRef(e.target as Element);
  if (!ref) return;
  e.preventDefault();
  window.getSelection()?.removeAllRanges();
  post({ type: 'doc/edit', ...ref });
});

document.getElementById('mode-source')?.addEventListener('click', () => post({ type: 'doc/openSource' }));

post({ type: 'ui/ready' });
