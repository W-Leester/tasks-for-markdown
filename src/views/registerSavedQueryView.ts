import * as vscode from 'vscode';
import type { QueryService } from '../services/QueryService';
import type { SavedQueryStore, SavedQuery } from '../services/SavedQueryStore';
import type { TaskEditService } from '../services/TaskEditService';
import type { Settings } from '../settings/Settings';
import { SAVED_QUERY_VIEW_ID, SavedQueryTreeProvider } from './SavedQueryTreeProvider';
import { isTaskNode } from './taskItem';
import { t } from '../l10n';

export function registerSavedQueryView(
  context: vscode.ExtensionContext,
  deps: { store: SavedQueryStore; queries: QueryService; settings: Settings; editService: TaskEditService; log(m: string): void },
): SavedQueryTreeProvider {
  const provider = new SavedQueryTreeProvider(deps);
  const view = vscode.window.createTreeView(SAVED_QUERY_VIEW_ID, { treeDataProvider: provider, showCollapseAll: true, manageCheckboxStateManually: true });
  const updateEmpty = () => void vscode.commands.executeCommand('setContext', 'tasksmd.savedQueriesEmpty', deps.store.all().length === 0);
  updateEmpty();
  const out = vscode.window.createOutputChannel('Tasks: Query explain');

  const queryArg = (arg: unknown): SavedQuery | undefined => (arg && typeof arg === 'object' && 'query' in arg ? (arg as { query: SavedQuery }).query : undefined);

  context.subscriptions.push(
    provider,
    view,
    out,
    deps.store.onDidChange(updateEmpty),
    view.onDidChangeCheckboxState(async (e) => {
      const tasks = e.items.map(([n]) => n).filter(isTaskNode).map((n) => n.task).sort((a, b) => b.location.line - a.location.line);
      for (const t of tasks) {
        try {
          await deps.editService.toggle(t);
        } catch (err) {
          deps.log(`checkbox toggle failed: ${err instanceof Error ? err.message : String(err)}`);
          provider.refresh();
        }
      }
    }),
    vscode.commands.registerCommand('tasksmd.savedQuery.new', async () => {
      const name = await vscode.window.showInputBox({ prompt: t('Name of the new query'), placeHolder: t('e.g. This week') });
      if (!name) return;
      const uri = await deps.store.createFile(name);
      await vscode.window.showTextDocument(uri);
    }),
    vscode.commands.registerCommand('tasksmd.savedQuery.edit', async (arg) => {
      const q = queryArg(arg);
      if (!q) return;
      if (q.uri) await vscode.window.showTextDocument(q.uri);
      else {
        void vscode.window.showInformationMessage(t('Settings-based queries are edited in settings.json.'));
        await vscode.commands.executeCommand('workbench.action.openWorkspaceSettingsFile');
      }
    }),
    vscode.commands.registerCommand('tasksmd.savedQuery.delete', async (arg) => {
      const q = queryArg(arg);
      if (!q) return;
      const ok = await vscode.window.showWarningMessage(t('Delete saved query "{0}"?', q.name), { modal: true }, t('Delete'));
      if (ok) await deps.store.remove(q);
    }),
    vscode.commands.registerCommand('tasksmd.savedQuery.explain', (arg) => {
      const q = queryArg(arg);
      if (!q) return;
      out.clear();
      out.appendLine(`# ${q.name}\n`);
      out.appendLine(q.query);
      out.appendLine('\n---\n');
      out.appendLine(deps.queries.explain(q.query, q.uri ? { path: vscode.workspace.asRelativePath(q.uri) } : undefined));
      out.show(true);
    }),
    vscode.commands.registerCommand('tasksmd.savedQuery.refresh', () => deps.store.reload()),
  );
  return provider;
}
