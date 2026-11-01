/**
 * Rendered view page: the host sends the note as HTML (`doc/html`); clicks on task checkboxes,
 * task rows and links go back as messages. Plain DOM — no framework needed here.
 */
import type { FromWebview, ToWebview, WebviewApi } from '../shared/protocol';
import { matchAnchor } from '../../core/file/headingAnchor';
import { createFindBar } from './find';
import { decorateNotes, handleNoteClick } from '../shared/notes';
import { applyView, clampWidth, type ColumnWidths, columnTracks, fitWidth, HIDEABLE_COLUMNS, type HideableColumn, moveBoundary, MAX_WIDTH, widthOf, SCOPE_MODES, SORT_MODES, type ScopeMode, type SortMode, type ViewState } from './view';

declare function acquireVsCodeApi(): WebviewApi;
// Plain objects only here, so no snapshot helper (and no Svelte runtime) is needed.
const api = acquireVsCodeApi();
const post = (msg: FromWebview) => api.postMessage(msg);
const content = document.getElementById('content')!;
const findBar = createFindBar(content);
// Cmd/Ctrl+F: the view's own find bar (also from a quote's text box); kept from VS Code, whose webview find did not work.
document.addEventListener('keydown', (e) => {
  const cmd = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey;
  if (!cmd || (e.keyCode !== 70 && e.code !== 'KeyF')) return;
  e.preventDefault();
  e.stopPropagation();
  findBar.open();
});
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
let columnWidths: ColumnWidths = {};
function applyWidths(): void {
  document.body.style.setProperty('--rv-cols', columnTracks(hiddenColumns, columnWidths));
}
function applyColumns(hidden: readonly string[]): void {
  hiddenColumns = HIDEABLE_COLUMNS.filter((c) => hidden.includes(c));
  for (const c of HIDEABLE_COLUMNS) document.body.classList.toggle(`hide-col-${c}`, hiddenColumns.includes(c));
  applyWidths();
  for (const box of colBoxes) box.checked = !hiddenColumns.includes(box.dataset.col!);
  applyHeaders();
  const summary = colsMenu?.querySelector('summary');
  if (summary) summary.textContent = hiddenColumns.length ? (summary.dataset.lHidden ?? 'Columns · {0} hidden').replace('{0}', String(hiddenColumns.length)) : (summary.dataset.lLabel ?? 'Columns');
}
// Column header (M15): titles over each ```tasks result and each top-level task list in the note, always shown (M24);
// hover or focus shows ✕, the + chips for hidden columns and the width grips. Same setting as the toolbar menu (all notes).
const colLabel = (c: string) => (document.body.dataset as Record<string, string | undefined>)[`lCol${c[0]!.toUpperCase()}${c.slice(1)}`] ?? c;
function headerHtml(): string {
  const labels = document.body.dataset;
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
  const hide = labels.lColHide ?? 'Hide column';
  // Chips for hidden columns sit at the right end of the description cell (the flexible track), so they
  // never cover another column's title (incident #24: absolutely positioned, they overlapped the last one).
  const chips = hiddenColumns.length ? `<span class="rv-colhead-chips">${hiddenColumns.map((c) => `<button type="button" data-show="${c}" title="${esc(labels.lColShow ?? 'Show column')}">+ ${esc(colLabel(c))}</button>`).join('')}</span>` : '';
  return (
    `<span></span><span class="rv-colhead-cell rv-colhead-desc"><span class="rv-colhead-text">${esc(colLabel('desc'))}</span>${chips}</span>` +
    HIDEABLE_COLUMNS.filter((c) => !hiddenColumns.includes(c))
      .map((c) =>
        `<span class="rv-colhead-cell">` +
        `<span class="rv-colgrip" role="separator" aria-orientation="vertical" tabindex="0" data-col="${c}" aria-valuenow="${widthOf(c, columnWidths)}" aria-valuemin="3" aria-valuemax="${MAX_WIDTH}" aria-label="${esc(`${labels.lColWidth ?? 'Column width'}: ${colLabel(c)}`)}" title="${esc(labels.lColWidthHint ?? 'Drag to resize, double-click to fit the content')}"></span>` +
        `<span class="rv-colhead-text">${esc(colLabel(c))}</span><button type="button" data-hide="${c}" title="${esc(hide)}" aria-label="${esc(`${hide}: ${colLabel(c)}`)}">✕</button></span>`)
      .join('')
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

// Column widths (M16, M24): drag a column's left edge in the header — only that boundary moves; ←/→ move it 0.5em;
// double-click fits the content, Home resets.
function setWidth(c: HideableColumn, em: number | null): void {
  if (em === null) delete columnWidths[c];
  else columnWidths[c] = clampWidth(em);
  applyWidths();
}
function saveWidths(): void {
  post({ type: 'doc/columnWidths', widths: { ...columnWidths } as Record<string, number> });
}
/** Natural one-line width of a cell: a hidden max-content copy next to it, so it gets the same fonts. */
function naturalWidth(el: HTMLElement): number {
  const probe = el.cloneNode(true) as HTMLElement;
  probe.classList.add('rv-measure');
  for (const g of Array.from(probe.querySelectorAll('.rv-colgrip'))) g.remove();
  el.parentElement!.appendChild(probe);
  const w = probe.getBoundingClientRect().width;
  probe.remove();
  return w;
}
/** Autofit width for column c: the widest visible cell or the column's title, whichever is wider. */
function fitColumn(c: HideableColumn, grip: HTMLElement): number {
  const px = parseFloat(getComputedStyle(grip.closest('.rv-colhead')!).fontSize) || 14;
  let widest = naturalWidth(grip.parentElement!);
  for (const cell of Array.from(content.querySelectorAll<HTMLElement>(`li.tfm-task > .tfm-col-${c}, li.tfm-task > p > .tfm-col-${c}`))) {
    if (cell.getClientRects().length) widest = Math.max(widest, naturalWidth(cell)); // skip rows that are not shown
  }
  return fitWidth(widest, px);
}
/**
 * Update the grips' aria values in place. Never rebuild the header here: replacing the grip between the two
 * clicks of a double-click means the browser never fires dblclick (M24, found by dragging in a real browser).
 */
function syncGrips(): void {
  for (const g of Array.from(content.querySelectorAll<HTMLElement>('.rv-colgrip'))) g.setAttribute('aria-valuenow', String(widthOf(g.dataset.col as HideableColumn, columnWidths)));
}
/**
 * Widths as drawn, in em: the "more" track may be narrower than its setting in a narrow window, and the
 * description can only give what it has above its 8em minimum. Measured on the grip's header row.
 */
function drawnWidths(grip: HTMLElement): { widths: ColumnWidths; descRoom: number; px: number } {
  const head = grip.closest<HTMLElement>('.rv-colhead')!;
  const px = parseFloat(getComputedStyle(head).fontSize) || 14;
  const em = (el: Element | null | undefined) => (el ? el.getBoundingClientRect().width / px : 0);
  const widths: ColumnWidths = { ...columnWidths };
  for (const c of HIDEABLE_COLUMNS) {
    const drawn = em(head.querySelector(`.rv-colgrip[data-col="${c}"]`)?.parentElement);
    if (drawn > 0 && drawn < widthOf(c, columnWidths) - 0.1) widths[c] = clampWidth(drawn);
  }
  const desc = em(head.querySelector('.rv-colhead-desc'));
  return { widths, descRoom: desc > 0 ? Math.max(0, desc - 8) : Infinity, px };
}
content.addEventListener('pointerdown', (e) => {
  const grip = (e.target as Element).closest<HTMLElement>('.rv-colgrip');
  if (!grip || e.button !== 0) return;
  e.preventDefault();
  const c = grip.dataset.col as HideableColumn;
  const startX = e.clientX;
  // Tracks are in em of the row font; the header uses the same font size.
  const { widths: start, descRoom, px } = drawnWidths(grip);
  document.body.classList.add('rv-resizing');
  grip.classList.add('rv-active');
  try { grip.setPointerCapture(e.pointerId); } catch { /* not supported */ }
  let moved = false;
  const move = (ev: PointerEvent) => {
    if (ev.clientX === startX && !moved) return;
    moved = true;
    columnWidths = moveBoundary(c, hiddenColumns, start, (ev.clientX - startX) / px, descRoom);
    applyWidths();
  };
  const up = () => {
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', up);
    grip.removeEventListener('pointercancel', up);
    document.body.classList.remove('rv-resizing');
    grip.classList.remove('rv-active');
    // A plain click (or the first click of a double-click) changes nothing: no save, and the grip stays in place.
    if (!moved) return;
    saveWidths();
    syncGrips();
  };
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', up);
  grip.addEventListener('pointercancel', up);
});
content.addEventListener('keydown', (e) => {
  const grip = (e.target as Element).closest<HTMLElement>('.rv-colgrip');
  if (!grip) return;
  const c = grip.dataset.col as HideableColumn;
  // The grip is the column's left edge: ←/→ move that boundary, like dragging.
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    const { widths, descRoom } = drawnWidths(grip);
    columnWidths = moveBoundary(c, hiddenColumns, widths, e.key === 'ArrowLeft' ? -0.5 : 0.5, descRoom);
    applyWidths();
  }
  else if (e.key === 'Home') setWidth(c, null);
  else return;
  e.preventDefault();
  saveWidths();
  syncGrips();
});

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
  if (m.type === 'doc/inserted') { chainLine = m.line; continueChain(); return; }
  if (m.type === 'doc/columnWidths') { columnWidths = { ...m.widths }; applyWidths(); applyHeaders(); return; }
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
  formText = content.querySelector<HTMLInputElement>('li.rv-task-form input')?.value ?? '';
  const keepQuote = quoteEdit && !quoteEdit.done ? { kind: quoteEdit.kind, start: quoteEdit.start, expected: quoteEdit.expected, value: quoteEdit.area.value, selection: [quoteEdit.area.selectionStart, quoteEdit.area.selectionEnd] as [number, number] } : null;
  if (quoteEdit) quoteEdit.done = true;
  quoteEdit = null;
  // Removing a focused input fires its blur while it is still attached; that is not the user leaving it.
  rerendering = true;
  content.innerHTML = m.html;
  rerendering = false;
  columnWidths = { ...(m.columnWidths ?? {}) };
  applyColumns(m.hiddenColumns ?? []);
  addRowActions();
  decorateNotes(content, { edit: document.body.dataset.lNoteEdit ?? 'Edit note', remove: document.body.dataset.lNoteDelete ?? 'Delete note' });
  addTaskRows();
  markQuotes();
  markBlocks();
  refreshView();
  window.scrollTo(0, y);
  // Other extensions' preview scripts (Mermaid…, M34) redraw on the event the built-in preview sends after an update.
  window.dispatchEvent(new CustomEvent('vscode.markdown.updateContent'));
  // Keep the row selected across re-renders (toggling done rewrites the file and re-renders the note).
  const keep = selected ? Number(selected.dataset.tfmLine) : null;
  selected = null;
  awaitingRender = false;
  // An open new-task input survives re-renders (an insert re-renders twice: the edit, then the save).
  if (keep !== null) {
    const li = bodyRow(keep);
    if (li) selectRow(li);
    else post({ type: 'doc/select', line: null });
  }
  if (formLine !== null && chainLine === null) { const li = bodyRow(formLine); if (li) openTaskForm(li, formText); else formLine = null; }
  // A quote being typed into survives re-renders too (another part of the file changed, the index updated…).
  if (keepQuote) {
    const { kind } = keepQuote;
    const el = kind === 'append'
      ? content.querySelector<HTMLElement>('.rv-write')
      : Array.from(content.querySelectorAll<HTMLElement>(kind === 'quote' ? 'blockquote.rv-quote' : '.rv-block')).find((q) => (kind === 'quote' ? q.dataset.tfmQuote : q.dataset.tfmBlock)!.startsWith(`${keepQuote.start}-`));
    if (el) openBox(el, kind, keepQuote);
  }
  findBar.refresh();
  continueChain();
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
    if (li.dataset.tfmPath === undefined) button('add', '＋', labels.lAddBelow ?? 'Add a task below'); // note body only (M27)
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

// Where the press started: closing an open text box on mousedown moves the blocks under the pointer, and the click then
// lands on their common parent (11-01: clicking a sub-item opened its parent item).
let pressed: Element | null = null;
content.addEventListener('mousedown', (e) => { pressed = e.target as Element; }, true);
content.addEventListener('click', (e) => {
  const target = e.target as Element;
  const at = pressed?.isConnected ? pressed : target;
  pressed = null;
  if (handleNoteClick(e, (edit) => post({ type: 'doc/editNote', ...edit }))) return;
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
    else if (action.dataset.act === 'add') openTaskForm(action.closest<HTMLElement>('li.tfm-task')!);
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
    // `#제목` (a table of contents): scroll to that heading here, not open the source. `#L12` still goes to the line.
    const href = a.getAttribute('href')!;
    if (href.startsWith('#') && !/^#L\d+$/.test(href)) {
      const heads = Array.from(content.querySelectorAll<HTMLElement>('[data-tfm-anchor]'));
      heads[matchAnchor(heads.map((h) => h.dataset.tfmAnchor!), href.slice(1))]?.scrollIntoView({ block: 'start' });
      return;
    }
    post({ type: 'doc/link', href: a.getAttribute('href')! });
    return;
  }
  const add = target.closest<HTMLElement>('li.rv-addrow');
  if (add) { e.preventDefault(); const last = lastTaskOf(add.parentElement!); if (last) openTaskForm(last); return; }
  // M38: clicking a note-body quote turns it into a text area (not on a task row inside it).
  if (target.closest('textarea.rv-quote-input, .rv-box')) return;
  const bq = at.closest<HTMLElement>('blockquote.rv-quote');
  const rowIn = at.closest('li.tfm-task, input, button, details, summary');
  if (bq && !(rowIn && bq.contains(rowIn))) { e.preventDefault(); openBox(bq, 'quote'); return; }
  // M39: any other marked block (paragraph, heading, list item, table, code) too — not after dragging to select text.
  const write = at.closest<HTMLElement>('.rv-write');
  if (write) { e.preventDefault(); openBox(write, 'append'); return; }
  const block = at.closest<HTMLElement>('.rv-block');
  if (block && !rowIn && !window.getSelection()?.toString()) { e.preventDefault(); openBox(block, 'block'); return; }
  // M27: clicking a note-body task row selects it; Enter then adds a task below it.
  const row = target.closest<HTMLElement>('li.tfm-task');
  if (row && row.dataset.tfmPath === undefined && row.dataset.tfmLine !== undefined && !target.closest('input, button, textarea, details, summary, .tfm-notes')) selectRow(row);
});


