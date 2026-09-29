import * as vscode from 'vscode';
import type { TaskIndex } from '../core/index';
import { parseTaskLine, type StatusRegistry, type Task } from '../core/task';
import type { IndexService } from '../index/IndexService';
import type { TaskEditService } from '../services/TaskEditService';
import type { Settings } from '../settings/Settings';
import type { PreviewIntegration } from './PreviewIntegration';
import { renderDocumentHtml } from './renderDocument';
import { t } from '../l10n';
import { systemClock, type Clock } from '../core/dates';

export const RENDERED_VIEW_TYPE = 'tasksmd.rendered';
const VIEW_STATE_KEY = 'rendered.viewState';
const DEFAULT_PROMPT_KEY = 'rendered.defaultPrompted';

export interface RenderedViewDeps {
  context: vscode.ExtensionContext;
  index: TaskIndex;
  indexService: IndexService;
  editService: TaskEditService;
  settings: Settings;
  preview: PreviewIntegration;
  getStatusRegistry(): StatusRegistry;
  log(message: string): void;
  clock?: Clock;
}

type Incoming =
  | { type: 'ui/ready' }
  | { type: 'doc/toggle'; path: string | null; line: number }
  | { type: 'doc/edit'; path: string | null; line: number }
  | { type: 'doc/postpone'; path: string | null; line: number }
  | { type: 'doc/link'; href: string }
  | { type: 'doc/openSource' }
  | { type: 'doc/view'; sort: string; scope: string };

const DOC_DEBOUNCE_MS = 250;
const INDEX_DEBOUNCE_MS = 400;

/**
 * "Rendered view": a custom editor for Markdown notes that shows the note the way the preview
 * does — tasks with badges, ```tasks blocks replaced by live results — but interactive: clicking a
 * checkbox toggles the task, double-clicking opens the edit dialog, links open their target. It is
 * the stand-in for editors whose own preview cannot run extension renderers (Cursor's WYSIWYG mode).
 */
export class RenderedViewProvider implements vscode.CustomTextEditorProvider, vscode.Disposable {
  private readonly panels = new Map<string, vscode.WebviewPanel>();
  private activeDocument: vscode.Uri | null = null;
  /** Set by the open commands so an explicit open never bounces to the source editor. */
  explicitOpen = new Set<string>();

  constructor(private readonly deps: RenderedViewDeps) {}

  /** The note shown in the focused rendered view, if any. */
  get active(): vscode.Uri | null {
    return this.activeDocument;
  }

