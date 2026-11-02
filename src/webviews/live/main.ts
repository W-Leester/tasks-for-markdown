/**
 * Live view (M40, trial): the note in CodeMirror 6 with Markdown marks hidden off the cursor's line. The editor's text
 * is the note's text; edits go to the host as changes, the host's text comes back when the note changes elsewhere.
 */
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownKeymap, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { search, searchKeymap } from '@codemirror/search';
import { Annotation, EditorSelection, EditorState, type Extension, Prec, type Range, StateEffect, StateField, Transaction } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, keymap, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { findHeadingLine } from '../../core/file/headingAnchor';
import { listGroups } from '../../core/task/listGroups';
import { checkboxMode, toggleCheckboxLine } from '../../core/task/toggleCheckbox';
import { activeLines, findBlocks, findQueryBlocks, liveDecos } from './decorations';
import { applyView, matchesScope, SCOPE_MODES, type ScopeMode, SORT_MODES, type SortMode, type ViewState } from '../rendered/view';
import { decorateNotes, handleNoteClick } from '../shared/notes';
import { QueryColumns } from './columns';
import { keepKey } from './keys';
import { type FromLive, type LiveRow, minimalChange, type ToLive } from './sync';

declare function acquireVsCodeApi(): { postMessage(m: unknown): void };
const vscode = acquireVsCodeApi();
const post = (m: FromLive) => vscode.postMessage(m);
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);

/** Marks a change that came from the host (not to be sent back, not undoable here). */
const fromHost = Annotation.define<boolean>();

class BulletWidget extends WidgetType {
  constructor(readonly note = false) { super(); }
  override eq(o: BulletWidget): boolean { return o.note === this.note; }
  toDOM(): HTMLElement {
    const s = document.createElement('span');
    s.className = this.note ? 'cm-lv-bullet cm-lv-notemark' : 'cm-lv-bullet';
    s.textContent = this.note ? '💬' : '•';
    return s;
  }
}

class TaskWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly line: number) { super(); }
  override eq(o: TaskWidget): boolean { return o.checked === this.checked && o.line === this.line; }
  toDOM(): HTMLElement {
    // In a box as wide as the header's first column, so the cells after it line up with the header (M40 C).
    const wrap = document.createElement('span');
    wrap.className = 'cm-lv-checkwrap';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'cm-lv-check';
    box.checked = this.checked;
    wrap.appendChild(box);
    // On mousedown, before the editor would move the cursor onto the line (which shows the line as written).
    box.addEventListener('mousedown', (e) => { e.preventDefault(); post({ type: 'live/toggle', line: this.line }); });
    box.addEventListener('click', (e) => e.preventDefault()); // the host's edit sets the box
    return wrap;
  }
  override ignoreEvent(): boolean { return true; }
}

// ---- ```tasks blocks: their results in place, the source when the cursor is in the block ----
const setQueries = StateEffect.define<Map<string, string>>();
/** ✎ ⏩ 💬 on each result row; 💬 opens a one-line note input under the row (Enter saves, Esc closes). */
function addRowActions(box: HTMLElement): void {
  for (const li of Array.from(box.querySelectorAll<HTMLElement>('li.tfm-task'))) {
    if (li.dataset.tfmPath === undefined) continue;
    const ref = { path: li.dataset.tfmPath, line: Number(li.dataset.tfmLine) };
    const dated = !!li.querySelector(':scope .tfm-due, :scope .tfm-scheduled');
    const actions = actionButtons(dated, false, (act) => {
      if (act === 'edit' || act === 'postpone') { post({ type: 'live/rowAct', act, ...ref }); return; }
      // Another open note input: leaving it saves it, as below.
      document.querySelector<HTMLInputElement>('.rv-note-form input')?.blur();
      document.querySelector('.rv-note-form')?.remove();
      const form = document.createElement('div');
      form.className = 'rv-note-form';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = document.body.dataset.lNotePlaceholder ?? 'Note — Enter to save, Esc to cancel';
      form.appendChild(input);
      const nested = li.querySelector(':scope > ul, :scope > ol');
      if (nested) li.insertBefore(form, nested);
      else li.appendChild(form);
      // Enter or leaving the input saves what was typed (11-01: it stayed open after clicking elsewhere); Esc drops it.
      let done = false;
      const finish = (save: boolean) => {
        if (done) return;
        done = true;
        const text = input.value.trim();
        if (save && text) post({ type: 'live/addNote', ...ref, text });
        form.remove();
      };
      input.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.isComposing || e.keyCode === 229) return;
        if (e.key === 'Escape') { e.preventDefault(); finish(false); }
        else if (e.key === 'Enter') { e.preventDefault(); finish(true); }
      });
      input.addEventListener('blur', () => finish(true));
      setTimeout(() => input.focus());
    });
    const desc = li.querySelector(':scope > .tfm-desc, :scope > p > .tfm-desc');
    // On the task's own line: before the notes listed under the description (11-01).
    const host = desc ?? li;
    host.insertBefore(actions, host.querySelector(':scope > .tfm-notes-list, :scope > ul, :scope > ol'));
  }
}