// ---- M38: typing into a blockquote ----
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
/** What a text box edits: a quote (M38), another block (M39), or new text at the end of the note (M39). */
type BoxKind = 'quote' | 'block' | 'append';
/** The text box open now: its kind, lines, the text it was drawn with, and its text area. */
let quoteEdit: { kind: BoxKind; start: number; end: number; expected: string; area: HTMLTextAreaElement; done: boolean; finish(save: boolean, saveFile?: boolean): void } | null = null;
/**
 * Note-body quotes the host marked (outermost ones) can be clicked into; not those in query results. An empty one
 * (`>` alone) shows a faint "Type here" so it is not a sliver.
 */
function markQuotes(): void {
  const title = document.body.dataset.lQuoteEdit ?? 'Click to type';
  const placeholder = document.body.dataset.lQuotePlaceholder ?? 'Type here';
  for (const bq of Array.from(content.querySelectorAll<HTMLElement>('blockquote[data-tfm-quote]'))) {
    if (bq.closest('.tfm-query')) continue;
    bq.classList.add('rv-quote');
    bq.title = title;
    if (!bq.dataset.tfmQuoteText?.trim()) { bq.classList.add('rv-quote-empty'); bq.dataset.placeholder = placeholder; }
  }
}
/**
 * M39: note-body blocks the host marked can be clicked into — not in query results, not task rows, items holding
 * tasks or notes under a task (those keep their row clicks and ✎). Also "+ Write" at the end of the note.
 */