  async resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): Promise<void> {
    const key = document.uri.toString();
    const explicit = this.explicitOpen.delete(key);
    // Opened through the default-editor association on a note without tasks (README, docs…): the
    // text editor is what the user wants. Explicit opens (command, Open With…) always render.
    if (!explicit && this.deps.settings.get('rendered.sourceWhenNoTasks') && !/^\s*[-*+]\s+\[.\]|^\s*```tasks\b/m.test(document.getText())) {
      await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', panel.viewColumn);
      panel.dispose();
      return;
    }
    const { webview } = panel;
    const roots = [this.deps.context.extensionUri, vscode.Uri.joinPath(document.uri, '..'), ...(vscode.workspace.workspaceFolders ?? []).map((f) => f.uri)];
    webview.options = { enableScripts: true, localResourceRoots: roots };
    webview.html = this.shell(webview);
    this.panels.set(document.uri.toString(), panel);
    this.activeDocument = document.uri;

    let docTimer: ReturnType<typeof setTimeout> | undefined;
    let indexTimer: ReturnType<typeof setTimeout> | undefined;
    const render = () => {
      try {
        void webview.postMessage({ type: 'doc/html', html: this.renderHtml(document, webview), fontSize: this.deps.settings.get('rendered.fontSize'), lineHeight: this.deps.settings.get('rendered.lineHeight'), fieldsAlign: this.deps.settings.get('rendered.fieldsAlign'), maxWidth: this.deps.settings.get('rendered.maxWidth'), today: (this.deps.clock ?? systemClock).now().startOf('day').format('YYYY-MM-DD'), view: this.viewState(document.uri) });
      } catch (err) {
        this.deps.log(`rendered view: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
      }
    };
    const indexSub = this.deps.index.onDidChange(() => {
      clearTimeout(indexTimer);
      indexTimer = setTimeout(render, INDEX_DEBOUNCE_MS);
    });
    const subs: vscode.Disposable[] = [
      { dispose: () => indexSub.dispose() },
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document !== document) return;
        clearTimeout(docTimer);
        docTimer = setTimeout(render, DOC_DEBOUNCE_MS);
      }),
      this.deps.settings.onDidChange(render),
      webview.onDidReceiveMessage((m: Incoming) => void this.handle(m, document, panel, render)),
      panel.onDidChangeViewState((e) => {
        if (e.webviewPanel.active) this.activeDocument = document.uri;
        else if (this.activeDocument?.toString() === document.uri.toString()) this.activeDocument = null;
      }),
    ];
    panel.onDidDispose(() => {
      clearTimeout(docTimer);
      clearTimeout(indexTimer);
      for (const s of subs) s.dispose();
      this.panels.delete(document.uri.toString());
      if (this.activeDocument?.toString() === document.uri.toString()) this.activeDocument = null;
    });
  }

  private async handle(msg: Incoming, document: vscode.TextDocument, panel: vscode.WebviewPanel, render: () => void): Promise<void> {
    try {
      switch (msg.type) {
        case 'ui/ready':
          render();
          break;
        case 'doc/toggle': {
          const task = this.taskFor(msg.path, msg.line, document);
          if (!task) throw new Error(t('That task is no longer at line {0}; the view has been refreshed.', msg.line + 1));
          await this.deps.editService.toggle(task);
          break;
        }
        case 'doc/edit': {
          const task = this.taskFor(msg.path, msg.line, document);
          if (task) await vscode.commands.executeCommand('tasksmd.createOrEdit', task);
          break;
        }
        case 'doc/postpone': {
          const task = this.taskFor(msg.path, msg.line, document);
          if (task) await vscode.commands.executeCommand('tasksmd.postpone', task);
          break;
        }
        case 'doc/link':
          await this.openLink(msg.href, document);
          break;
        case 'doc/openSource':
          await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', panel.viewColumn);
          break;
        case 'doc/view': {
          const all = this.deps.context.workspaceState.get<Record<string, { sort: string; scope: string }>>(VIEW_STATE_KEY, {});
          await this.deps.context.workspaceState.update(VIEW_STATE_KEY, { ...all, [document.uri.toString()]: { sort: msg.sort, scope: msg.scope } });
          break;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.deps.log(`rendered view: ${msg.type}: ${message}`);
      void vscode.window.showErrorMessage(t('Tasks: {0}', message));
      render();
    }
  }

  /** A task by workspace path (query result rows) or by line in the rendered note (path = null). */
  private taskFor(path: string | null, line: number, document: vscode.TextDocument): Task | undefined {
    if (path) {
      const key = this.deps.index.fileKeys().find((k) => this.deps.index.file(k)?.path === path);
      return key ? this.deps.index.taskAt(key, line) : undefined;
    }
    const key = document.uri.toString();
    const indexed = this.deps.index.taskAt(key, line);
    if (indexed) return indexed;
    if (line >= document.lineCount) return undefined;
    return (
      parseTaskLine(document.lineAt(line).text, {
        statusRegistry: this.deps.getStatusRegistry(),
        globalFilter: this.deps.settings.get('globalFilter') || undefined,
        location: { key, path: this.deps.indexService.displayPath(document.uri), line, heading: null, frontmatterTags: [], depth: 0, parentLine: null },
      }) ?? undefined
    );
  }

  private async openLink(href: string, document: vscode.TextDocument): Promise<void> {
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
      await vscode.env.openExternal(vscode.Uri.parse(href));
      return;
    }
    const [pathPart, fragment = ''] = href.split('#', 2);
    const target = pathPart ? vscode.Uri.joinPath(document.uri, '..', decodeURI(pathPart)) : document.uri;
    const lineMatch = /^L(\d+)$/.exec(fragment);
    const doc = await vscode.workspace.openTextDocument(target);
    const editor = await vscode.window.showTextDocument(doc, { preserveFocus: false });
    if (lineMatch) {
      const line = Math.min(Number(lineMatch[1]) - 1, doc.lineCount - 1);
      const range = doc.lineAt(Math.max(0, line)).range;
      editor.selection = new vscode.Selection(range.end, range.end);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }
  }

  private viewState(uri: vscode.Uri): { sort: string; scope: string } {
    return this.deps.context.workspaceState.get<Record<string, { sort: string; scope: string }>>(VIEW_STATE_KEY, {})[uri.toString()] ?? { sort: 'document', scope: 'all' };
  }

  /** Once: offer to make the rendered view the default editor for Markdown. */
  async maybeOfferDefault(): Promise<void> {
    if (this.deps.context.globalState.get<boolean>(DEFAULT_PROMPT_KEY) || isRenderedDefault()) return;
    await this.deps.context.globalState.update(DEFAULT_PROMPT_KEY, true);
    const yes = t('Make it the default'), no = t('Not now');
    const choice = await vscode.window.showInformationMessage(t('Open Markdown notes in the rendered view by default? You can change this later with "Tasks: Rendered view as default editor".'), yes, no);
    if (choice === yes) await setRenderedDefault(true);
  }

  renderHtml(document: vscode.TextDocument, webview: vscode.Webview): string {
    const base = this.deps.preview.pluginDeps();
    const fieldStyle = this.deps.settings.get('rendered.fieldStyle');
    const deps = {
      ...base,
      enabled: () => true,
      // Task lines follow the rendered-view setting; query results keep their badges (relative dates matter there).
      renderOptions: (source?: Parameters<typeof base.renderOptions>[0], context?: 'line' | 'query') => ({ ...base.renderOptions(source, context), ...(context === 'line' ? { fieldStyle } : {}) }),
    };
    return renderDocumentHtml(document.getText(), deps, {
      frontMatter: true,
      env: { currentDocument: document.uri },
      resolveImage: (src) => webview.asWebviewUri(vscode.Uri.joinPath(document.uri, '..', src)).toString(),
    });
  }

  private shell(webview: vscode.Webview): string {
    const nonce = Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join('');
    const script = webview.asWebviewUri(vscode.Uri.joinPath(this.deps.context.extensionUri, 'dist', 'webviews', 'rendered.js'));
    const css = webview.asWebviewUri(vscode.Uri.joinPath(this.deps.context.extensionUri, 'media', 'preview.css'));
    return `<!DOCTYPE html>
<html lang="${vscode.env.language}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} https: data:; font-src ${webview.cspSource};">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${css}">
<style>
  /* Typography and spacing follow Cursor's rich Markdown editor tokens (14px/1.42 base, 1.75/1.5/1.25em
     headings, 0.9em code, 800px column) translated to VS Code theme variables. */
  :root { color-scheme: light dark; --rv-fg: var(--vscode-editor-foreground, var(--vscode-foreground)); --rv-bg: var(--vscode-editor-background); --rv-bg-2: color-mix(in srgb, var(--rv-fg) 6%, transparent); --rv-bg-3: color-mix(in srgb, var(--rv-fg) 12%, transparent); --rv-stroke: color-mix(in srgb, var(--rv-fg) 12%, transparent); --rv-stroke-2: color-mix(in srgb, var(--rv-fg) 20%, transparent); --rv-muted: color-mix(in srgb, var(--rv-fg) 74%, transparent); --rv-accent: var(--vscode-terminal-ansiBlue, #7bafe9); --rv-mono: var(--vscode-editor-font-family, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace); }
  html, body { margin: 0; padding: 0; background: var(--rv-bg); color: var(--rv-fg); }
  body { font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif); font-size: var(--rv-font-size, 15px); line-height: var(--rv-line-height, 1.6); letter-spacing: -0.08px; -webkit-font-smoothing: subpixel-antialiased; -moz-osx-font-smoothing: auto; }
  #content { max-width: var(--rv-max-width, none); margin: 0 auto; padding: 8px 16px 64px; box-sizing: border-box; }
  .rv-tools { max-width: var(--rv-max-width, none); margin-left: auto; margin-right: auto; padding-left: 16px; padding-right: 16px; box-sizing: border-box; }
  #content > :first-child { margin-top: 0; }
  p { margin: 0 0 .75em; }
  h1, h2, h3, h4, h5, h6 { font-weight: 600; line-height: 1.25; margin: 1.5em 0 .5em; }
  h1 { font-size: 1.75em; } h2 { font-size: 1.5em; } h3 { font-size: 1.25em; } h4 { font-size: 1.1em; } h5, h6 { font-size: 1em; }
  ul, ol { margin: .75em 0; padding-left: 1.6em; } li { margin: 2px 0; } li > p { margin: 0; } li > ul, li > ol { margin: 2px 0; }
  a { color: var(--vscode-textLink-foreground, var(--rv-accent)); text-decoration: none; } a:hover { text-decoration: underline; }
  code { font-family: var(--rv-mono); font-size: .9em; background: var(--rv-bg-2); border: 1px solid var(--rv-stroke); border-radius: 4px; padding: 0 .35em; }
  pre { font-family: var(--rv-mono); font-size: .9em; line-height: 1.5; background: var(--rv-bg-2); border-radius: 6px; padding: 12px 16px; margin: 0 0 .75em; overflow: auto; white-space: pre-wrap; }
  pre code { background: none; border: none; padding: 0; font-size: 1em; }
  blockquote { margin: 0 0 .75em; padding: 2px 0 2px 14px; border-left: 3px solid var(--rv-stroke-2); color: var(--rv-muted); } blockquote > :last-child { margin-bottom: 0; }
  table { border-collapse: collapse; margin: 0 0 .75em; } th, td { border: 1px solid var(--rv-stroke); padding: 4px 10px; } th { background: var(--rv-bg-2); }
  img { max-width: 100%; border-radius: 4px; }
  hr { border: none; border-top: 1px solid var(--rv-stroke); margin: 1.5em 0; }
  strong { font-weight: 600; }

  /* Task lines: Cursor-style rounded checkbox, badges after the text. */
  li.tfm-task { list-style: none; margin-left: -1.6em; padding: 0; display: block; }
  /* Loose lists (blank lines between items) wrap the line in <p>: keep it inline so the checkbox, fields and hover buttons stay on one line. */
  li.tfm-task > p { display: inline; margin: 0; }
  li.tfm-task > ul, li.tfm-task > ol { margin-left: 1.6em; } /* keep nesting after the negative margin above */
  li.tfm-task > .tfm-check, li.tfm-task > p > .tfm-check, .tfm-list li.tfm-task > .tfm-check { pointer-events: auto; appearance: none; -webkit-appearance: none; width: 17px; height: 17px; margin: 0 .6em 0 0; vertical-align: -3px; border: 1.5px solid color-mix(in srgb, var(--rv-fg) 32%, transparent); border-radius: 5px; background: transparent; cursor: pointer; position: relative; transition: background .12s, border-color .12s; box-sizing: border-box; }
  li.tfm-task > .tfm-check:hover, li.tfm-task > p > .tfm-check:hover { border-color: var(--rv-accent); }
  li.tfm-task > .tfm-check:checked, li.tfm-task > p > .tfm-check:checked { background: var(--rv-accent); border-color: var(--rv-accent); }
  li.tfm-task > .tfm-check:checked::after, li.tfm-task > p > .tfm-check:checked::after { content: ''; position: absolute; left: 5px; top: 1.5px; width: 4px; height: 8px; border: solid var(--rv-bg); border-width: 0 2px 2px 0; transform: rotate(45deg); }
  .rv-actions { display: none; margin-left: .5em; vertical-align: -1px; gap: 2px; }
  li.tfm-task:hover > .rv-actions, li.tfm-task:focus-within > .rv-actions { display: inline-flex; }
  .tfm-query .tfm-list > li { content-visibility: auto; contain-intrinsic-size: auto 28px; }
  .rv-actions button { border: none; background: var(--rv-bg-2); color: var(--rv-muted); border-radius: 4px; padding: 0 5px; line-height: 18px; font-size: 12px; cursor: pointer; font-family: inherit; }
  .rv-actions button:hover { background: var(--rv-bg-3); color: var(--rv-fg); }
  /* Faint separator between task rows (document lists and query results) so wrapped fields stay with their task. */
  li.tfm-task { border-top: 1px solid color-mix(in srgb, var(--rv-fg) 10%, transparent); padding-top: 4px; padding-bottom: 4px; margin: 0; }
  ul > li.tfm-task:first-child, ol > li.tfm-task:first-child { border-top-color: transparent; }
  li.tfm-task > ul > li.tfm-task:first-child, li.tfm-task > p + ul > li.tfm-task:first-child { border-top-color: color-mix(in srgb, var(--rv-fg) 10%, transparent); }
  .tfm-fields { margin-left: .2em; } .tfm-field { white-space: nowrap; }
  /* fieldsAlign = right: description on the left, metadata pushed to the right edge of the column. */
  body.fields-right li.tfm-task, body.fields-right li.tfm-task > p { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: .6em; }
  body.fields-right li.tfm-task > p { margin: 0; width: 100%; }
  body.fields-right li.tfm-task > .tfm-check, body.fields-right li.tfm-task > p > .tfm-check { flex: 0 0 auto; margin-right: 0; }
  body.fields-right .tfm-desc { flex: 1 1 auto; min-width: 12em; }
  body.fields-right .tfm-fields, body.fields-right .tfm-badges { flex: 0 0 auto; margin-left: auto; text-align: right; }
  body.fields-right .tfm-backlink { flex: 0 0 auto; }
  body.fields-right .rv-actions { flex: 0 0 auto; margin-left: .2em; }
  body.fields-right li.tfm-task > ul, body.fields-right li.tfm-task > ol { flex-basis: 100%; } .tfm-field.tfm-overdue { color: var(--vscode-errorForeground, #f14c4c); }
  .tfm-field.tfm-invalid { color: var(--vscode-editorWarning-foreground, #cca700); }
  .rv-frontmatter { color: var(--rv-muted); font-size: 1em; margin: 0 0 1.25em; padding: 0 0 .75em; border-bottom: 1px solid var(--rv-stroke); }
  .rv-frontmatter .k { color: var(--rv-fg); font-weight: 600; }
  /* Completed tasks: muted, no strike-through (consistent for tight and loose lists; the editor setting decorations.strikeDone covers the text editor). */
  li.tfm-task.tfm-status-done, li.tfm-task.tfm-status-done .tfm-desc { color: var(--rv-muted); text-decoration: none; }
  li.tfm-task.tfm-status-cancelled .tfm-desc { color: var(--rv-muted); text-decoration: line-through; }
  .tfm-badges { margin-left: .4em; } .tfm-badge { font-size: .78em; line-height: 1.6; background: var(--rv-bg-3); color: var(--rv-fg); }
  .tfm-query { background: var(--rv-bg-2); border: 1px solid var(--rv-stroke); border-radius: 6px; padding: 10px 14px; margin: 0 0 .75em; }
  .tfm-query .tfm-list { margin: .2em 0 .3em; padding-left: 0; } .tfm-query .tfm-list li.tfm-task { margin-left: 0; }
  .tfm-query ul.tfm-subtree { margin: 0; padding-left: 1.6em; flex-basis: 100%; }
  .tfm-query li.tfm-context > .tfm-desc, .tfm-query li.tfm-context > .tfm-badges { opacity: .5; }
  .tfm-query h4.tfm-group, .tfm-query h5.tfm-group, .tfm-query h6.tfm-group { margin: .6em 0 .2em; font-size: 1em; font-weight: 600; }
  .tfm-task-count { color: var(--rv-muted); }

  /* Sort / scope tools (view only) — top-left of the column, opposite the mode toggle. */
  .rv-tools { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; padding-top: 6px; padding-bottom: 4px; margin-bottom: 8px; background: var(--rv-bg); font-size: 12px; color: var(--rv-muted); }
  .rv-select { display: inline-flex; gap: 6px; align-items: center; }
  .rv-select select { font: inherit; color: var(--rv-fg); background: var(--rv-bg-2); border: 1px solid var(--rv-stroke); border-radius: 4px; padding: 2px 6px; }
  .rv-hint { margin-left: auto; padding-right: 130px; }
  li.tfm-task.rv-hidden { display: none !important; }
  li.tfm-task.rv-dim > .tfm-desc, li.tfm-task.rv-dim > p > .tfm-desc, li.tfm-task.rv-dim > .tfm-fields, li.tfm-task.rv-dim > p > .tfm-fields { opacity: .45; }
  /* Mode toggle in the top-right corner, like Cursor's "Preview | Markdown". */
  .rv-toggle { position: fixed; top: 6px; right: 14px; z-index: 2; display: inline-flex; gap: 2px; padding: 2px; border-radius: 6px; background: var(--rv-bg); font-size: 12px; line-height: 1; }
  .rv-toggle button { border: none; background: transparent; color: var(--rv-muted); padding: 4px 8px; border-radius: 4px; cursor: pointer; font: inherit; }
  .rv-toggle button:hover { color: var(--rv-fg); }
  .rv-toggle button[aria-pressed="true"] { background: var(--rv-bg-3); color: var(--rv-fg); cursor: default; }
</style>
<title>${t('Tasks: Rendered view')}</title>
</head>
<body data-l-edit="${t('Edit')}" data-l-postpone="${t('Postpone')}" data-l-hidden="${t('{0} hidden')}">
<div class="rv-tools">
  <label class="rv-select"><span>${t('Sort')}</span><select id="view-sort">
    <option value="document">${t('Document order')}</option><option value="due">${t('Due date')}</option><option value="created">${t('Created date')}</option><option value="priority">${t('Priority')}</option><option value="urgency">${t('Urgency')}</option>
  </select></label>
  <label class="rv-select"><span>${t('Show')}</span><select id="view-scope">
    <option value="all">${t('Everything')}</option><option value="open">${t('Open only')}</option><option value="today">${t('Due by today')}</option><option value="week">${t('This week')}</option><option value="nextWeek">${t('Through next week')}</option><option value="overdue">${t('Overdue')}</option>
  </select></label>
  <span id="view-hidden" class="rv-hint"></span>
</div>
<div class="rv-toggle" role="group" aria-label="${t('Editor mode')}">
  <button id="mode-rendered" aria-pressed="true">${t('Rendered')}</button>
  <button id="mode-source" title="${t('Open the Markdown source in the text editor')} (Ctrl+Shift+R)">${t('Source')}</button>
</div>
<div id="content"></div>
<script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
  }

  dispose(): void {
    for (const p of this.panels.values()) p.dispose();
    this.panels.clear();
  }
}

/** Is `*.md` associated with the rendered view (user or workspace settings)? */
export function isRenderedDefault(): boolean {
  const assoc = vscode.workspace.getConfiguration('workbench').get<Record<string, string>>('editorAssociations', {});
  return assoc['*.md'] === RENDERED_VIEW_TYPE;
}

/** Point `workbench.editorAssociations["*.md"]` at the rendered view (user settings), or remove that entry. */
export async function setRenderedDefault(on: boolean): Promise<void> {
  const config = vscode.workspace.getConfiguration('workbench');
  const current = { ...config.get<Record<string, string>>('editorAssociations', {}) };
  if (on) current['*.md'] = RENDERED_VIEW_TYPE;
  else if (current['*.md'] === RENDERED_VIEW_TYPE) delete current['*.md'];
  await config.update('editorAssociations', current, vscode.ConfigurationTarget.Global);
  void vscode.window.showInformationMessage(on ? t('Markdown notes now open in the rendered view. Source: the Source button or Ctrl+Shift+R.') : t('Markdown notes open in the text editor again.'));
}

/** Registers the custom editor and the commands that open it. */
export function registerRenderedView(context: vscode.ExtensionContext, deps: RenderedViewDeps): RenderedViewProvider {
  const provider = new RenderedViewProvider(deps);
  const activeMarkdownUri = (arg: unknown): vscode.Uri | undefined => {
    if (arg instanceof vscode.Uri) return arg;
    const editor = vscode.window.activeTextEditor;
    if (editor?.document.languageId === 'markdown') return editor.document.uri;
    const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input as { uri?: vscode.Uri } | undefined;
    if (input?.uri && /\.(md|markdown)$/i.test(input.uri.path)) return input.uri;
    return provider.active ?? undefined;
  };
  /** Close the other editor of the same note in the active group so switching feels like a mode toggle. */
  const closeCounterpart = async (uri: vscode.Uri, keep: 'rendered' | 'source') => {
    const key = uri.toString();
    for (const tab of vscode.window.tabGroups.activeTabGroup.tabs) {
      const input = tab.input;
      const isSource = input instanceof vscode.TabInputText && input.uri.toString() === key;
      const isRendered = input instanceof vscode.TabInputCustom && input.viewType === RENDERED_VIEW_TYPE && input.uri.toString() === key;
      if ((keep === 'rendered' && isSource) || (keep === 'source' && isRendered)) {
        if (tab.isDirty) continue; // never risk a save prompt; the document model is shared anyway
        await vscode.window.tabGroups.close(tab, true);
      }
    }
  };
  const openRendered = async (arg: unknown, column: vscode.ViewColumn, toggle: boolean) => {
    const uri = activeMarkdownUri(arg);
    if (!uri) {
      void vscode.window.showInformationMessage(t('Open a Markdown file first.'));
      return;
    }
    if (toggle && provider.active?.toString() === uri.toString() && !vscode.window.activeTextEditor) return openSource(uri);
    provider.explicitOpen.add(uri.toString());
    await vscode.commands.executeCommand('vscode.openWith', uri, RENDERED_VIEW_TYPE, column);
    void provider.maybeOfferDefault();
    if (column === vscode.ViewColumn.Active) await closeCounterpart(uri, 'rendered');
  };
  const openSource = async (arg: unknown) => {
    const uri = arg instanceof vscode.Uri ? arg : provider.active;
    if (!uri) return;
    await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
    await closeCounterpart(uri, 'source');
  };
  context.subscriptions.push(
    provider,
    vscode.window.registerCustomEditorProvider(RENDERED_VIEW_TYPE, provider, { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true }),
    vscode.commands.registerCommand('tasksmd.openRendered', (arg?: unknown) => openRendered(arg, vscode.ViewColumn.Active, true)),
    vscode.commands.registerCommand('tasksmd.renderedAsDefault', async () => {
      const on = t('Rendered view (tasks rendered, click to complete)'), off = t('Text editor');
      const pick = await vscode.window.showQuickPick([{ label: on, picked: isRenderedDefault(), value: true }, { label: off, picked: !isRenderedDefault(), value: false }], { placeHolder: t('Which editor should open Markdown notes?') });
      if (pick) await setRenderedDefault(pick.value);
    }),
    vscode.commands.registerCommand('tasksmd.openRenderedToSide', (arg?: unknown) => openRendered(arg, vscode.ViewColumn.Beside, false)),
    vscode.commands.registerCommand('tasksmd.openSource', (arg?: unknown) => openSource(arg)),
  );
  return provider;
}
