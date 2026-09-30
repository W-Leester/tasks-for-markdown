/**
 * Rendered view page: the host sends the note as HTML (`doc/html`); clicks on task checkboxes,
 * task rows and links go back as messages. Plain DOM — no framework needed here.
 */
import type { FromWebview, ToWebview, WebviewApi } from '../shared/protocol';
import { applyView, columnTracks, HIDEABLE_COLUMNS, SCOPE_MODES, SORT_MODES, type ScopeMode, type SortMode, type ViewState } from './view';

declare function acquireVsCodeApi(): WebviewApi;
// Plain objects only here, so no snapshot helper (and no Svelte runtime) is needed.
const api = acquireVsCodeApi();
const post = (msg: FromWebview) => api.postMessage(msg);
const content = document.getElementById('content')!;
const sortSel = document.getElementById('view-sort') as HTMLSelectElement | null;
const scopeSel = document.getElementById('view-scope') as HTMLSelectElement | null;
const hiddenEl = document.getElementById('view-hidden');
let today = new Date().toISOString().slice(0, 10);
let view: ViewState = { sort: 'document', scope: 'all' };

function refreshView(): void {
  const hidden = applyView(content, view, today);
  if (hiddenEl) hiddenEl.textContent = hidden ? (document.body.dataset.lHidden ?? '{0} hidden').replace('{0}', String(hidden)) : '';
}
// Column menu (M14): hide due / created / other-fields columns in every note; the host remembers the choice.
const colsMenu = document.getElementById('view-cols') as HTMLDetailsElement | null;
const colBoxes = Array.from(document.querySelectorAll<HTMLInputElement>('#view-cols input[data-col]'));
let hiddenColumns: string[] = [];
function applyColumns(hidden: readonly string[]): void {
  hiddenColumns = HIDEABLE_COLUMNS.filter((c) => hidden.includes(c));
  for (const c of HIDEABLE_COLUMNS) document.body.classList.toggle(`hide-col-${c}`, hiddenColumns.includes(c));
  document.body.style.setProperty('--rv-cols', columnTracks(hiddenColumns));
  for (const box of colBoxes) box.checked = !hiddenColumns.includes(box.dataset.col!);
  applyHeaders();
  const summary = colsMenu?.querySelector('summary');
  if (summary) summary.textContent = hiddenColumns.length ? (summary.dataset.lHidden ?? 'Columns · {0} hidden').replace('{0}', String(hiddenColumns.length)) : (summary.dataset.lLabel ?? 'Columns');
}
// Column header (M15): a thin line over each ```tasks result and each top-level task list in the note; hover shows
// titles with ✕, hidden columns come back via + chips. Same setting as the toolbar menu (all notes).
const colLabel = (c: string) => (document.body.dataset as Record<string, string | undefined>)[`lCol${c[0]!.toUpperCase()}${c.slice(1)}`] ?? c;
function headerHtml(): string {
  const labels = document.body.dataset;
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const hide = labels.lColHide ?? 'Hide column';
  return (
    `<span></span><span class="rv-colhead-cell">${esc(colLabel('desc'))}</span>` +
    HIDEABLE_COLUMNS.filter((c) => !hiddenColumns.includes(c))
      .map((c) => `<span class="rv-colhead-cell">${esc(colLabel(c))}<button type="button" data-hide="${c}" title="${esc(hide)}" aria-label="${esc(`${hide}: ${colLabel(c)}`)}">✕</button></span>`)
      .join('') +
    (hiddenColumns.length ? `<span class="rv-colhead-chips">${hiddenColumns.map((c) => `<button type="button" data-show="${c}" title="${esc(labels.lColShow ?? 'Show column')}">+ ${esc(colLabel(c))}</button>`).join('')}</span>` : '')
  );
}
/** Where headers go: result boxes with tasks, and top-level note lists whose own items include tasks. */
function applyHeaders(): void {
  const html = headerHtml();
  for (const query of Array.from(content.querySelectorAll<HTMLElement>('.tfm-query-block > .tfm-query'))) {
    if (!query.querySelector('li.tfm-task')) continue;
    let head = query.querySelector<HTMLElement>(':scope > .rv-colhead');
    if (!head) {
      head = document.createElement('div');
      head.className = 'rv-colhead';
      query.insertBefore(head, query.firstChild);
    }
    head.innerHTML = html;
  }
  for (const list of Array.from(content.querySelectorAll<HTMLElement>('ul, ol'))) {
    if (list.closest('.tfm-query') || list.parentElement?.closest('li')) continue;
    if (!list.querySelector(':scope > li.tfm-task')) continue;
    let head = list.querySelector<HTMLElement>(':scope > li.rv-colhead');
    if (!head) {
      head = document.createElement('li');
      head.className = 'rv-colhead';
      list.insertBefore(head, list.firstChild);
    }
    head.innerHTML = html;
  }
}
function setHiddenColumns(hidden: string[], focusFrom?: Element): void {
  // Remember which header was used so keyboard users stay in it after the rebuild.
  const headers = Array.from(content.querySelectorAll('.rv-colhead'));
  const at = focusFrom ? headers.indexOf(focusFrom.closest('.rv-colhead')!) : -1;
  applyColumns(hidden);
  post({ type: 'doc/columns', hidden: hiddenColumns });
  if (at >= 0) content.querySelectorAll<HTMLElement>('.rv-colhead')[at]?.querySelector<HTMLElement>('button')?.focus();
}

for (const box of colBoxes) {
  box.addEventListener('change', () => setHiddenColumns(colBoxes.filter((b) => !b.checked).map((b) => b.dataset.col!)));
}
// Close the menu on outside click or Esc.
document.addEventListener('click', (e) => { if (colsMenu?.open && !colsMenu.contains(e.target as Node)) colsMenu.open = false; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && colsMenu?.open) { colsMenu.open = false; colsMenu.querySelector('summary')?.focus(); } });