function markBlocks(): void {
  for (const marked of Array.from(content.querySelectorAll<HTMLElement>('[data-tfm-block]'))) {
    // markdown-it puts a fenced code block's marks on its <code>; the <pre> is the block.
    let el = marked;
    if (marked.tagName === 'CODE' && marked.parentElement?.tagName === 'PRE') {
      el = marked.parentElement;
      el.dataset.tfmBlock = marked.dataset.tfmBlock;
      el.dataset.tfmBlockText = marked.dataset.tfmBlockText;
      delete marked.dataset.tfmBlock;
      delete marked.dataset.tfmBlockText;
    }
    if (el.closest('.tfm-query, li.tfm-task, .tfm-notes, li.tfm-note') || el.querySelector('li.tfm-task')) continue;
    el.classList.add('rv-block');
  }
  const write = document.createElement('div');
  write.className = 'rv-write';
  write.textContent = `＋ ${document.body.dataset.lWrite ?? 'Write'}`;
  content.appendChild(write);
}
/**
 * The source of a quote (one `>` level off), a block or new text in a text area in its place. Cmd/Ctrl+Enter or
 * leaving it saves (when changed), Esc puts the view back. `keep` restores an area that was open before a re-render.
 * A quote's area goes inside the blockquote; a block is hidden and the area goes right after it (an `li` in a list),
 * so tables and lists keep their structure.
 */