class QueryWidget extends WidgetType {
  constructor(readonly html: string, readonly body: number) { super(); }
  override eq(o: QueryWidget): boolean { return o.html === this.html && o.body === this.body; }
  toDOM(view: EditorView): HTMLElement {
    const box = document.createElement('div');
    box.className = 'cm-lv-query';
    box.innerHTML = this.html || '<div class="tfm-query">…</div>';
    columns.addHeader(box);
    addRowActions(box);
    decorateNotes(box, { edit: document.body.dataset.lNoteEdit ?? 'Edit note', remove: document.body.dataset.lNoteDelete ?? 'Delete note' });
    applyView(box, viewState, today);
    requestAnimationFrame(countHidden);
    box.addEventListener('mousedown', (e) => {
      const target = e.target as Element;
      // A click elsewhere in the box keeps the focus where it is (below), so leave an open note input by hand.
      if (!target.closest('.rv-note-form')) box.querySelector<HTMLInputElement>('.rv-note-form input')?.blur();
      // The column header's buttons and grips, a note being typed or edited: their own handling.
      if (target.closest('.rv-colhead, .rv-note-form, .rv-note-edit')) return;
      e.preventDefault();
      const check = target.closest<HTMLInputElement>('input.tfm-check');
      const row = target.closest<HTMLElement>('li.tfm-task');
      if (check && row?.dataset.tfmPath !== undefined) { post({ type: 'live/toggleTask', path: row.dataset.tfmPath, line: Number(row.dataset.tfmLine) }); return; }
      const a = target.closest<HTMLAnchorElement>('a[href]');
      if (a) openLink(a.getAttribute('href')!);
      // Anywhere else a single click does nothing, as in the rendered view (11-01: a click on a row opened the query).
    });
    box.addEventListener('click', (e) => {
      if (handleNoteClick(e, (edit) => post({ type: 'live/editNote', ...edit }))) return;
      if (!(e.target as Element).closest('.rv-note-form, .rv-note-edit')) e.preventDefault();
    });
    // Double-click: a result row opens the edit dialog; the header row (or a box without rows) shows the query's source.
    box.addEventListener('dblclick', (e) => {
      const target = e.target as Element;
      if (target.closest('input, button, a, .tfm-notes, .tfm-notes-list, .rv-colgrip, .rv-note-form')) return;
      e.preventDefault();
      const row = target.closest<HTMLElement>('li.tfm-task');
      if (row?.dataset.tfmPath !== undefined) { post({ type: 'live/rowAct', act: 'edit', path: row.dataset.tfmPath, line: Number(row.dataset.tfmLine) }); return; }
      if (row) return;
      view.dispatch({ selection: EditorSelection.cursor(this.body) });
      view.focus();
    });
    return box;
  }
  override ignoreEvent(): boolean { return true; }
}

function queryDecos(state: EditorState, html: Map<string, string>): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const sel = state.selection.main;
  for (const b of findQueryBlocks(state)) {
    if (sel.to >= b.from && sel.from <= b.to) continue; // the cursor is in it: the source
    ranges.push(Decoration.replace({ widget: new QueryWidget(html.get(b.source) ?? '', b.body), block: true }).range(b.from, b.to));
  }
  return Decoration.set(ranges);
}

const queryField = StateField.define<{ html: Map<string, string>; decos: DecorationSet }>({
  create: (state) => ({ html: new Map(), decos: queryDecos(state, new Map()) }),
  update(value, tr) {
    let html = value.html;
    for (const e of tr.effects) if (e.is(setQueries)) html = e.value;
    if (html === value.html && !tr.docChanged && !tr.selection) return value;
    return { html, decos: queryDecos(tr.state, html) };
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.decos),
});

// ---- M40 F: front matter, tables, other extensions' previews (drawn by the host) and images, off the cursor ----
/** The note folder's address in the webview, for relative image paths. */
let imageBase = '';
/** `![alt](src)`: the image; a click puts the cursor there (the Markdown shows). */
class ImageWidget extends WidgetType {
  constructor(readonly src: string, readonly alt: string, readonly at: number) { super(); }
  override eq(o: ImageWidget): boolean { return o.src === this.src && o.alt === this.alt && o.at === this.at; }
  toDOM(view: EditorView): HTMLElement {
    const img = document.createElement('img');
    img.className = 'cm-lv-image';
    img.alt = this.alt;
    img.title = this.alt;
    let src = this.src;
    if (!/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(src) && imageBase) {
      try { src = new URL(src.split('/').map((p) => encodeURIComponent(decodeURIComponent(p))).join('/'), imageBase).toString(); } catch { /* left as written */ }
    }
    img.src = src;
    img.addEventListener('mousedown', (e) => {
      e.preventDefault();
      view.dispatch({ selection: EditorSelection.cursor(this.at) });
      view.focus();
    });
    return img;
  }
  override ignoreEvent(): boolean { return true; }
}

