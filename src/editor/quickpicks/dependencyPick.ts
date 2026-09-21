import * as vscode from 'vscode';
import type { TaskIndex } from '../../core/index';
import type { Task } from '../../core/task';

interface DepItem extends vscode.QuickPickItem {
  task: Task;
}

/**
 * Multi-select picker over every other open task (fuzzy by description / path). Tasks without
 * an 🆔 are shown with a hint; the caller mints ids for the ones picked.
 */
export async function pickDependencies(index: TaskIndex, target: Task): Promise<Task[] | undefined> {
  const isSelf = (t: Task) => t.location.key === target.location.key && t.location.line === target.location.line;
  const candidates = index
    .all()
    .filter((t) => !isSelf(t) && !t.isCompleted)
    .sort((a, b) => a.location.path.localeCompare(b.location.path) || a.location.line - b.location.line);
  const items: DepItem[] = candidates.map((t) => ({
    label: t.description || vscode.l10n.t('(empty task)'),
    description: `${t.location.path}:${t.location.line + 1}`,
    detail: t.id ? `🆔 ${t.id}` : vscode.l10n.t('(an id will be generated)'),
    picked: !!t.id && target.dependsOn.includes(t.id),
    task: t,
  }));
  const picked = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    matchOnDescription: true,
    placeHolder: vscode.l10n.t('Tasks that must be finished before "{0}"', target.description.slice(0, 40)),
  });
  return picked?.map((i) => i.task);
}
