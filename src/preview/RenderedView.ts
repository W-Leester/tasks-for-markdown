import * as vscode from 'vscode';
import type { TaskIndex } from '../core/index';
import { parseTaskLine, type StatusRegistry, type Task } from '../core/task';
import type { IndexService } from '../index/IndexService';
import type { TaskEditService } from '../services/TaskEditService';
import type { Settings } from '../settings/Settings';
import type { PreviewIntegration } from './PreviewIntegration';
import { renderDocumentHtml } from './renderDocument';
import { t } from '../l10n';

export const RENDERED_VIEW_TYPE = 'tasksmd.rendered';

export interface RenderedViewDeps {
  context: vscode.ExtensionContext;
  index: TaskIndex;
  indexService: IndexService;
  editService: TaskEditService;
  settings: Settings;
  preview: PreviewIntegration;
  getStatusRegistry(): StatusRegistry;
  log(message: string): void;
}

type Incoming =
  | { type: 'ui/ready' }
  | { type: 'doc/toggle'; path: string | null; line: number }
  | { type: 'doc/edit'; path: string | null; line: number }
  | { type: 'doc/link'; href: string }
  | { type: 'doc/openSource' };

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

  constructor(private readonly deps: RenderedViewDeps) {}

  /** The note shown in the focused rendered view, if any. */
  get active(): vscode.Uri | null {
    return this.activeDocument;
  }

  resolveCustomTextEditor(document: vscode.TextDocument, panel: vscode.WebviewPanel): void {
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
        void webview.postMessage({ type: 'doc/html', html: this.renderHtml(document, webview) });
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
        case 'doc/link':
          await this.openLink(msg.href, document);
          break;
        case 'doc/openSource':
          await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', panel.viewColumn);
          break;
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

  renderHtml(document: vscode.TextDocument, webview: vscode.Webview): string {
    const deps = { ...this.deps.preview.pluginDeps(), enabled: () => true };
    return renderDocumentHtml(document.getText(), deps, {
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
  body { font-family: var(--vscode-markdown-font-family, var(--vscode-font-family)); font-size: var(--vscode-markdown-font-size, 14px); line-height: var(--vscode-markdown-line-height, 22px); padding: 0 26px 40px; max-width: 980px; margin: 0 auto; }
  .tfm-toolbar { position: sticky; top: 0; z-index: 1; display: flex; gap: 8px; align-items: center; padding: 6px 0; margin: 0 -26px 8px; padding-left: 26px; padding-right: 26px; background: var(--vscode-editor-background); border-bottom: 1px solid var(--vscode-widget-border, transparent); font-size: 0.85em; opacity: 0.85; }
  .tfm-toolbar button { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 3px; padding: 2px 10px; cursor: pointer; }
  .tfm-toolbar button:hover { background: var(--vscode-button-secondaryHoverBackground); }
  .tfm-toolbar .hint { margin-left: auto; opacity: 0.8; }
  li.tfm-task > .tfm-check, .tfm-list li.tfm-task > .tfm-check { pointer-events: auto; cursor: pointer; }
  li.tfm-task > .tfm-desc { cursor: default; }
  a { color: var(--vscode-textLink-foreground); }
  code { font-family: var(--vscode-editor-font-family); font-size: 0.9em; background: color-mix(in srgb, var(--vscode-textCodeBlock-background, #8882) 100%, transparent); padding: 0 0.3em; border-radius: 3px; }
  pre { background: var(--vscode-textCodeBlock-background, #8882); padding: 0.8em 1em; border-radius: 4px; overflow: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid var(--vscode-textBlockQuote-border); background: var(--vscode-textBlockQuote-background); margin: 0; padding: 0.2em 1em; }
  table { border-collapse: collapse; } th, td { border: 1px solid var(--vscode-widget-border, #8884); padding: 4px 10px; }
  img { max-width: 100%; }
  hr { border: none; border-top: 1px solid var(--vscode-widget-border, #8884); }
</style>
<title>${t('Tasks: Rendered view')}</title>
</head>
<body>
<div class="tfm-toolbar">
  <button id="edit-source" title="${t('Open the Markdown source in the text editor')}">${t('Edit source')}</button>
  <button id="refresh">${t('Refresh')}</button>
  <span class="hint">${t('Checkbox: toggle · Double-click a task: edit · Links open their target')}</span>
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
  const open = async (arg: unknown, column: vscode.ViewColumn) => {
    const uri = activeMarkdownUri(arg);
    if (!uri) {
      void vscode.window.showInformationMessage(t('Open a Markdown file first.'));
      return;
    }
    await vscode.commands.executeCommand('vscode.openWith', uri, RENDERED_VIEW_TYPE, column);
  };
  context.subscriptions.push(
    provider,
    vscode.window.registerCustomEditorProvider(RENDERED_VIEW_TYPE, provider, { webviewOptions: { retainContextWhenHidden: true }, supportsMultipleEditorsPerDocument: true }),
    vscode.commands.registerCommand('tasksmd.openRendered', (arg?: unknown) => open(arg, vscode.ViewColumn.Active)),
    vscode.commands.registerCommand('tasksmd.openRenderedToSide', (arg?: unknown) => open(arg, vscode.ViewColumn.Beside)),
    vscode.commands.registerCommand('tasksmd.openSource', async (arg?: unknown) => {
      const uri = arg instanceof vscode.Uri ? arg : provider.active;
      if (uri) await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
    }),
  );
  return provider;
}