function openBox(el: HTMLElement, kind: BoxKind, keep?: { expected: string; value: string; selection: [number, number] }): void {
  quoteEdit?.finish(true);
  const range = kind === 'quote' ? el.dataset.tfmQuote! : kind === 'block' ? el.dataset.tfmBlock! : '-1--1';
  const [start, end] = kind === 'append' ? [-1, -1] : (range.split('-').map(Number) as [number, number]);
  const expected = keep?.expected ?? (kind === 'quote' ? el.dataset.tfmQuoteText : kind === 'block' ? el.dataset.tfmBlockText : '') ?? '';
  const area = document.createElement('textarea');
  area.className = 'rv-quote-input';
  area.title = document.body.dataset.lQuoteHint ?? 'Cmd/Ctrl+Enter or click outside to save, Esc to cancel';
  area.placeholder = document.body.dataset.lQuotePlaceholder ?? 'Type here';
  area.value = keep?.value ?? expected;
  const rendered = Array.from(el.childNodes);
  let holder: HTMLElement | null = null;
  if (kind === 'quote') {
    el.replaceChildren(area);
    el.classList.add('rv-quote-editing');
    el.removeAttribute('title');
  } else {
    holder = document.createElement(el.tagName === 'LI' ? 'li' : 'div');
    holder.className = el.tagName === 'TABLE' || el.tagName === 'PRE' ? 'rv-box rv-box-code' : 'rv-box';
    holder.appendChild(area);
    el.hidden = true;
    el.after(holder);
  }
  const state = {
    kind, start, end, expected, area, done: false,
    /** `saveFile` (Cmd/Ctrl+S): the note is saved to disk too, even when it is open in the source editor. */
    finish(save: boolean, saveFile = false) {
      if (state.done) return;
      state.done = true;
      if (quoteEdit === state) quoteEdit = null;
      // Saved: the area stays (read-only) until the note re-renders with the new text.
      if (save && area.value !== expected) {
        area.readOnly = true;
        const s = saveFile ? { save: true } : {};
        if (kind === 'quote') post({ type: 'doc/editQuote', start, end, expected, text: area.value, ...s });
        else if (kind === 'block') post({ type: 'doc/editBlock', start, end, expected, text: area.value, ...s });
        else post({ type: 'doc/append', text: area.value, ...s });
        return;
      }
      if (saveFile) post({ type: 'doc/save' });
      if (kind === 'quote') {
        el.replaceChildren(...rendered);
        el.classList.remove('rv-quote-editing');
        el.title = document.body.dataset.lQuoteEdit ?? 'Click to type';
      } else {
        holder!.remove();
        el.hidden = false;
      }
    },
  };
  quoteEdit = state;
  const fit = () => { area.style.height = 'auto'; area.style.height = `${area.scrollHeight}px`; };
  area.addEventListener('input', fit);
  const history = boxHistory(area, fit);
  area.addEventListener('keydown', (e) => {
    // In the desktop app the edit-menu keys never reach a webview's text box by themselves (11-01): the box does undo,
    // redo, select all and save; copy/paste/cut and the editor's other shortcuts (Cmd+P, Cmd+Shift+P, Cmd+W, …) go on to
    // VS Code. Keys without Cmd stay here (typing, and not the selected-row keys). On macOS Ctrl+A/E/K… are text keys.
    // The physical key too: with a Korean input source a key pressed mid-syllable can come as keyCode 229.
    const k = e.keyCode === 229 && /^Key[A-Z]$/.test(e.code) ? e.code.charCodeAt(3) : e.keyCode;
    const cmd = (e.metaKey || (e.ctrlKey && !IS_MAC)) && !e.altKey;
    const undo = cmd && k === 90 && !e.shiftKey;
    const redo = cmd && ((k === 90 && e.shiftKey) || (k === 89 && !IS_MAC && !e.shiftKey));
    const selectAll = cmd && k === 65 && !e.shiftKey;
    const save = cmd && k === 83 && !e.shiftKey;
    const done = e.key === 'Enter' && (e.metaKey || e.ctrlKey);
    // Cmd+Shift+V (paste as plain text) stays here as before (10-31: it pasted); the box is plain text anyway.
    if (!cmd || undo || redo || selectAll || save || done || (k === 86 && e.shiftKey)) e.stopPropagation();
    if (undo || redo) { e.preventDefault(); if (redo) history.redo(); else history.undo(); return; }
    if (e.isComposing || k === 229) return;
    if (selectAll) { e.preventDefault(); area.select(); }
    else if (save) { e.preventDefault(); state.finish(true, true); }
    else if (done) { e.preventDefault(); state.finish(true); }
    else if (e.key === 'Escape') { e.preventDefault(); state.finish(false); }
  });
  // Removing the area in a re-render blurs it; that is not the user leaving it.
  area.addEventListener('blur', () => { if (!rerendering) state.finish(true); });
  fit();
  area.focus({ preventScroll: true });
  // After the last character, not on the quote's trailing blank lines.
  const [from, to] = keep?.selection ?? [area.value.trimEnd().length, area.value.trimEnd().length];
  area.setSelectionRange(from, to);
  history.reset();
}

