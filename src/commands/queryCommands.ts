import * as vscode from 'vscode';
import type { Task } from '../core/task';
import type { QueryService } from '../services/QueryService';
import { displayDescription } from '../views/taskItem';
import { type CommandDeps, runEdit } from './registerCommands';

interface TaskPickItem extends vscode.QuickPickItem {
  task: Task;
}

/** Locate the ```tasks fence around the cursor: returns its body and the line range. */
export function queryBlockAt(doc: vscode.TextDocument, line: number): { text: string; start: number; end: number } | null {
  let start = -1;
  for (let l = line; l >= 0; l--) {
    const t = doc.lineAt(l).text.trim();
    if (/^```tasks\b/.test(t)) { start = l; break; }
    if (t === '```' && l !== line) return null;
  }
  if (start < 0) return null;
  for (let l = start + 1; l < doc.lineCount; l++) {
    if (doc.lineAt(l).text.trim() === '```') {
      return { text: doc.getText(new vscode.Range(start + 1, 0, l, 0)), start, end: l };
    }
  }
  return null;
}

export function registerQueryCommands(context: vscode.ExtensionContext, deps: CommandDeps & { queries: QueryService }): void {
  const explainOut = vscode.window.createOutputChannel('Tasks: Query explain');
  context.subscriptions.push(
    explainOut,
    // Fuzzy search across every open task (FR-5.12).
    vscode.commands.registerCommand('tasksmd.quickSearch', async () => {
      const result = deps.queries.run('not done');
      const items: TaskPickItem[] = result.root.tasks.map((task) => ({
        label: displayDescription(task, deps.settings),
        description: [task.due ? `📅 ${task.due.format()}` : '', task.priority !== '3' ? `p${task.priority}` : ''].filter(Boolean).join(' '),
        detail: `${task.location.path}:${task.location.line + 1}${task.location.heading ? ` › ${task.location.heading}` : ''}`,
        buttons: [
          { iconPath: new vscode.ThemeIcon('check'), tooltip: vscode.l10n.t('Mark as done') },
          { iconPath: new vscode.ThemeIcon('edit'), tooltip: vscode.l10n.t('Edit') },
        ],
        task,
      }));
      const qp = vscode.window.createQuickPick<TaskPickItem>();
      qp.items = items;
      qp.matchOnDescription = true;
      qp.matchOnDetail = true;
      qp.placeholder = vscode.l10n.t('Search {0} open tasks…', items.length);
      qp.onDidTriggerItemButton(async (e) => {
        qp.hide();
        if (e.button.tooltip === vscode.l10n.t('Edit')) await vscode.commands.executeCommand('tasksmd.createOrEdit', e.item.task);
        else await runEdit(deps, () => vscode.commands.executeCommand('tasksmd.markDone', e.item.task) as Promise<void>);
      });
      qp.onDidAccept(async () => {
        const sel = qp.selectedItems[0];
        qp.hide();
        if (sel) await vscode.commands.executeCommand('tasksmd.openTask', sel.task);
      });
      qp.onDidHide(() => qp.dispose());
      qp.show();
    }),
    vscode.commands.registerCommand('tasksmd.insertQueryBlock', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        void vscode.window.showInformationMessage(vscode.l10n.t('Open a Markdown file to insert a query block.'));
        return;
      }
      const snippet = new vscode.SnippetString('```tasks\n${1:not done}\n${2:due before next week}\n${3:sort by urgency}\n```\n');
      await editor.insertSnippet(snippet);
    }),
    vscode.commands.registerCommand('tasksmd.explainQuery', async () => {
      const editor = vscode.window.activeTextEditor;
      const block = editor ? queryBlockAt(editor.document, editor.selection.active.line) : null;
      if (!block) {
        void vscode.window.showInformationMessage(vscode.l10n.t('Place the cursor inside a ```tasks block.'));
        return;
      }
      const source = { path: vscode.workspace.asRelativePath(editor!.document.uri) };
      const result = deps.queries.run(block.text, source);
      explainOut.clear();
      explainOut.appendLine(block.text.trimEnd());
      explainOut.appendLine('\n---\n');
      explainOut.appendLine(deps.queries.explain(block.text, source));
      explainOut.appendLine('');
      explainOut.appendLine(vscode.l10n.t('{0} tasks match, {1} shown.', result.matched, result.shown));
      for (const e of result.runtimeErrors) explainOut.appendLine(`⚠ ${e}`);
      explainOut.show(true);
    }),
  );
}
