import * as vscode from 'vscode';
import { findHeadingLine } from '../core/file/headingAnchor';
import type { TaskIndex } from '../core/index';
import { parseTaskLine, type StatusRegistry } from '../core/task';
import type { IndexService } from '../index/IndexService';
import type { PreviewIntegration } from './PreviewIntegration';
import { renderDocumentHtml } from './renderDocument';
import { t } from '../l10n';
import { systemClock } from '../core/dates';
import type { TaskEditService } from '../services/TaskEditService';
import type { Settings } from '../settings/Settings';
import { applyChanges, type ColumnState, type FromLive, type ToLive } from '../webviews/live/sync';
import { HIDEABLE_COLUMNS } from '../webviews/rendered/columns';
import { cleanWidths } from './RenderedView';

/**
 * Live view (M40, trial): the note in a CodeMirror editor inside a webview, Markdown marks hidden except where the
 * cursor is (like Obsidian's live preview). The editor's text is the file's text: edits from the webview are applied
 * to the document as they are; changes made elsewhere are sent back as the whole text.
 */
export const LIVE_VIEW_TYPE = 'tasksmd.live';
/** Shared with the rendered view: sort and show filter per note. */
const VIEW_STATE_KEY = 'rendered.viewState';

export interface LiveViewDeps {
  context: vscode.ExtensionContext;
  index: TaskIndex;
  indexService: IndexService;
  editService: TaskEditService;
  settings: Settings;
  preview: PreviewIntegration;
  getStatusRegistry(): StatusRegistry;
  log(message: string): void;
}

/** The ```tasks blocks of a note: the lines between the fences. */
export function queryBlocks(text: string): string[] {
  const out: string[] = [];
  const src = text.replace(/\r\n/g, '\n');
  const re = /^ {0,3}(`{3,}|~{3,})[ \t]*tasks\b[^\n]*\n([\s\S]*?)^ {0,3}\1[`~]*[ \t]*$/gm;
  for (let m = re.exec(src); m; m = re.exec(src)) out.push(m[2]!.replace(/\n$/, ''));
  return out;
}

export class LiveViewProvider implements vscode.CustomTextEditorProvider {
  /** Open live views: their note and a way to send them new query results (after a column change). */
  private readonly open = new Set<() => void>();
  /** Option/Alt+Shift+C in a live view: the line the create/edit command should use (read once). */
  private editLine: { key: string; line: number } | undefined;

  constructor(private readonly deps: LiveViewDeps) {}

  /** For `tasksmd.createOrEdit` (M40): the live view's line, once. */
  takeEditLine(): { key: string; line: number } | undefined {
    const l = this.editLine;
    this.editLine = undefined;
    return l;
  }

  /** The rendered view's column choice (hidden columns, widths) and the header's words; shared by all notes. */
  private columns(): ColumnState {
    const saved = this.deps.context.globalState.get<string[]>('rendered.hiddenColumns', []);
    return {
      hidden: HIDEABLE_COLUMNS.filter((c) => saved.includes(c)),
      widths: cleanWidths(this.deps.context.globalState.get<Record<string, number>>('rendered.columnWidths', {})),
      labels: { desc: t('Description'), due: t('Due date'), created: t('Created date'), done: t('Done date'), more: t('Other fields'), hide: t('Hide column'), show: t('Show column'), width: t('Column width'), widthHint: t('Drag to resize, double-click to fit the content') },
    };
  }

  /** Query results for the note's ```tasks blocks, in columns with a header as in the rendered view. */
  private queries(document: vscode.TextDocument): Extract<ToLive, { type: 'live/queries' }> {
    const base = this.deps.preview.pluginDeps();
    const deps = { ...base, enabled: () => true, renderOptions: (source?: Parameters<typeof base.renderOptions>[0], context?: 'line' | 'query') => ({ ...base.renderOptions(source, context), columns: true }) };
    const columns = this.columns();
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
    const blocks = [...new Set(queryBlocks(document.getText()))].map((source) => {
      try {
        const html = renderDocumentHtml('```tasks\n' + source + '\n```\n', deps, { env: { currentDocument: document.uri } });
        return { source, html };
      } catch (err) {
        return { source, html: `<div class="tfm-query tfm-error">${esc(String(err))}</div>` };
      }
    });
    return { type: 'live/queries', blocks, columns };
  }

