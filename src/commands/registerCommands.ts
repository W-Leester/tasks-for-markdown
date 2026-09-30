import * as vscode from 'vscode';
import type { TaskIndex } from '../core/index';
import { type StatusRegistry, StatusType, Task, isTaskLine, parseTaskLine } from '../core/task';
import type { IndexService } from '../index/IndexService';
import type { Settings } from '../settings/Settings';
import { StaleLineError, type TaskEditService } from '../services/TaskEditService';
import { t } from '../l10n';

export const VIEW_CONTAINER_ID = 'tasksmd';

export interface CommandDeps {
  index: TaskIndex;
  indexService: IndexService;
  editService: TaskEditService;
  settings: Settings;
  getStatusRegistry(): StatusRegistry;
  log(message: string): void;
}

/**
 * Tasks under the cursor(s) of the active editor, parsed straight from the document text so
 * the result is exact even before the debounced index update lands.
 */
export function tasksAtCursors(editor: vscode.TextEditor, deps: Pick<CommandDeps, 'indexService' | 'settings' | 'getStatusRegistry'>): Task[] {
  const doc = editor.document;
  const lines = new Set<number>();
  for (const sel of editor.selections) for (let l = sel.start.line; l <= sel.end.line; l++) lines.add(l);
  const out: Task[] = [];
  for (const line of [...lines].sort((a, b) => a - b)) {
    if (line >= doc.lineCount) continue;
    const text = doc.lineAt(line).text;
    if (!isTaskLine(text)) continue;
    const indexed = deps.indexService.index.taskAt(doc.uri.toString(), line);
    if (indexed && indexed.originalMarkdown === text) {
      out.push(indexed);
      continue;
    }
    const task = parseTaskLine(text, {
      statusRegistry: deps.getStatusRegistry(),
      globalFilter: deps.settings.get('globalFilter') || undefined,
      location: { key: doc.uri.toString(), path: deps.indexService.displayPath(doc.uri), line, heading: null, frontmatterTags: [], depth: 0, parentLine: null },
    });
    if (task) out.push(task);
  }
  return out;
}

/** Resolve the command argument: a Task (from a tree/menu) or the editor cursor. */
export function resolveTargetTasks(arg: unknown, deps: CommandDeps): Task[] {
  if (arg instanceof Task) return [arg];
  // { key, line } reference from a hover/markdown command link.
  if (arg && typeof arg === 'object' && typeof (arg as { key?: unknown }).key === 'string' && typeof (arg as { line?: unknown }).line === 'number') {
    const { key, line } = arg as { key: string; line: number };
    const found = deps.index.taskAt(key, line);
    if (found) return [found];
    const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === key);
    if (doc && line < doc.lineCount) {
      const t = parseTaskLine(doc.lineAt(line).text, {
        statusRegistry: deps.getStatusRegistry(),
        globalFilter: deps.settings.get('globalFilter') || undefined,
        location: { key, path: deps.indexService.displayPath(doc.uri), line, heading: null, frontmatterTags: [], depth: 0, parentLine: null },
      });
      if (t) return [t];
    }
    return [];
  }
  if (arg && typeof arg === 'object' && 'task' in arg && (arg as { task: unknown }).task instanceof Task) {
    return [(arg as { task: Task }).task];
  }
  const editor = vscode.window.activeTextEditor;
  return editor ? tasksAtCursors(editor, deps) : [];
}

export async function runEdit(deps: CommandDeps, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (err) {
    if (err instanceof StaleLineError) {
      void vscode.window.showWarningMessage(t('The file changed since it was indexed; it has been re-read. Please try again.'));
      return;
    }
    deps.log(`command failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    void vscode.window.showErrorMessage(t('Tasks: {0}', err instanceof Error ? err.message : String(err)));
  }
}

export function registerCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  const register = (id: string, handler: (...args: unknown[]) => unknown) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));

  register('tasksmd.reindex', () => deps.indexService.rescan());

  register('tasksmd.toggleDone', (arg) =>
    runEdit(deps, async () => {
      const targets = resolveTargetTasks(arg, deps);
      if (!targets.length) {
        void vscode.window.showInformationMessage(t('Place the cursor on a task line (e.g. "- [ ] …") first.'));
        return;
      }
      // Bottom-up so inserted lines (recurrence, M3) never shift lines still to be edited.
      for (const task of [...targets].sort((a, b) => b.location.line - a.location.line)) {
        await deps.editService.toggle(task);
      }
    }),
  );

  // Cmd/Ctrl+Enter: toggle on task lines; anywhere else give the key back — Markdown All in One's
  // Ctrl+Enter action when it is installed (it binds the same key), else the editor default (insert
  // line below). Decided from the editor at key-press time, not from the tasksmd.onTaskLine context
  // key, which lost to Markdown All in One in Cursor.
  register('tasksmd.enterKey', async () => {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document.languageId === 'markdown' && tasksAtCursors(editor, deps).length) {
      await vscode.commands.executeCommand('tasksmd.toggleDone');
      return;
    }
    const markdownAllInOne = vscode.extensions.getExtension('yzhang.markdown-all-in-one');
    await vscode.commands.executeCommand(markdownAllInOne ? 'markdown.extension.onCtrlEnterKey' : 'editor.action.insertLineAfter');
  });

  const setStatusOfType = (type: StatusType) => (arg: unknown) =>
    runEdit(deps, async () => {
      const status = deps.getStatusRegistry().firstOfType(type);
      if (!status) {
        void vscode.window.showWarningMessage(t('No status of type {0} is configured.', type));
        return;
      }
      const targets = resolveTargetTasks(arg, deps);
      for (const task of [...targets].sort((a, b) => b.location.line - a.location.line)) {
        if (task.status.type !== type) await deps.editService.setStatus(task, status);
      }
    });
  register('tasksmd.markDone', setStatusOfType(StatusType.DONE));
  register('tasksmd.markCancelled', setStatusOfType(StatusType.CANCELLED));
  register('tasksmd.reopen', setStatusOfType(StatusType.TODO));

  register('tasksmd.openSidebar', () => vscode.commands.executeCommand(`workbench.view.extension.${VIEW_CONTAINER_ID}`));

  register('tasksmd.openTask', async (arg) => {
    const [task] = resolveTargetTasks(arg, deps);
    if (!task) return;
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(task.location.key));
    const editor = await vscode.window.showTextDocument(doc, { preserveFocus: false });
    const line = Math.min(task.location.line, doc.lineCount - 1);
    const range = doc.lineAt(line).range;
    editor.selection = new vscode.Selection(range.end, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
  });
}