sortSel?.addEventListener('change', () => { view = { ...view, sort: sortSel.value as SortMode }; post({ type: 'doc/view', ...view }); refreshView(); });
scopeSel?.addEventListener('change', () => { view = { ...view, scope: scopeSel.value as ScopeMode }; post({ type: 'doc/view', ...view }); refreshView(); });

window.addEventListener('message', (e: MessageEvent<ToWebview>) => {
  const m = e.data;
  if (m.type === 'doc/columns') { applyColumns(m.hidden); return; }
  if (m.type !== 'doc/html') return;
  document.documentElement.style.setProperty('--rv-font-size', `${m.fontSize}px`);
  document.documentElement.style.setProperty('--rv-line-height', String(m.lineHeight));
  document.body.classList.toggle('fields-right', m.fieldsAlign === 'right');
  document.body.classList.toggle('fields-columns', m.fieldsAlign === 'columns');
  document.documentElement.style.setProperty('--rv-max-width', m.maxWidth > 0 ? `${m.maxWidth}px` : 'none');
  today = m.today;
  view = { sort: (SORT_MODES as string[]).includes(m.view.sort) ? (m.view.sort as SortMode) : 'document', scope: (SCOPE_MODES as string[]).includes(m.view.scope) ? (m.view.scope as ScopeMode) : 'all' };
  if (sortSel) sortSel.value = view.sort;
  if (scopeSel) scopeSel.value = view.scope;
  const y = window.scrollY;
  content.innerHTML = m.html;
  applyColumns(m.hiddenColumns ?? []);
  addRowActions();
  refreshView();
  window.scrollTo(0, y);
});

/** Obsidian-style per-row buttons (✎ edit, ⏩ postpone, 💬 note) that appear on hover. */
function addRowActions(): void {
  const labels = document.body.dataset;
  for (const li of Array.from(content.querySelectorAll<HTMLElement>('li.tfm-task'))) {
    if (!li.querySelector(':scope > input.tfm-check, :scope > p > input.tfm-check') || li.dataset.tfmLine === undefined) continue;
    const actions = document.createElement('span');
    actions.className = 'rv-actions';
    const button = (act: string, icon: string, title: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.act = act;
      b.textContent = icon;
      b.title = title;
      b.setAttribute('aria-label', title);
      actions.appendChild(b);
    };
    button('edit', '✎', labels.lEdit ?? 'Edit');
    if (li.querySelector(':scope > .tfm-fields .tfm-due, :scope > .tfm-fields .tfm-scheduled, :scope > .tfm-badges .tfm-due, :scope > .tfm-badges .tfm-scheduled, :scope > p > .tfm-fields .tfm-due, :scope > p > .tfm-fields .tfm-scheduled, :scope > .tfm-col .tfm-due, :scope > .tfm-col .tfm-scheduled, :scope > p > .tfm-col .tfm-due, :scope > p > .tfm-col .tfm-scheduled')) button('postpone', '⏩', labels.lPostpone ?? 'Postpone');
    button('note', '💬', labels.lNote ?? 'Add note');
    // Before any nested list so the buttons stay on the task's own line.
    const nested = li.querySelector(':scope > ul, :scope > ol');
    const para = li.querySelector(':scope > p');
    const desc = li.querySelector(':scope > .tfm-desc, :scope > p > .tfm-desc');
    if (document.body.classList.contains('fields-columns') && desc) desc.appendChild(actions); // keep the grid cells in place
    else if (para) para.appendChild(actions);
    else if (nested) li.insertBefore(actions, nested);
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
  const colButton = target.closest<HTMLButtonElement>('.rv-colhead button');
  if (colButton) {
    e.preventDefault();
    if (colButton.dataset.hide) setHiddenColumns([...hiddenColumns, colButton.dataset.hide], colButton);
    else setHiddenColumns(hiddenColumns.filter((c) => c !== colButton.dataset.show), colButton);
    return;
  }
  const action = target.closest<HTMLButtonElement>('.rv-actions button');
  if (action) {
    e.preventDefault();
    const ref = taskRef(action);
    if (!ref) return;
    if (action.dataset.act === 'note') openNoteForm(action.closest<HTMLElement>('li.tfm-task')!, ref);
    else post({ type: action.dataset.act === 'postpone' ? 'doc/postpone' : 'doc/edit', ...ref });
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

/** Input under the task row; Enter adds the note (an indented bullet) to the file, Esc/blur closes it. */
function openNoteForm(li: HTMLElement, ref: { path: string | null; line: number }): void {
  content.querySelector('.rv-note-form')?.remove();
  const form = document.createElement('div');
  form.className = 'rv-note-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = document.body.dataset.lNotePlaceholder ?? 'Note — Enter to save, Esc to cancel';
  form.appendChild(input);
  const nested = li.querySelector(':scope > ul, :scope > ol');
  if (nested) li.insertBefore(form, nested);
  else li.appendChild(form);
  const close = () => form.remove();
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    const text = input.value.trim();
    if (text) post({ type: 'doc/addNote', ...ref, text });
    close();
  });
  input.addEventListener('blur', () => { if (!input.value.trim()) close(); });
  input.focus();
}

content.addEventListener('dblclick', (e) => {
  if ((e.target as Element).closest('.rv-note-form, .tfm-notes')) return;
  const ref = taskRef(e.target as Element);
  if (!ref) return;
  e.preventDefault();
  window.getSelection()?.removeAllRanges();
  post({ type: 'doc/edit', ...ref });
});

document.getElementById('mode-source')?.addEventListener('click', () => post({ type: 'doc/openSource' }));

post({ type: 'ui/ready' });
