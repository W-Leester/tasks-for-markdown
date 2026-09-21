import * as vscode from 'vscode';
import type { GroupMode } from '../core/views';
import type { TaskEditService } from '../services/TaskEditService';
import { GROUP_MODES, TREE_VIEW_ID, TaskTreeProvider, type TaskTreeDeps, isTaskNode } from './TaskTreeProvider';
import { t } from '../l10n';

const GROUP_LABELS: Record<GroupMode, string> = {
  none: 'No grouping',
  file: 'File',
  due: 'Due date',
  priority: 'Priority',
  tag: 'Tag',
  heading: 'Heading',
  status: 'Status',
};

export function registerTreeView(context: vscode.ExtensionContext, deps: TaskTreeDeps & { editService: TaskEditService; log(m: string): void }): TaskTreeProvider {
  const provider = new TaskTreeProvider(deps);
  const view = vscode.window.createTreeView(TREE_VIEW_ID, { treeDataProvider: provider, showCollapseAll: true, manageCheckboxStateManually: true });
  context.subscriptions.push(provider, view);

  context.subscriptions.push(
    view.onDidChangeCheckboxState(async (e) => {
      // Bottom-up per file so line numbers stay valid when recurrence inserts lines (M3).
      const tasks = e.items.map(([node]) => node).filter(isTaskNode).map((n) => n.task).sort((a, b) => b.location.line - a.location.line);
      for (const task of tasks) {
        try {
          await deps.editService.toggle(task);
        } catch (err) {
          deps.log(`checkbox toggle failed: ${err instanceof Error ? err.message : String(err)}`);
          provider.refresh();
        }
      }
    }),
    vscode.commands.registerCommand('tasksmd.tree.refresh', () => provider.refresh()),
    vscode.commands.registerCommand('tasksmd.tree.groupBy', async () => {
      const picked = await vscode.window.showQuickPick(
        GROUP_MODES.map((m) => ({ label: t(GROUP_LABELS[m]), mode: m, picked: m === provider.grouping })),
        { placeHolder: t('Group tasks by…') },
      );
      if (picked) await provider.setGrouping(picked.mode);
    }),
    vscode.commands.registerCommand('tasksmd.tree.filter', async () => {
      const text = await vscode.window.showInputBox({
        prompt: t('Filter tasks by description or file path'),
        value: provider.filter,
        placeHolder: t('e.g. report'),
      });
      if (text !== undefined) provider.setFilter(text);
    }),
    vscode.commands.registerCommand('tasksmd.tree.clearFilter', () => provider.setFilter('')),
  );
  return provider;
}