let blocks = new Map<string, { kind: string; html: string }>();
const setBlocks = StateEffect.define<Map<string, { kind: string; html: string }>>();

class BlockWidget extends WidgetType {
  constructor(readonly html: string, readonly kind: string, readonly first: number) { super(); }
  override eq(o: BlockWidget): boolean { return o.html === this.html && o.first === this.first; }
  toDOM(view: EditorView): HTMLElement {
    const box = document.createElement('div');
    box.className = `cm-lv-block cm-lv-block-${this.kind}`;
    box.innerHTML = this.html;
    // Other extensions' preview scripts (Mermaid…) draw on the event the built-in preview sends after an update.
    if (this.kind === 'fence') requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('vscode.markdown.updateContent')));
    box.addEventListener('mousedown', (e) => {
      const target = e.target as Element;
      const a = target.closest<HTMLAnchorElement>('a[href]');
      if (a && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openLink(a.getAttribute('href')!); return; }
      e.preventDefault();
      // A table: the clicked row's line (the header is the first line, then the |---| line, then the body rows).
      let line = this.first;
      const tr = target.closest('tr');
      if (this.kind === 'table' && tr) {
        const inHead = !!tr.closest('thead');
        const index = Array.from(tr.parentElement!.children).indexOf(tr);
        line = this.first + (inHead ? 0 : 2 + index);
      } else if (this.kind !== 'table') line = this.first + 1; // into the block, past its opening line
      const doc = view.state.doc;
      view.dispatch({ selection: EditorSelection.cursor(doc.line(Math.min(line, doc.lines)).to), scrollIntoView: false });
      view.focus();
    });
    return box;
  }
  override ignoreEvent(): boolean { return true; }
}

function blockDecos(state: EditorState, map: Map<string, { kind: string; html: string }>): DecorationSet {
  if (!map.size) return Decoration.none;
  const doc = state.doc;
  const lines: string[] = [];
  for (let n = 1; n <= doc.lines; n++) lines.push(doc.line(n).text);
  const ranges: Range<Decoration>[] = [];
  for (const b of findBlocks(lines, map.keys())) {
    const from = doc.line(b.first).from, to = doc.line(b.last).to;
    if (state.selection.ranges.some((r) => r.to >= from && r.from <= to)) continue; // the cursor is in it: the source
    const { kind, html } = map.get(b.source)!;
    ranges.push(Decoration.replace({ widget: new BlockWidget(html, kind, b.first), block: true }).range(from, to));
  }
  return Decoration.set(ranges);
}

const blockField = StateField.define<{ map: Map<string, { kind: string; html: string }>; decos: DecorationSet }>({
  create: (state) => ({ map: new Map(), decos: blockDecos(state, new Map()) }),
  update(value, tr) {
    let map = value.map;
    for (const e of tr.effects) if (e.is(setBlocks)) map = e.value;
    if (map === value.map && !tr.docChanged && !tr.selection) return value;
    return { map, decos: blockDecos(tr.state, map) };
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.decos),
});

// ---- our shortcuts (as in the source editor): Option/Alt+C done, Option/Alt+Shift+C create/edit, Cmd/Ctrl+Shift+C box ----
const TASK_LINE = /^\s*(?:[-*+]|\d+[.)])\s+\[.\]/;
function taskKeys(e: KeyboardEvent, view: EditorView): boolean {
  if (e.code !== 'KeyC') return false;
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const plainAlt = e.altKey && !e.metaKey && !e.ctrlKey;
  if (plainAlt && !e.shiftKey) {
    if (TASK_LINE.test(line.text)) post({ type: 'live/toggle', line: line.number - 1 });
    return true;
  }
  if (plainAlt && e.shiftKey) {
    post({ type: 'live/editTask', line: line.number - 1 });
    return true;
  }
  const mod = IS_MAC ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
  if (mod && e.shiftKey && !e.altKey) {
    const { state } = view;
    const numbers = new Set<number>();
    for (const r of state.selection.ranges) {
      const a = state.doc.lineAt(r.from).number;
      // A selection ending at the start of a later line does not take that line.
      const b = r.to > r.from && state.doc.lineAt(r.to).from === r.to ? state.doc.lineAt(r.to).number - 1 : state.doc.lineAt(r.to).number;
      for (let n = a; n <= Math.max(a, b); n++) numbers.add(n);
    }
    const ordered = [...numbers].sort((x, y) => x - y);
    const mode = checkboxMode(state.doc.line(ordered[0]!).text);
    const changes = ordered.map((n) => {
      const l = state.doc.line(n);
      return { from: l.from, to: l.to, insert: toggleCheckboxLine(l.text, mode) };
    }).filter((c) => c.insert !== state.doc.sliceString(c.from, c.to));
    if (!changes.length) return true;
    const single = ordered.length === 1 && state.selection.main.empty;
    view.dispatch({ changes, userEvent: 'input.checkbox', ...(single && mode === 'add' ? { selection: EditorSelection.cursor(changes[0]!.from + changes[0]!.insert.indexOf('[ ] ') + 4) } : {}) });
    return true;
  }
  return false;
}