/**
 * The box's own undo/redo (11-01). Chromium's undo stack in a webview text box only picked up pastes in Cursor, not
 * typing (Korean input especially), so the box keeps its text after each burst of typing, deleting or pasting.
 */
function boxHistory(area: HTMLTextAreaElement, after: () => void): { undo(): void; redo(): void; reset(): void } {
  type Snap = { value: string; from: number; to: number };
  const snap = (): Snap => ({ value: area.value, from: area.selectionStart, to: area.selectionEnd });
  let steps: Snap[] = [snap()];
  let at = 0;
  let lastKind = '';
  let lastTime = 0;
  let wordEnded = false;
  let composing = false;
  let pending: 'undo' | 'redo' | null = null;
  const MERGE_MS = 1000;
  const record = (kind: string, data: string | null) => {
    const now = Date.now();
    const typing = kind === 'insertText' || kind.startsWith('deleteContent');
    // A run of typing (or of deleting) is one step, until a pause, a new line or a space ends it.
    const merge = typing && kind === lastKind && now - lastTime < MERGE_MS && at > 0 && !wordEnded;
    wordEnded = /\s/.test(data ?? '');
    steps = steps.slice(0, at + 1);
    if (merge) steps[at] = snap();
    else { steps.push(snap()); at = steps.length - 1; }
    if (steps.length > 200) { steps.shift(); at--; }
    lastKind = kind;
    lastTime = now;
  };
  const show = (to: number) => {
    at = to;
    const s = steps[at]!;
    area.value = s.value;
    area.setSelectionRange(s.from, s.to);
    lastKind = '';
    after();
  };
  const run = (what: 'undo' | 'redo') => {
    // Mid-syllable: once the syllable is done (it is part of the text by then).
    if (composing) { pending = what; return; }
    if (what === 'undo' && at > 0) show(at - 1);
    else if (what === 'redo' && at < steps.length - 1) show(at + 1);
  };
  area.addEventListener('input', (e) => {
    const ie = e as InputEvent;
    if (ie.isComposing || composing) return;
    record(ie.inputType || 'insertText', ie.data);
  });
  area.addEventListener('compositionstart', () => { composing = true; });
  area.addEventListener('compositionend', (e) => {
    composing = false;
    record('insertText', e.data);
    const p = pending;
    pending = null;
    if (p) run(p);
  });
  return { undo: () => run('undo'), redo: () => run('redo'), reset: () => { steps = [snap()]; at = 0; lastKind = ''; } };
}

