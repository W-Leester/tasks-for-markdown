import * as vscode from 'vscode';
import { WebviewHost, type WebviewHostDeps } from './WebviewHost';
import { PanelFullscreen } from './PanelFullscreen';
import { t } from '../l10n';

export interface PanelHandle {
  host: WebviewHost;
  fullscreen: PanelFullscreen;
}

/** Opens (or reveals) a singleton editor-area panel for the given app. Every panel can go full screen. */
export function createPanelOpener(deps: WebviewHostDeps, app: string, title: string, icon: string, column: vscode.ViewColumn = vscode.ViewColumn.Active): () => PanelHandle {
  let panel: vscode.WebviewPanel | null = null;
  let handle: PanelHandle | null = null;
  return () => {
    if (panel && handle) {
      panel.reveal();
      return handle;
    }
    panel = vscode.window.createWebviewPanel(`tasksmd.${app}`, title, { viewColumn: column, preserveFocus: false }, { enableScripts: true, retainContextWhenHidden: false });
    panel.iconPath = new vscode.ThemeIcon(icon);
    const host = new WebviewHost(deps, { app, title });
    const fullscreen = new PanelFullscreen(panel, () => deps.settings.get('calendar.fullScreen'), deps.log);
    host.attach(panel.webview);
    host.onClose = () => panel?.dispose();
    host.onFullscreen = async (on) => {
      await fullscreen.set(on);
      // uiState survives a webview reload (retainContextWhenHidden is off); the message updates a live app.
      host.extras.fullscreen = fullscreen.active;
      host.send({ type: 'ui/fullscreen', on: fullscreen.active });
    };
    handle = { host, fullscreen };
    panel.onDidDispose(() => {
      fullscreen.dispose();
      host.dispose();
      panel = null;
      handle = null;
    });
    return handle;
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

export function registerWebviews(context: vscode.ExtensionContext, deps: WebviewHostDeps): { openEdit: (target: EditTarget) => WebviewHost; openKanban: () => WebviewHost; openQueryBuilder: (id: string | null) => WebviewHost; openStats: () => WebviewHost; openCalendar: () => WebviewHost } {
  // Beside, not on top of the editor: the user keeps seeing the note the task goes into.
  const openEditPanel = createPanelOpener(deps, 'edit', t('Tasks: Create or edit'), 'edit', vscode.ViewColumn.Beside);
  const openEdit = (target: EditTarget) => {
    const { host } = openEditPanel();
    host.extras = { ...host.extras, editTarget: target };
    // If the panel was already open, tell the running app to switch target.
    host.send({ type: 'edit/target', key: target.key, line: target.line });
    return host;
  };
  const openKanbanPanel = createPanelOpener(deps, 'kanban', t('Tasks: Kanban'), 'project');
  const openKanban = () => openKanbanPanel().host;
  registerWebviewView(context, deps, 'tasksmd.kanban', 'kanban', 'Kanban');
  context.subscriptions.push(vscode.commands.registerCommand('tasksmd.openKanban', () => openKanban()));
  const openBuilderPanel = createPanelOpener(deps, 'query-builder', t('Tasks: Query builder'), 'search');
  const openQueryBuilder = (id: string | null) => {
    const { host } = openBuilderPanel();
    host.extras = { ...host.extras, queryTarget: id };
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
  const openStatsPanel = createPanelOpener(deps, 'stats', t('Tasks: Statistics'), 'graph');
  const openStats = () => openStatsPanel().host;
  context.subscriptions.push(vscode.commands.registerCommand('tasksmd.openStats', () => openStats()));
  const openCalendarPanel = createPanelOpener(deps, 'calendar', t('Tasks: Calendar'), 'calendar');
  const openCalendar = () => openCalendarPanel().host;
  context.subscriptions.push(
    vscode.commands.registerCommand('tasksmd.openCalendar', () => openCalendar()),
    vscode.commands.registerCommand('tasksmd.openCalendarFullScreen', async () => {
      const { host } = openCalendarPanel();
      await host.onFullscreen?.(true);
      return host;
    }),
    vscode.commands.registerCommand('tasksmd.toggleFullScreen', async () => {
      const { host, fullscreen } = openCalendarPanel();
      await host.onFullscreen?.(!fullscreen.active);
      return host;
    }),
  );
  return { openEdit, openKanban, openQueryBuilder, openStats, openCalendar };
}