/** ✎ ⏩ 💬 ＋ buttons (hover), as in the rendered view; `run` gets the button's action. */
function actionButtons(dated: boolean, withAdd: boolean, run: (act: string, e: MouseEvent) => void): HTMLElement {
  const labels = document.body.dataset;
  const span = document.createElement('span');
  span.className = 'rv-actions';
  const add = (act: string, icon: string, title: string | undefined, fallback: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = icon;
    b.title = title ?? fallback;
    b.setAttribute('aria-label', b.title);
    b.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); run(act, e); });
    span.appendChild(b);
  };
  add('edit', '✎', labels.lEdit, 'Edit');
  if (dated) add('postpone', '⏩', labels.lPostpone, 'Postpone');
  add('note', '💬', labels.lNote, 'Add note');
  if (withAdd) add('add', '＋', labels.lAddBelow, 'Add a task below');
  return span;
}

/** The last line of a task's block in the note: the task and everything indented under it (notes, sub-tasks). */
function blockEnd(state: EditorState, line: number): number {
  const doc = state.doc;
  const indent = (t: string) => /^\s*/.exec(t)![0].replace(/\t/g, '    ').length;
  const own = indent(doc.line(line).text);
  let end = line;
  for (let n = line + 1; n <= doc.lines; n++) {
    const text = doc.line(n).text;
    if (!text.trim()) break;
    if (indent(text) <= own) break;
    end = n;
  }
  return end;
}

/** ✎ ⏩ on a note task line go to the host; 💬 a note / ＋ a task are typed in place, after the task's own block. */
function lineAct(view: EditorView, line: number, act: string): void {
  if (act === 'edit' || act === 'postpone') { post({ type: 'live/rowAct', act, path: null, line }); return; }
  const { state } = view;
  const task = state.doc.line(line + 1);
  const indent = /^\s*/.exec(task.text)![0];
  const after = state.doc.line(blockEnd(state, line + 1));
  const insert = act === 'note' ? `\n${indent}  - ` : `\n${indent}- [ ] `;
  view.dispatch({ changes: { from: after.to, insert }, selection: EditorSelection.cursor(after.to + insert.length), userEvent: 'input' });
  view.focus();
}

class ActionsWidget extends WidgetType {
  constructor(readonly line: number, readonly dated: boolean) { super(); }
  override eq(o: ActionsWidget): boolean { return o.line === this.line && o.dated === this.dated; }
  toDOM(view: EditorView): HTMLElement {
    return actionButtons(this.dated, true, (act) => lineAct(view, this.line, act));
  }
  override ignoreEvent(): boolean { return true; }
}

// ---- M40 C: note task lines in columns, a header over task lists, the show filter on note lines ----
/** The host's column cells and filter data for the note's task lines, by line text. */
let rows = new Map<string, LiveRow>();
const setRows = StateEffect.define<Map<string, LiveRow>>();
const setBodyView = StateEffect.define<{ view: ViewState; today: string }>();

/** A task line off the cursor: the cells after its checkbox, in the rendered view's columns (✎ ⏩ 💬 ＋ inside). */
class RowWidget extends WidgetType {
  constructor(readonly html: string, readonly line: number, readonly dated: boolean) { super(); }
  override eq(o: RowWidget): boolean { return o.html === this.html && o.line === this.line; }
  toDOM(view: EditorView): HTMLElement {
    const row = document.createElement('span');
    row.className = 'cm-lv-row';
    row.innerHTML = this.html;
    const desc = row.querySelector('.tfm-desc') ?? row;
    desc.appendChild(actionButtons(this.dated, true, (act) => lineAct(view, this.line, act)));
    // A click on the cells puts the cursor on the line, which then shows as written (a link still opens with Cmd/Ctrl).
    row.addEventListener('mousedown', (e) => {
      const a = (e.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (a && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openLink(a.getAttribute('href')!); return; }
      e.preventDefault();
      view.dispatch({ selection: EditorSelection.cursor(view.state.doc.line(this.line + 1).to) });
      view.focus();
    });
    return row;
  }
  override ignoreEvent(): boolean { return true; }
}

class BodyHeadWidget extends WidgetType {
  override eq(): boolean { return true; }
  toDOM(): HTMLElement { return columns.headerElement(); }
  override ignoreEvent(): boolean { return true; }
}

const TASK_TEXT = /^(\s*)(?:[-*+]|\d+[.)])\s+\[.\]/;
const LIST_TEXT = /^\s*(?:[-*+]|\d+[.)])\s/;
/**
 * Lines drawn in columns (1-based): task lines of a list where some task has a Tasks field — a plain checklist stays a
 * checklist (11-02). Headers over those lists, and those task lines the show filter hides (with their notes).
 */