// ---- M27: new task lines from the rendered view ----
let selected: HTMLElement | null = null;
/**
 * Line of the task just inserted; the next input opens below it once the view shows the new task. The host's
 * reply (doc/inserted) and the re-rendered note (doc/html) can come in either order, so both must have arrived.
 */
let chainLine: number | null = null;
let awaitingRender = false;
/** The row the new-task input sits under, and what was typed, to put it back after a re-render. */
let formLine: number | null = null;
let formText = '';
let rerendering = false;
function selectRow(li: HTMLElement): void {
  selected?.classList.remove('rv-selected');
  selected = li;
  li.classList.add('rv-selected');
  post({ type: 'doc/select', line: Number(li.dataset.tfmLine) });
  li.tabIndex = -1;
  li.focus({ preventScroll: true });
}
function lastTaskOf(list: Element): HTMLElement | null {
  const tasks = Array.from(list.querySelectorAll<HTMLElement>(':scope > li.tfm-task'));
  return tasks[tasks.length - 1] ?? null;
}
function bodyRow(line: number): HTMLElement | null {
  return Array.from(content.querySelectorAll<HTMLElement>(`li.tfm-task[data-tfm-line="${line}"]`)).find((li) => li.dataset.tfmPath === undefined) ?? null;
}
/** An input right below the row (after its nested items); Enter writes `- [ ] …` there and opens the next one. */
function openTaskForm(li: HTMLElement, value = ''): void {
  content.querySelector('li.rv-task-form')?.remove();
  const line = Number(li.dataset.tfmLine);
  formLine = line;
  const form = document.createElement('li');
  form.className = 'rv-task-form';
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = document.body.dataset.lTaskPlaceholder ?? 'New task — Enter to add, Esc to stop';
  input.value = value;
  form.appendChild(input);
  li.after(form);
  const close = (refocus: boolean) => { formLine = null; form.remove(); if (refocus && li.isConnected) selectRow(li); };
  input.addEventListener('keydown', (e) => {
    // Korean (and other IME) input: Enter that ends a composition is not "add".
    if (e.isComposing || e.keyCode === 229) return;
    if (e.key === 'Escape') { e.preventDefault(); close(true); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const text = input.value.trim();
    if (!text) { close(true); return; }
    input.disabled = true;
    formLine = null;
    chainLine = -1; // waiting for doc/inserted
    awaitingRender = true; // and for the note to re-render
    post({ type: 'doc/insertTask', line, text });
  });
  input.addEventListener('blur', () => { if (rerendering || input.disabled || input.value.trim()) return; formLine = null; form.remove(); });
  input.focus();
}
/** After a re-render (or the host's reply), continue below the task just added. */
function continueChain(): void {
  if (chainLine === null || chainLine < 0 || awaitingRender) return;
  const li = bodyRow(chainLine);
  if (!li) return;
  chainLine = null;
  selectRow(li);
  openTaskForm(li);
}
/** A quiet "＋ Add task" row at the end of each top-level note list that has tasks. */
function addTaskRows(): void {
  const label = document.body.dataset.lAddTask ?? 'Add task';
  for (const list of Array.from(content.querySelectorAll<HTMLElement>('ul, ol'))) {
    if (list.closest('.tfm-query') || list.parentElement?.closest('li')) continue;
    const last = lastTaskOf(list);
    if (!last || last.dataset.tfmPath !== undefined) continue;
    const row = document.createElement('li');
    row.className = 'rv-addrow';
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `＋ ${label}`;
    row.appendChild(b);
    list.appendChild(row);
  }
}
content.addEventListener('keydown', (e) => {
  const li = (e.target as Element).closest?.('li.tfm-task') as HTMLElement | null;
  if (!li || li !== selected || e.target !== li) return;
  if (e.isComposing || e.keyCode === 229) return;
  // Option/Alt+C is "toggle done" in the editor (10-28); on a selected row it is too. The physical key decides: on
  // macOS Option+C types "ç".
  if (e.code === 'KeyC' && e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); post({ type: 'doc/toggle', path: null, line: Number(li.dataset.tfmLine) }); return; }
  if (e.key === 'Enter') {
    // Only a plain Enter adds a line.
    if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;
    e.preventDefault();
    openTaskForm(li);
  }
  else if (e.key === 'Escape') { li.classList.remove('rv-selected'); selected = null; li.blur(); post({ type: 'doc/select', line: null }); }
});

