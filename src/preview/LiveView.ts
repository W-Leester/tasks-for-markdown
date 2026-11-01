import * as vscode from 'vscode';
import { findHeadingLine } from '../core/file/headingAnchor';
import type { TaskIndex } from '../core/index';
import { parseTaskLine, type StatusRegistry } from '../core/task';
import type { IndexService } from '../index/IndexService';
import type { PreviewIntegration } from './PreviewIntegration';
import { renderDocumentHtml } from './renderDocument';
import { t } from '../l10n';
import type { TaskEditService } from '../services/TaskEditService';
import type { Settings } from '../settings/Settings';
import { applyChanges, type FromLive, type ToLive } from '../webviews/live/sync';

/**
 * Live view (M40, trial): the note in a CodeMirror editor inside a webview, Markdown marks hidden except where the
 * cursor is (like Obsidian's live preview). The editor's text is the file's text: edits from the webview are applied
 * to the document as they are; changes made elsewhere are sent back as the whole text.
 */
export const LIVE_VIEW_TYPE = 'tasksmd.live';

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
  /** Option/Alt+Shift+C in a live view: the line the create/edit command should use (read once). */
  private editLine: { key: string; line: number } | undefined;

  constructor(private readonly deps: LiveViewDeps) {}

  /** For `tasksmd.createOrEdit` (M40): the live view's line, once. */
  takeEditLine(): { key: string; line: number } | undefined {
    const l = this.editLine;
    this.editLine = undefined;
    return l;
  }

  /** Query results for the note's ```tasks blocks (badges, as in the rendered view's query boxes). */
  private queries(document: vscode.TextDocument): { source: string; html: string }[] {
    const deps = { ...this.deps.preview.pluginDeps(), enabled: () => true };
    return [...new Set(queryBlocks(document.getText()))].map((source) => {
      try {
        return { source, html: renderDocumentHtml('```tasks\n' + source + '\n```\n', deps, { env: { currentDocument: document.uri } }) };
      } catch (err) {
        return { source, html: `<div class="tfm-query tfm-error">${String(err).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!)}</div>` };
      }
    });
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
      queryTimer = setTimeout(() => post({ type: 'live/queries', blocks: this.queries(document) }), delay);
    };
    const indexSub = this.deps.index.onDidChange(() => sendQueries(400));
    // Messages are handled one after another, in the order the editor sent them.
    let queue: Promise<void> = Promise.resolve();
    const subs: vscode.Disposable[] = [
      sync,
      { dispose: () => { indexSub.dispose(); clearTimeout(queryTimer); } },
      vscode.workspace.onDidChangeTextDocument((e) => { if (e.document === document) sendQueries(300); }),
      webview.onDidReceiveMessage((m: FromLive) => {
        queue = queue.then(() => this.handle(m, document, post, sync)).catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          this.deps.log(`live view: ${m.type}: ${message}`);
          void vscode.window.showErrorMessage(t('Tasks: {0}', message));
        });
      }),
    ];
    panel.onDidDispose(() => { for (const s of subs) s.dispose(); });
  }

  private async handle(msg: FromLive, document: vscode.TextDocument, post: (m: ToLive) => void, sync: LiveSync): Promise<void> {
    switch (msg.type) {
      case 'live/ready':
        post({ type: 'live/queries', blocks: this.queries(document) });
        post({ type: 'live/init', text: document.getText(), eol: document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n', fontSize: this.deps.settings.get('rendered.fontSize'), lineHeight: this.deps.settings.get('rendered.lineHeight'), maxWidth: this.deps.settings.get('rendered.maxWidth') });
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
  #editor { height: 100%; }
  .cm-lv-query { cursor: default; padding: 2px 0; font-family: var(--vscode-markdown-font-family, -apple-system, BlinkMacSystemFont, sans-serif); }
  .cm-lv-query .tfm-query { background: var(--vscode-textCodeBlock-background, rgba(128,128,128,.08)); border: 1px solid var(--vscode-widget-border, rgba(128,128,128,.25)); border-radius: 6px; padding: 8px 12px; margin: 0; }
  .cm-lv-query ul { list-style: none; padding-left: 0; margin: .2em 0; }
  .cm-lv-query input.tfm-check { cursor: pointer; }
</style>
</head>
<body>
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