function bodyDecos(state: EditorState, view: { view: ViewState; today: string }): { decos: DecorationSet; hidden: number; rowLines: Set<number> } {
  const doc = state.doc;
  const ranges: Range<Decoration>[] = [];
  const indentOf = (t: string) => /^\s*/.exec(t)![0].replace(/\t/g, '    ').length;
  const active = activeLines(state, true);
  const lines: string[] = [];
  for (let n = 1; n <= doc.lines; n++) lines.push(doc.line(n).text);
  const groups = listGroups(lines);
  const fielded = new Set<number>();
  for (let i = 0; i < lines.length; i++) if (groups[i]! >= 0 && rows.get(lines[i]!)?.fields) fielded.add(groups[i]!);
  const rowLines = new Set<number>();
  for (let i = 0; i < lines.length; i++) if (fielded.has(groups[i]!) && TASK_TEXT.test(lines[i]!) && rows.has(lines[i]!)) rowLines.add(i + 1);
  // Headers: the first line of each list drawn in columns, when it is a task line at the top level.
  for (let i = 0; i < lines.length; i++) {
    const g = groups[i]!;
    if (!fielded.has(g) || (i > 0 && groups[i - 1] === g)) continue;
    if (!TASK_TEXT.test(lines[i]!) || indentOf(lines[i]!) > 0) continue;
    ranges.push(Decoration.widget({ widget: new BodyHeadWidget(), block: true, side: -1 }).range(doc.line(i + 1).from));
  }
  // Show filter: a task line is hidden when it and no task under it match; its notes go with it.
  let hidden = 0;
  if (view.view.scope !== 'all') {
    const hide: boolean[] = [];
    const owner: number[] = []; // for each line, the task line it belongs to (0 = none)
    const stack: { n: number; indent: number }[] = [];
    const matches = new Map<number, boolean>();
    for (let n = 1; n <= doc.lines; n++) {
      const text = doc.line(n).text;
      if (!text.trim()) { stack.length = 0; owner[n] = 0; continue; }
      const ind = indentOf(text);
      while (stack.length && stack[stack.length - 1]!.indent >= ind) stack.pop();
      owner[n] = stack.length ? stack[stack.length - 1]!.n : 0;
      const row = rowLines.has(n) ? rows.get(text) : undefined;
      if (row) {
        matches.set(n, matchesScope({ ...row.data, line: n }, view.view.scope, view.today));
        stack.push({ n, indent: ind });
      } else if (LIST_TEXT.test(text)) stack.push({ n: owner[n] || 0, indent: ind });
    }
    // A task stays when a task under it matches.
    const keep = new Set<number>();
    for (const [n, ok] of matches) if (ok) for (let k = n; k; k = owner[k] ?? 0) keep.add(k);
    for (let n = 1; n <= doc.lines; n++) {
      const own = matches.has(n) ? n : owner[n] ?? 0;
      hide[n] = own > 0 && matches.has(own) && !keep.has(own) && !active.has(n);
    }
    for (const [n] of matches) if (hide[n]) hidden++;
    for (let n = 1; n <= doc.lines; n++) {
      if (!hide[n]) continue;
      let m = n;
      while (m < doc.lines && hide[m + 1]) m++;
      ranges.push(Decoration.replace({ block: true }).range(doc.line(n).from, doc.line(m).to));
      n = m;
    }
  }
  return { decos: Decoration.set(ranges, true), hidden, rowLines };
}

const bodyField = StateField.define<{ view: { view: ViewState; today: string }; decos: DecorationSet; hidden: number; rowLines: Set<number> }>({
  create: (state) => { const v = { view: { sort: 'document', scope: 'all' } as ViewState, today: '' }; return { view: v, ...bodyDecos(state, v) }; },
  update(value, tr) {
    let v = value.view;
    let changed = tr.docChanged || !!tr.selection;
    for (const e of tr.effects) {
      if (e.is(setBodyView)) { v = e.value; changed = true; }
      if (e.is(setRows)) changed = true;
    }
    return changed ? { view: v, ...bodyDecos(tr.state, v) } : value;
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.decos),
});