  async resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): Promise<void> {
    const { webview } = panel;
    webview.options = { enableScripts: true, localResourceRoots: [this.deps.context.extensionUri] };
    webview.html = this.shell(webview);
    const post = (m: ToLive) => void webview.postMessage(m);
    const sync = new LiveSync(document, post, this.deps.log);
    let queryTimer: ReturnType<typeof setTimeout> | undefined;
    const sendQueries = (delay: number) => {
      clearTimeout(queryTimer);
      queryTimer = setTimeout(() => post(this.queries(document)), delay);
    };
    const indexSub = this.deps.index.onDidChange(() => sendQueries(400));
    const refresh = () => sendQueries(0);
    this.open.add(refresh);
    // Messages are handled one after another, in the order the editor sent them.
    let queue: Promise<void> = Promise.resolve();
    const subs: vscode.Disposable[] = [
      sync,
      { dispose: () => { indexSub.dispose(); clearTimeout(queryTimer); this.open.delete(refresh); } },
      vscode.workspace.onDidChangeTextDocument((e) => { if (e.document === document) sendQueries(300); }),
      webview.onDidReceiveMessage((m: FromLive) => {
        queue = queue.then(() => this.handle(m, document, post, sync, panel)).catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          this.deps.log(`live view: ${m.type}: ${message}`);
          void vscode.window.showErrorMessage(t('Tasks: {0}', message));
        });
      }),
    ];
    panel.onDidDispose(() => { for (const s of subs) s.dispose(); });
  }

  /** Sort and show filter of a note: the rendered view's, kept per note. */
  private viewState(uri: vscode.Uri): { sort: string; scope: string } {
    return this.deps.context.workspaceState.get<Record<string, { sort: string; scope: string }>>(VIEW_STATE_KEY, {})[uri.toString()] ?? { sort: 'document', scope: 'all' };
  }

  private async handle(msg: FromLive, document: vscode.TextDocument, post: (m: ToLive) => void, sync: LiveSync, panel: vscode.WebviewPanel): Promise<void> {
    switch (msg.type) {
      case 'live/ready':
        post(this.queries(document));
        post({ type: 'live/init', text: document.getText(), eol: document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n', fontSize: this.deps.settings.get('rendered.fontSize'), lineHeight: this.deps.settings.get('rendered.lineHeight'), maxWidth: this.deps.settings.get('rendered.maxWidth'), view: this.viewState(document.uri), today: systemClock.now().startOf('day').format('YYYY-MM-DD') });
        break;
      case 'live/edit':
        await sync.edit(msg);
        break;
      case 'live/toggle': {
        const key = document.uri.toString();
        const task = this.deps.index.taskAt(key, msg.line) ?? (msg.line < document.lineCount
          ? parseTaskLine(document.lineAt(msg.line).text, {
            statusRegistry: this.deps.getStatusRegistry(),
            globalFilter: this.deps.settings.get('globalFilter') || undefined,
            location: { key, path: this.deps.indexService.displayPath(document.uri), line: msg.line, heading: null, frontmatterTags: [], depth: 0, parentLine: null },
          })
          : null);
        if (!task) throw new Error(t('That task is no longer at line {0}; the view has been refreshed.', msg.line + 1));
        await this.deps.editService.toggle(task);
        break;
      }
      case 'live/toggleTask': {
        const key = this.deps.index.fileKeys().find((k) => this.deps.index.file(k)?.path === msg.path);
        const task = key ? this.deps.index.taskAt(key, msg.line) : undefined;
        if (!task) throw new Error(t('That task is no longer at line {0}; the view has been refreshed.', msg.line + 1));
        await this.deps.editService.toggle(task);
        break;
      }
      case 'live/columns': {
        if (msg.hidden) await this.deps.context.globalState.update('rendered.hiddenColumns', HIDEABLE_COLUMNS.filter((c) => msg.hidden!.includes(c)));
        if (msg.widths) await this.deps.context.globalState.update('rendered.columnWidths', cleanWidths(msg.widths));
        for (const refresh of this.open) refresh(); // the other live views follow
        break;
      }
      case 'live/view': {
        const all = this.deps.context.workspaceState.get<Record<string, { sort: string; scope: string }>>(VIEW_STATE_KEY, {});
        await this.deps.context.workspaceState.update(VIEW_STATE_KEY, { ...all, [document.uri.toString()]: { sort: msg.sort, scope: msg.scope } });
        break;
      }
      case 'live/mode':
        await vscode.commands.executeCommand('vscode.openWith', document.uri, msg.mode === 'rendered' ? 'tasksmd.rendered' : 'default', panel.viewColumn);
        panel.dispose(); // switch, not open beside (the note stays open in the other editor)
        break;
      case 'live/editTask':
        this.editLine = { key: document.uri.toString(), line: msg.line };
        await vscode.commands.executeCommand('tasksmd.createOrEdit');
        this.editLine = undefined;
        break;
      case 'live/link':
        await this.openLink(msg.href, document);
        break;
    }
  }

  private async openLink(href: string, document: vscode.TextDocument): Promise<void> {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      await vscode.env.openExternal(vscode.Uri.parse(href));
      return;
    }
    const [pathPart, fragment = ''] = href.split('#', 2);
    if (!pathPart) return; // a same-note #heading is handled in the view
    const target = vscode.Uri.joinPath(document.uri, '..', decodeURI(pathPart));
    const doc = await vscode.workspace.openTextDocument(target);
    const editor = await vscode.window.showTextDocument(doc, { preserveFocus: false });
    const line = fragment ? (/^L(\d+)$/.test(fragment) ? Number(fragment.slice(1)) - 1 : findHeadingLine(doc.getText(), fragment)) : -1;
    if (line >= 0 && line < doc.lineCount) {
      const range = doc.lineAt(line).range;
      editor.selection = new vscode.Selection(range.end, range.end);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }
  }

  private shell(webview: vscode.Webview): string {
    const nonce = Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join('');
    const script = webview.asWebviewUri(vscode.Uri.joinPath(this.deps.context.extensionUri, 'dist', 'webviews', 'live.js'));
    const css = webview.asWebviewUri(vscode.Uri.joinPath(this.deps.context.extensionUri, 'media', 'preview.css'));
    return `<!DOCTYPE html>
<html lang="${vscode.env.language}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource};">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${css}">
<style>
  html, body { margin: 0; padding: 0; height: 100%; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground); }
  body { display: flex; flex-direction: column; }
  #editor { flex: 1; min-height: 0; }
  /* Toolbar, as in the rendered view: sort / show (query results), columns, and the mode buttons. */
  .rv-tools { flex: none; display: flex; gap: 12px; align-items: center; padding: 6px 16px 4px; font-size: 12px; color: var(--rv-muted); font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif); }
  .rv-select { display: inline-flex; gap: 6px; align-items: center; }
  .rv-select select { color: var(--vscode-dropdown-foreground); background: var(--vscode-dropdown-background); border: 1px solid var(--vscode-dropdown-border, transparent); border-radius: 3px; padding: 1px 4px; font: inherit; }
  .rv-cols { position: relative; }
  .rv-cols > summary { list-style: none; cursor: pointer; color: var(--rv-fg); background: var(--rv-bg-2); border: 1px solid var(--rv-stroke); border-radius: 4px; padding: 2px 8px; }
  .rv-cols > summary::-webkit-details-marker { display: none; }
  .rv-cols > summary::after { content: ' ▾'; color: var(--rv-muted); }
  .rv-cols-menu { position: absolute; top: calc(100% + 4px); left: 0; z-index: 3; display: flex; flex-direction: column; gap: 4px; padding: 8px 12px; background: var(--vscode-editorWidget-background, var(--rv-bg-2)); border: 1px solid var(--rv-stroke); border-radius: 6px; box-shadow: 0 4px 14px rgba(0,0,0,.25); white-space: nowrap; color: var(--rv-fg); }
  .rv-cols-menu label { display: flex; gap: 6px; align-items: center; cursor: pointer; }
  .rv-toggle { margin-left: auto; display: inline-flex; gap: 2px; padding: 2px; border-radius: 6px; line-height: 1; }
  .rv-toggle button { border: none; background: transparent; color: var(--rv-muted); padding: 4px 8px; border-radius: 4px; cursor: pointer; font: inherit; }
  .rv-toggle button:hover { color: var(--rv-fg); }
  .rv-toggle button[aria-pressed="true"] { background: var(--rv-bg-3); color: var(--rv-fg); cursor: default; }
  .cm-lv-query li.tfm-task.rv-hidden { display: none !important; }
  .cm-lv-query li.tfm-task.rv-dim > .tfm-desc, .cm-lv-query li.tfm-task.rv-dim > p > .tfm-desc { opacity: .45; }
  /* Query results in columns, as in the rendered view (a copy of its rules, scoped to the result boxes). */
  :root { --rv-fg: var(--vscode-editor-foreground, var(--vscode-foreground)); --rv-muted: var(--vscode-descriptionForeground); --rv-bg-2: color-mix(in srgb, var(--rv-fg) 6%, transparent); --rv-bg-3: color-mix(in srgb, var(--rv-fg) 12%, transparent); --rv-stroke: color-mix(in srgb, var(--rv-fg) 12%, transparent); }
  .cm-lv-query { cursor: default; padding: 2px 0; line-height: 1.6; font-family: var(--vscode-markdown-font-family, -apple-system, BlinkMacSystemFont, sans-serif); }
  .cm-lv-query .tfm-query { background: var(--rv-bg-2); border: 1px solid var(--rv-stroke); border-radius: 6px; padding: 10px 14px; margin: 0; }
  .cm-lv-query .tfm-list { margin: .2em 0 .3em; padding-left: 0; list-style: none; }
  .cm-lv-query ul { list-style: none; } .cm-lv-query ul.tfm-subtree { margin: 0; padding-left: 1.6em; }
  .cm-lv-query li.tfm-task { display: grid; grid-template-columns: var(--rv-cols, 1.4em minmax(8em, 1fr) 8.6em 8.6em 8.6em minmax(0, 18em)); column-gap: .9em; align-items: baseline; margin-left: 0; border-top: 1px solid color-mix(in srgb, var(--rv-fg) 7%, transparent); padding: 2px 0; }
  .cm-lv-query li.tfm-task > p { display: contents; }
  .cm-lv-query li.tfm-task .tfm-check { margin: 0; align-self: center; cursor: pointer; }
  .cm-lv-query .tfm-desc { min-width: 0; }
  .cm-lv-query .tfm-col { min-width: 0; font-size: .92em; }
  .cm-lv-query .tfm-col-due, .cm-lv-query .tfm-col-created, .cm-lv-query .tfm-col-done { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cm-lv-query .tfm-col-created, .cm-lv-query .tfm-col-done { color: var(--rv-muted); }
  .cm-lv-query .tfm-col-tags { margin-left: .3em; font-size: .92em; } .cm-lv-query .tfm-col-tags .tfm-tag { color: var(--vscode-textLink-foreground); }
  .cm-lv-query .tfm-col-more { color: var(--rv-muted); font-size: .82em; line-height: 1.5; }
  .cm-lv-query .tfm-col-pri { margin-left: .2em; } .cm-lv-query .tfm-col .tfm-badge { margin: 1px 0; }
  .cm-lv-query li.tfm-task > ul, .cm-lv-query li.tfm-task > ol { grid-column: 1 / -1; margin: 0; padding-left: 1.6em; }
  .cm-lv-query li.tfm-task.tfm-status-done .tfm-desc { color: var(--rv-muted); }
  .cm-lv-query li.tfm-task.tfm-status-cancelled .tfm-desc { color: var(--rv-muted); text-decoration: line-through; }
  .cm-lv-query li.tfm-context > .tfm-desc { opacity: .5; }
  .cm-lv-query .tfm-badge { font-size: .78em; line-height: 1.6; background: var(--rv-bg-3); color: var(--rv-fg); }
  .cm-lv-query h4.tfm-group, .cm-lv-query h5.tfm-group, .cm-lv-query h6.tfm-group { margin: .6em 0 .2em; font-size: 1em; font-weight: 600; }
  .cm-lv-query .tfm-task-count { color: var(--rv-muted); }
  .cm-lv-query .rv-colhead { display: grid; grid-template-columns: var(--rv-cols, 1.4em minmax(8em, 1fr) 8.6em 8.6em 8.6em minmax(0, 18em)); column-gap: .9em; align-items: center; height: 22px; margin: 0 0 2px; overflow: hidden; color: var(--rv-muted); border-bottom: 1px solid color-mix(in srgb, var(--rv-fg) 14%, transparent); }
  .cm-lv-query .rv-colhead-text, .cm-lv-query .rv-colhead button, .cm-lv-query .rv-colhead-chips { font-size: 11px; }
  .cm-lv-query .rv-colhead-cell { position: relative; display: inline-flex; align-items: center; gap: 3px; min-width: 0; white-space: nowrap; }
  .cm-lv-query .rv-colhead-text { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .cm-lv-query .rv-colhead button { border: none; background: transparent; color: var(--rv-muted); font: inherit; font-size: 11px; padding: 0 4px; border-radius: 3px; cursor: pointer; line-height: 16px; }
  .cm-lv-query .rv-colhead button:hover, .cm-lv-query .rv-colhead button:focus-visible { background: var(--rv-bg-3); color: var(--rv-fg); }
  .cm-lv-query .rv-colhead-chips { margin-left: auto; flex: none; display: inline-flex; gap: 4px; padding: 0 .3em 0 6px; }
  .cm-lv-query .rv-colhead button, .cm-lv-query .rv-colhead .rv-colhead-chips, .cm-lv-query .rv-colgrip::after { opacity: 0; transition: opacity .12s; }
  .cm-lv-query .rv-colhead:is(:hover, :focus-within) :is(button, .rv-colhead-chips, .rv-colgrip::after), body.rv-resizing .cm-lv-query .rv-colhead :is(button, .rv-colhead-chips) { opacity: 1; }
  .cm-lv-query .rv-colhead:is(:hover, :focus-within) .rv-colgrip::after, body.rv-resizing .cm-lv-query .rv-colgrip::after { opacity: 1; }
  .cm-lv-query .rv-colgrip { position: absolute; top: 0; bottom: 0; left: calc(-.45em - 5px); width: 10px; cursor: col-resize; touch-action: none; outline: none; }
  .cm-lv-query .rv-colgrip::after { content: ''; position: absolute; top: 3px; bottom: 3px; left: 4px; width: 2px; border-radius: 1px; background: color-mix(in srgb, var(--rv-fg) 22%, transparent); }
  .cm-lv-query .rv-colgrip:hover::after, .cm-lv-query .rv-colgrip:focus-visible::after, .cm-lv-query .rv-colgrip.rv-active::after { background: var(--vscode-focusBorder); }
  body.rv-resizing, body.rv-resizing * { cursor: col-resize !important; user-select: none; }
  .rv-measure { position: absolute !important; left: 0; top: 0; visibility: hidden; width: max-content !important; max-width: none !important; white-space: nowrap !important; overflow: visible !important; pointer-events: none; }
  body.hide-col-due .cm-lv-query .tfm-col-due, body.hide-col-created .cm-lv-query .tfm-col-created, body.hide-col-done .cm-lv-query .tfm-col-done, body.hide-col-more .cm-lv-query .tfm-col-more { display: none !important; }
  @media (max-width: 640px) {
    .cm-lv-query li.tfm-task { grid-template-columns: 1.4em minmax(0, 1fr); }
    .cm-lv-query .tfm-col { grid-column: 2; } .cm-lv-query .tfm-col:empty { display: none; } .cm-lv-query .rv-colhead { display: none; }
  }
</style>
</head>
<body data-l-hidden="${t('{0} hidden')}">
<div class="rv-tools">
  <label class="rv-select" title="${t('Query results')}"><span>${t('Sort')}</span><select id="view-sort">
    <option value="document">${t('Document order')}</option><option value="due">${t('Due date')}</option><option value="created">${t('Created date')}</option><option value="priority">${t('Priority')}</option><option value="urgency">${t('Urgency')}</option>
  </select></label>
  <label class="rv-select" title="${t('Query results')}"><span>${t('Show')}</span><select id="view-scope">
    <option value="all">${t('Everything')}</option><option value="open">${t('Open only')}</option><option value="today">${t('Due by today')}</option><option value="week">${t('This week')}</option><option value="nextWeek">${t('Through next week')}</option><option value="overdue">${t('Overdue')}</option>
  </select></label>
  <details id="view-cols" class="rv-cols"><summary data-l-label="${t('Columns')}" data-l-hidden="${t('Columns · {0} hidden')}">${t('Columns')}</summary>
    <div class="rv-cols-menu">
      <label><input type="checkbox" data-col="due" checked> ${t('Due date')}</label>
      <label><input type="checkbox" data-col="created" checked> ${t('Created date')}</label>
      <label><input type="checkbox" data-col="done" checked> ${t('Done date')}</label>
      <label><input type="checkbox" data-col="more" checked> ${t('Other fields')}</label>
    </div>
  </details>
  <span id="view-hidden"></span>
  <div class="rv-toggle" role="group" aria-label="${t('Editor mode')}">
    <button id="mode-rendered">${t('Rendered')}</button>
    <button id="mode-live" aria-pressed="true">${t('Live')}</button>
    <button id="mode-source">${t('Source')}</button>
  </div>
</div>
<div id="editor"></div>
<script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
  }
}

/**
 * Keeps one note and one live editor in step: applies the editor's changes to the document, in order, and sends the
 * document's text to the editor when it changed elsewhere.
 */
export class LiveSync implements vscode.Disposable {
  /**
   * Texts our own edits will produce, oldest first. A document change that lands on one of them is ours coming back;
   * anything else came from elsewhere and goes to the editor. A list, not one text: with fast typing the change event
   * of one edit can arrive after the next edit was applied (11-01).
   */
  private expected: string[] = [];
  private queue: Promise<void> = Promise.resolve();
  private readonly sub: vscode.Disposable;

  constructor(private readonly document: vscode.TextDocument, private readonly post: (m: ToLive) => void, private readonly log: (m: string) => void) {
    this.sub = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document !== document || !e.contentChanges.length) return;
      const text = document.getText();
      const ours = this.expected.indexOf(text);
      if (ours >= 0) { this.expected = this.expected.slice(ours + 1); return; } // our own edit coming back
      this.expected = [];
      post({ type: 'live/text', text });
    });
  }

  /** Apply an edit from the editor (after the ones before it). */
  edit(msg: Extract<FromLive, { type: 'live/edit' }>): Promise<void> {
    const run = this.queue.then(() => this.apply(msg));
    this.queue = run.catch(() => undefined); // one failed edit does not stop the next
    return run;
  }

  private async apply(msg: Extract<FromLive, { type: 'live/edit' }>): Promise<void> {
    const before = this.document.getText();
    if (before.length !== msg.length) {
      // Out of step (a change from elsewhere crossed this one): the editor takes the note's text.
      this.log(`live view: out of step (${before.length} ≠ ${msg.length}), resent the note`);
      this.expected = [];
      this.post({ type: 'live/text', text: before });
      return;
    }
    this.expected.push(applyChanges(before, msg.changes));
    const edit = new vscode.WorkspaceEdit();
    for (const c of msg.changes) edit.replace(this.document.uri, new vscode.Range(this.document.positionAt(c.from), this.document.positionAt(c.to)), c.insert);
    if (!(await vscode.workspace.applyEdit(edit))) {
      this.expected = [];
      this.post({ type: 'live/text', text: this.document.getText() });
    }
  }

  dispose(): void {
    this.sub.dispose();
  }
}

/** Registers the live view (an "Open With…" editor) and its command. */
export function registerLiveView(context: vscode.ExtensionContext, deps: LiveViewDeps): void {
  const provider = new LiveViewProvider(deps);
  context.subscriptions.push(
    // Internal: Option/Alt+Shift+C in a live view, for the create/edit command.
    vscode.commands.registerCommand('tasksmd.live.editLine', () => provider.takeEditLine()),
    vscode.window.registerCustomEditorProvider(LIVE_VIEW_TYPE, provider, { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true }),
    vscode.commands.registerCommand('tasksmd.openLive', async (arg?: unknown) => {
      const editor = vscode.window.activeTextEditor;
      const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input as { uri?: vscode.Uri } | undefined;
      const uri = arg instanceof vscode.Uri ? arg : editor?.document.languageId === 'markdown' ? editor.document.uri : input?.uri && /\.(md|markdown)$/i.test(input.uri.path) ? input.uri : undefined;
      if (!uri) {
        void vscode.window.showInformationMessage(t('Open a Markdown file first.'));
        return;
      }
      await vscode.commands.executeCommand('vscode.openWith', uri, LIVE_VIEW_TYPE, vscode.ViewColumn.Active);
    }),
  );
}
