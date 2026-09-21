import * as vscode from 'vscode';
import { WebviewHost, type WebviewHostDeps } from './WebviewHost';

/** Opens (or reveals) a singleton editor-area panel for the given app. */
export function createPanelOpener(deps: WebviewHostDeps, app: string, title: string, icon: string): () => WebviewHost {
  let panel: vscode.WebviewPanel | null = null;
  let host: WebviewHost | null = null;
  return () => {
    if (panel && host) {
      panel.reveal();
      return host;
    }
    panel = vscode.window.createWebviewPanel(`tasksmd.${app}`, title, vscode.ViewColumn.Active, { enableScripts: true, retainContextWhenHidden: false });
    panel.iconPath = new vscode.ThemeIcon(icon);
    host = new WebviewHost(deps, { app, title });
    host.attach(panel.webview);
    host.onClose = () => panel?.dispose();
    panel.onDidDispose(() => {
      host?.dispose();
      panel = null;
      host = null;
    });
    return host;
  };
}

export interface EditTarget {
  key: string | null;
  line: number | null;
}

export function registerWebviews(context: vscode.ExtensionContext, deps: WebviewHostDeps): { openEdit: (target: EditTarget) => WebviewHost } {
  const openEditPanel = createPanelOpener(deps, 'edit', vscode.l10n.t('Tasks: Create or edit'), 'edit');
  const openEdit = (target: EditTarget) => {
    const host = openEditPanel();
    host.extras = { editTarget: target };
    // If the panel was already open, tell the running app to switch target.
    host.send({ type: 'edit/target', key: target.key, line: target.line });
    return host;
  };
  void context;
  return { openEdit };
}