/** Input under the task row; Enter adds the note (an indented bullet) to the file, Esc/blur closes it. */
function openNoteForm(li: HTMLElement, ref: { path: string | null; line: number }): void {
  // Another open note input: leaving it saves it, as below.
  content.querySelector<HTMLInputElement>('.rv-note-form input')?.blur();
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
  // Enter or leaving the input saves what was typed (11-01: the input stayed open after clicking elsewhere); Esc drops it.
  let done = false;
  const finish = (save: boolean) => {
    if (done) return;
    done = true;
    const text = input.value.trim();
    if (save && text) post({ type: 'doc/addNote', ...ref, text });
    form.remove();
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); finish(false); return; }
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    finish(true);
  });
  input.addEventListener('blur', () => { if (!rerendering) finish(true); });
  input.focus();
}

content.addEventListener('dblclick', (e) => {
  const grip = (e.target as Element).closest<HTMLElement>('.rv-colgrip');
  if (grip) {
    e.preventDefault();
    const c = grip.dataset.col as HideableColumn;
    setWidth(c, fitColumn(c, grip));
    saveWidths();
    syncGrips();
    return;
  }
  if ((e.target as Element).closest('.rv-note-form, .tfm-notes, .rv-colhead')) return;
  const ref = taskRef(e.target as Element);
  if (!ref) return;
  e.preventDefault();
  window.getSelection()?.removeAllRanges();
  post({ type: 'doc/edit', ...ref });
});

document.getElementById('mode-source')?.addEventListener('click', () => post({ type: 'doc/openSource' }));
document.getElementById('mode-live')?.addEventListener('click', () => post({ type: 'doc/openLive' }));

post({ type: 'ui/ready' });
