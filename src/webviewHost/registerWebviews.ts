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

/** Sidebar-hosted instance of an app (contributes.views type: webview). */
export function registerWebviewView(context: vscode.ExtensionContext, deps: WebviewHostDeps, viewId: string, app: string, title: string): void {
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(viewId, {
      resolveWebviewView(view) {
        const host = new WebviewHost(deps, { app, title });
        host.attach(view.webview);
        view.onDidDispose(() => host.dispose());
      },
    }),
  );
}

export function registerWebviews(context: vscode.ExtensionContext, deps: WebviewHostDeps): { openEdit: (target: EditTarget) => WebviewHost; openKanban: () => WebviewHost; openQueryBuilder: (id: string | null) => WebviewHost; openStats: () => WebviewHost } {
  const openEditPanel = createPanelOpener(deps, 'edit', vscode.l10n.t('Tasks: Create or edit'), 'edit');
  const openEdit = (target: EditTarget) => {
    const host = openEditPanel();
    host.extras = { editTarget: target };
    // If the panel was already open, tell the running app to switch target.
    host.send({ type: 'edit/target', key: target.key, line: target.line });
    return host;
  };
  const openKanban = createPanelOpener(deps, 'kanban', vscode.l10n.t('Tasks: Kanban'), 'project');
  registerWebviewView(context, deps, 'tasksmd.kanban', 'kanban', 'Kanban');
  context.subscriptions.push(vscode.commands.registerCommand('tasksmd.openKanban', () => openKanban()));
  const openBuilderPanel = createPanelOpener(deps, 'query-builder', vscode.l10n.t('Tasks: Query builder'), 'search');
  const openQueryBuilder = (id: string | null) => {
    const host = openBuilderPanel();
    host.extras = { queryTarget: id };
    host.send({ type: 'query/target', id });
    return host;
  };
  context.subscriptions.push(
    vscode.commands.registerCommand('tasksmd.openQueryBuilder', () => openQueryBuilder(null)),
    vscode.commands.registerCommand('tasksmd.savedQuery.openInBuilder', (arg: unknown) => {
      const q = arg && typeof arg === 'object' && 'query' in arg ? (arg as { query: { id: string } }).query : undefined;
      return openQueryBuilder(q?.id ?? null);
    }),
  );
  const openStats = createPanelOpener(deps, 'stats', vscode.l10n.t('Tasks: Statistics'), 'graph');
  context.subscriptions.push(vscode.commands.registerCommand('tasksmd.openStats', () => openStats()));
  return { openEdit, openKanban, openQueryBuilder, openStats };
}