function build(view: EditorView): DecorationSet {
  const active = activeLines(view.state, view.hasFocus);
  const ranges: Range<Decoration>[] = [];
  /** Lines shown in columns: their ✎ ⏩ 💬 ＋ are inside the row. */
  const inRows = new Set<number>();
  const rowLines = view.state.field(bodyField).rowLines;
  for (const { from, to } of view.visibleRanges) {
    for (const d of liveDecos(view.state, active, from, to)) {
      if (d.kind === 'task') {
        const line = view.state.doc.line(d.line + 1);
        const row = rowLines.has(line.number) ? rows.get(line.text) : undefined;
        if (row && d.to <= line.to) {
          ranges.push(Decoration.replace({ widget: new TaskWidget(d.checked, d.line) }).range(d.from, d.to));
          ranges.push(Decoration.replace({ widget: new RowWidget(row.html, d.line, /[📅⏳]/u.test(line.text)) }).range(d.to, line.to));
          inRows.add(d.line);
          continue;
        }
      }
      if (d.kind === 'actions' && inRows.has(d.line)) continue;
      // Marks inside a line drawn as a row are covered by it.
      if ((d.kind === 'hide' || d.kind === 'mark') && inRows.has(view.state.doc.lineAt(d.from).number - 1)) continue;
      if (d.kind === 'line') ranges.push(Decoration.line({ class: d.cls }).range(d.from));
      else if (d.kind === 'hide') { if (d.to > d.from) ranges.push(Decoration.replace({}).range(d.from, d.to)); }
      else if (d.kind === 'bullet') {
        ranges.push(Decoration.replace({ widget: new BulletWidget(!!d.note) }).range(d.from, d.to));
        if (d.note) ranges.push(Decoration.line({ class: 'cm-lv-note' }).range(view.state.doc.lineAt(d.from).from));
      }
      else if (d.kind === 'task') ranges.push(Decoration.replace({ widget: new TaskWidget(d.checked, d.line) }).range(d.from, d.to));
      else if (d.kind === 'actions') ranges.push(Decoration.widget({ widget: new ActionsWidget(d.line, d.dated), side: 1 }).range(d.from));
      else if (d.kind === 'image') ranges.push(Decoration.replace({ widget: new ImageWidget(d.src, d.alt, d.from) }).range(d.from, d.to));
      else if (d.to > d.from) ranges.push(Decoration.mark({ class: d.cls, attributes: d.href !== undefined ? { 'data-href': d.href, title: document.body.dataset.lLinkHint ?? 'Cmd/Ctrl+click to open' } : {} }).range(d.from, d.to));
    }
  }
  return Decoration.set(ranges, true);
}

const livePreview = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = build(view); }
    update(u: ViewUpdate): void {
      const newRows = u.transactions.some((tr) => tr.effects.some((e) => e.is(setRows)));
      if (newRows || u.docChanged || u.viewportChanged || u.selectionSet || u.focusChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) this.decorations = build(u.view);
    }
  },
  { decorations: (v) => v.decorations },
);

const highlight = HighlightStyle.define([
  { tag: tags.heading, fontWeight: '600' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--vscode-textLink-foreground)' },
  { tag: tags.url, color: 'var(--vscode-textLink-foreground)', opacity: '.8' },
  { tag: tags.monospace, fontFamily: 'var(--vscode-editor-font-family, monospace)' },
  { tag: tags.quote, color: 'var(--vscode-descriptionForeground)' },
  { tag: [tags.processingInstruction, tags.contentSeparator], color: 'var(--vscode-descriptionForeground)', opacity: '.7' },
]);

