import * as vscode from 'vscode';
import type { Task } from '../core/task';
import type { QueryService } from '../services/QueryService';
import { displayDescription } from '../views/taskItem';
import { type CommandDeps, runEdit } from './registerCommands';
import { recentMarkdownEditor } from './recentMarkdown';
import { t } from '../l10n';

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

/** Argument CodeLenses pass to the query commands: the note and a line inside (or on) the fence. */
export interface QueryBlockRef {
  uri: string;
  line: number;
}

export interface QueryTarget {
  text: string;
  source: string;
  label: string;
}

/** The ```tasks block a command should act on: from an explicit ref (CodeLens) or the cursor. */
export function resolveQueryBlock(arg: unknown): { doc: vscode.TextDocument; block: NonNullable<ReturnType<typeof queryBlockAt>> } | null {
  const ref = arg && typeof arg === 'object' && 'uri' in arg && 'line' in arg ? (arg as QueryBlockRef) : null;
  const doc = ref ? vscode.workspace.textDocuments.find((d) => d.uri.toString() === ref.uri) : vscode.window.activeTextEditor?.document;
  const line = ref ? ref.line : vscode.window.activeTextEditor?.selection.active.line;
  if (!doc || line === undefined) return null;
  const block = queryBlockAt(doc, line);
  return block ? { doc, block } : null;
}

export function queryTargetFor(doc: vscode.TextDocument, block: { text: string; start: number }): QueryTarget {
  const source = vscode.workspace.asRelativePath(doc.uri);
  return { text: block.text, source, label: `${source}:${block.start + 1}` };
}

export function registerQueryCommands(context: vscode.ExtensionContext, deps: CommandDeps & { queries: QueryService; openQueryResults: (target: QueryTarget | null) => void }): void {
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
          { iconPath: new vscode.ThemeIcon('check'), tooltip: t('Mark as done') },
          { iconPath: new vscode.ThemeIcon('edit'), tooltip: t('Edit') },
        ],
        task,
      }));
      const qp = vscode.window.createQuickPick<TaskPickItem>();
      qp.items = items;
      qp.matchOnDescription = true;
      qp.matchOnDetail = true;
      qp.placeholder = t('Search {0} open tasks…', items.length);
      qp.onDidTriggerItemButton(async (e) => {
        qp.hide();
        if (e.button.tooltip === t('Edit')) await vscode.commands.executeCommand('tasksmd.createOrEdit', e.item.task);
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
      // From the walkthrough or palette the active tab may not be the note (incident #28).
      let editor = await recentMarkdownEditor();
      if (!editor) {
        // No note at all yet: open a small sample so the block has something to show.
        const today = new Date();
        const iso = (d: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + d).toLocaleDateString('sv-SE');
        const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: `${t('# My tasks')}\n\n- [ ] ${t('Call the bank')} 📅 ${iso(0)}\n- [ ] ${t('Write the report')} ⏫ 📅 ${iso(2)}\n- [ ] ${t('Plan the trip')} 📅 ${iso(9)}\n\n` });
        editor = await vscode.window.showTextDocument(doc);
        const end = doc.lineAt(doc.lineCount - 1).range.end;
        editor.selection = new vscode.Selection(end, end);
      }
      const snippet = new vscode.SnippetString('```tasks\n${1:not done}\n${2:due before next week}\n${3:sort by urgency}\n```\n');
      await editor.insertSnippet(snippet);
    }),
    // Live results of the block under the cursor, in a panel beside the editor (works where the
    // preview cannot render, e.g. Cursor's WYSIWYG mode).
    vscode.commands.registerCommand('tasksmd.runQueryAtCursor', (arg?: unknown) => {
      const found = resolveQueryBlock(arg);
      if (!found) void vscode.window.showInformationMessage(t('Place the cursor inside a ```tasks block.'));
      deps.openQueryResults(found ? queryTargetFor(found.doc, found.block) : null);
    }),
    vscode.commands.registerCommand('tasksmd.explainQuery', async (arg?: unknown) => {
      const found = resolveQueryBlock(arg);
      if (!found) {
        void vscode.window.showInformationMessage(t('Place the cursor inside a ```tasks block.'));
        return;
      }
      const { block } = found;
      const source = { path: vscode.workspace.asRelativePath(found.doc.uri) };
      const result = deps.queries.run(block.text, source);
      explainOut.clear();
      explainOut.appendLine(block.text.trimEnd());
      explainOut.appendLine('\n---\n');
      explainOut.appendLine(deps.queries.explain(block.text, source));
      explainOut.appendLine('');
      explainOut.appendLine(t('{0} tasks match, {1} shown.', result.matched, result.shown));
      for (const e of result.runtimeErrors) explainOut.appendLine(`⚠ ${e}`);
      explainOut.show(true);
    }),
  );
}
