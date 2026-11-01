/**
 * Live view (M40, trial): the note in CodeMirror 6 with Markdown marks hidden off the cursor's line. The editor's text
 * is the note's text; edits go to the host as changes, the host's text comes back when the note changes elsewhere.
 */
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown, markdownKeymap, markdownLanguage } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { search, searchKeymap } from '@codemirror/search';
import { Annotation, EditorSelection, EditorState, type Extension, Prec, type Range, Transaction } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, keymap, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { findHeadingLine } from '../../core/file/headingAnchor';
import { activeLines, liveDecos } from './decorations';
import { keepKey } from './keys';
import { type FromLive, minimalChange, type ToLive } from './sync';

declare function acquireVsCodeApi(): { postMessage(m: unknown): void };
const vscode = acquireVsCodeApi();
const post = (m: FromLive) => vscode.postMessage(m);
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);

/** Marks a change that came from the host (not to be sent back, not undoable here). */
const fromHost = Annotation.define<boolean>();

class BulletWidget extends WidgetType {
  override eq(): boolean { return true; }
  toDOM(): HTMLElement {
    const s = document.createElement('span');
    s.className = 'cm-lv-bullet';
    s.textContent = '•';
    return s;
  }
}

class TaskWidget extends WidgetType {
  constructor(readonly checked: boolean, readonly line: number) { super(); }
  override eq(o: TaskWidget): boolean { return o.checked === this.checked && o.line === this.line; }
  toDOM(): HTMLElement {
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'cm-lv-check';
    box.checked = this.checked;
    // On mousedown, before the editor would move the cursor onto the line (which shows the line as written).
    box.addEventListener('mousedown', (e) => { e.preventDefault(); post({ type: 'live/toggle', line: this.line }); });
    box.addEventListener('click', (e) => e.preventDefault()); // the host's edit sets the box
    return box;
  }
  override ignoreEvent(): boolean { return true; }
}

function build(view: EditorView): DecorationSet {
  const active = activeLines(view.state, view.hasFocus);
  const ranges: Range<Decoration>[] = [];
  for (const { from, to } of view.visibleRanges) {
    for (const d of liveDecos(view.state, active, from, to)) {
      if (d.kind === 'line') ranges.push(Decoration.line({ class: d.cls }).range(d.from));
      else if (d.kind === 'hide') { if (d.to > d.from) ranges.push(Decoration.replace({}).range(d.from, d.to)); }
      else if (d.kind === 'bullet') ranges.push(Decoration.replace({ widget: new BulletWidget() }).range(d.from, d.to));
      else if (d.kind === 'task') ranges.push(Decoration.replace({ widget: new TaskWidget(d.checked, d.line) }).range(d.from, d.to));
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
      if (u.docChanged || u.viewportChanged || u.selectionSet || u.focusChanged || syntaxTree(u.startState) !== syntaxTree(u.state)) this.decorations = build(u.view);
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
    '.cm-lv-check': { margin: '0 .45em 0 0', verticalAlign: '-2px', cursor: 'pointer' },
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
        Prec.highest(EditorView.domEventHandlers({ keydown: keepKeys })),
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
    view = create(m);
    view.focus();
  } else if (m.type === 'live/text' && view) {
    const change = minimalChange(view.state.doc.toString(), m.text);
    if (change) view.dispatch({ changes: change, annotations: [fromHost.of(true), Transaction.addToHistory.of(false)] });
  }
});

post({ type: 'live/ready' });