function theme(fontSize: number, lineHeight: number, maxWidth: number): Extension {
  return EditorView.theme({
    '&': { height: '100%', fontSize: `${fontSize}px`, color: 'var(--vscode-editor-foreground)', backgroundColor: 'var(--vscode-editor-background)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': { lineHeight: String(lineHeight), fontFamily: 'var(--vscode-markdown-font-family, -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", system-ui, sans-serif)' },
    '.cm-content': { maxWidth: maxWidth > 0 ? `${maxWidth}px` : 'none', margin: '0 auto', padding: '24px 32px 40vh', caretColor: 'var(--vscode-editorCursor-foreground)' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--vscode-editorCursor-foreground)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'var(--vscode-editor-selectionBackground) !important' },
    '.cm-lv-h1': { fontSize: '2em', fontWeight: '600', paddingTop: '.4em' },
    '.cm-lv-h2': { fontSize: '1.5em', fontWeight: '600', paddingTop: '.35em' },
    '.cm-lv-h3': { fontSize: '1.25em', fontWeight: '600', paddingTop: '.3em' },
    '.cm-lv-h4, .cm-lv-h5, .cm-lv-h6': { fontWeight: '600' },
    '.cm-lv-quote': { borderLeft: '3px solid var(--vscode-textBlockQuote-border, rgba(128,128,128,.5))', paddingLeft: '12px', color: 'var(--vscode-descriptionForeground)' },
    '.cm-lv-codeblock, .cm-lv-table': { fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: '.92em' },
    '.cm-lv-codeblock': { backgroundColor: 'var(--vscode-textCodeBlock-background, rgba(128,128,128,.12))', paddingLeft: '12px' },
    '.cm-lv-code': { fontFamily: 'var(--vscode-editor-font-family, monospace)', fontSize: '.92em', backgroundColor: 'var(--vscode-textCodeBlock-background, rgba(128,128,128,.15))', borderRadius: '3px', padding: '0 2px' },
    '.cm-lv-hr': { borderBottom: '1px solid var(--vscode-widget-border, rgba(128,128,128,.35))', lineHeight: '.6' },
    '.cm-lv-link': { color: 'var(--vscode-textLink-foreground)', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'transparent' },
    '.cm-lv-link:hover': { textDecorationColor: 'currentColor' },
    '.cm-lv-bullet': { display: 'inline-block', width: '1ch', color: 'var(--vscode-descriptionForeground)' },
    '.cm-lv-notemark': { width: '1.6em', fontSize: '.8em', opacity: '.7' },
    '.cm-lv-note': { color: 'var(--vscode-descriptionForeground)', fontSize: '.93em' },
    '.cm-lv-checkwrap': { display: 'inline-block', width: '1.4em', marginRight: '.9em', textAlign: 'center' },
    '.cm-lv-check': { margin: '0', verticalAlign: '-2px', cursor: 'pointer' },
    '.cm-panels': { backgroundColor: 'var(--vscode-editorWidget-background)', color: 'inherit' },
    '.cm-panels input, .cm-panels button': { color: 'var(--vscode-input-foreground)', backgroundColor: 'var(--vscode-input-background)', border: '1px solid var(--vscode-input-border, transparent)' },
    '.cm-searchMatch': { backgroundColor: 'rgba(255, 200, 0, .4)' },
    '.cm-searchMatch-selected': { backgroundColor: 'rgba(255, 140, 0, .85)' },
  });
}

function keepKeys(e: KeyboardEvent): boolean {
  if (keepKey(e, IS_MAC)) e.stopPropagation();
  return false; // the editor's keymap still handles it
}

let view: EditorView | null = null;
const colsMenu = document.getElementById('view-cols') as HTMLDetailsElement | null;
const colBoxes = Array.from(document.querySelectorAll<HTMLInputElement>('#view-cols input[data-col]'));
const columns = new QueryColumns(document.getElementById('editor')!, (change) => post({ type: 'live/columns', ...change }), (hidden) => {
  for (const b of colBoxes) b.checked = !hidden.includes(b.dataset.col!);
  const summary = colsMenu?.querySelector<HTMLElement>('summary');
  if (summary) summary.textContent = hidden.length ? (summary.dataset.lHidden ?? 'Columns · {0} hidden').replace('{0}', String(hidden.length)) : (summary.dataset.lLabel ?? 'Columns');
});
for (const b of colBoxes) b.addEventListener('change', () => columns.setHidden(colBoxes.filter((x) => !x.checked).map((x) => x.dataset.col!)));
document.addEventListener('click', (e) => { if (colsMenu?.open && !colsMenu.contains(e.target as Node)) colsMenu.open = false; });

// ---- toolbar: sort and show filter (query results, as in the rendered view), mode buttons ----
let viewState: ViewState = { sort: 'document', scope: 'all' };
let today = new Date().toISOString().slice(0, 10);
const sortSel = document.getElementById('view-sort') as HTMLSelectElement | null;
const scopeSel = document.getElementById('view-scope') as HTMLSelectElement | null;
const hiddenEl = document.getElementById('view-hidden');
function countHidden(): void {
  const n = document.querySelectorAll('.cm-lv-query li.tfm-task.rv-hidden').length + (view?.state.field(bodyField, false)?.hidden ?? 0);
  if (hiddenEl) hiddenEl.textContent = n ? (document.body.dataset.lHidden ?? '{0} hidden').replace('{0}', String(n)) : '';
}
function refreshView(): void {
  for (const box of Array.from(document.querySelectorAll<HTMLElement>('.cm-lv-query'))) applyView(box, viewState, today);
  view?.dispatch({ effects: setBodyView.of({ view: viewState, today }) });
  countHidden();
}
const pickView = () => {
  viewState = { sort: (sortSel?.value ?? 'document') as SortMode, scope: (scopeSel?.value ?? 'all') as ScopeMode };
  post({ type: 'live/view', ...viewState });
  refreshView();
};
sortSel?.addEventListener('change', pickView);
scopeSel?.addEventListener('change', pickView);
document.getElementById('mode-rendered')?.addEventListener('click', () => post({ type: 'live/mode', mode: 'rendered' }));
document.getElementById('mode-source')?.addEventListener('click', () => post({ type: 'live/mode', mode: 'source' }));
/** The latest query results (they can come before the editor exists). */
let queries = new Map<string, string>();

function openLink(href: string): void {
  if (href.startsWith('#') && !/^#L\d+$/.test(href)) {
    const line = findHeadingLine(view!.state.doc.toString(), href.slice(1));
    if (line < 0) return;
    const pos = view!.state.doc.line(line + 1).from;
    view!.dispatch({ selection: EditorSelection.cursor(pos), effects: EditorView.scrollIntoView(pos, { y: 'start', yMargin: 24 }) });
    view!.focus();
    return;
  }
  post({ type: 'live/link', href });
}

function create(init: Extract<ToLive, { type: 'live/init' }>): EditorView {
  return new EditorView({
    parent: document.getElementById('editor')!,
    state: EditorState.create({
      doc: init.text,
      extensions: [
        EditorState.lineSeparator.of(init.eol),
        history(),
        search({ top: true }),
        keymap.of([...markdownKeymap, ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        markdown({ base: markdownLanguage }),
        syntaxHighlighting(highlight),
        EditorView.lineWrapping,
        livePreview,
        theme(init.fontSize, init.lineHeight, init.maxWidth),
        // First, before the keymap: a key the keymap handles (Cmd+Z) must still not reach VS Code (11-01: VS Code undid
        // the note under the editor's own undo).
        Prec.highest(EditorView.domEventHandlers({
          keydown: (e, v) => {
            if (taskKeys(e, v)) { e.preventDefault(); e.stopPropagation(); return true; }
            return keepKeys(e);
          },
        })),
        queryField,
        blockField,
        bodyField,
        EditorView.domEventHandlers({
          mousedown: (e) => {
            const link = (e.target as Element).closest<HTMLElement>('.cm-lv-link');
            if (!link || !(e.metaKey || e.ctrlKey)) return false;
            e.preventDefault();
            openLink(link.dataset.href ?? link.textContent ?? '');
            return true;
          },
        }),
        EditorView.updateListener.of((u) => {
          for (const tr of u.transactions) {
            if (!tr.docChanged || tr.annotation(fromHost)) continue;
            const changes: { from: number; to: number; insert: string }[] = [];
            tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => changes.push({ from: fromA, to: toA, insert: inserted.toString() }));
            post({ type: 'live/edit', changes, length: tr.startState.doc.length });
          }
        }),
      ],
    }),
  });
}

window.addEventListener('message', (e: MessageEvent<ToLive>) => {
  const m = e.data;
  if (m.type === 'live/init') {
    view?.destroy();
    viewState = { sort: (SORT_MODES as string[]).includes(m.view.sort) ? (m.view.sort as SortMode) : 'document', scope: (SCOPE_MODES as string[]).includes(m.view.scope) ? (m.view.scope as ScopeMode) : 'all' };
    today = m.today;
    if (sortSel) sortSel.value = viewState.sort;
    if (scopeSel) scopeSel.value = viewState.scope;
    imageBase = m.imageBase;
    view = create(m);
    // Start below the front matter, so it shows as its box (M40 F) rather than as written.
    const doc = view.state.doc;
    let start = 0;
    if (doc.lines > 1 && doc.line(1).text === '---') {
      for (let n = 2; n <= doc.lines; n++) if (/^---[ \t]*$/.test(doc.line(n).text)) { start = n < doc.lines ? doc.line(n + 1).from : doc.line(n).to; break; }
    }
    view.dispatch({ effects: [setQueries.of(queries), setBlocks.of(blocks), setRows.of(rows), setBodyView.of({ view: viewState, today })], ...(start ? { selection: EditorSelection.cursor(start) } : {}) });
    view.focus();
  } else if (m.type === 'live/rows') {
    rows = new Map(m.rows.map((r) => [r.text, r]));
    view?.dispatch({ effects: setRows.of(rows) });
    requestAnimationFrame(countHidden);
  } else if (m.type === 'live/queries') {
    queries = new Map(m.blocks.map((b) => [b.source, b.html]));
    columns.set(m.columns); // before the boxes are drawn: they take their header from it
    view?.dispatch({ effects: setQueries.of(queries) });
  } else if (m.type === 'live/blocks') {
    blocks = new Map(m.blocks.map((b) => [b.source, { kind: b.kind, html: b.html }]));
    view?.dispatch({ effects: setBlocks.of(blocks) });
  } else if (m.type === 'live/text' && view) {
    const change = minimalChange(view.state.doc.toString(), m.text);
    if (change) view.dispatch({ changes: change, annotations: [fromHost.of(true), Transaction.addToHistory.of(false)] });
  }
});

post({ type: 'live/ready' });
