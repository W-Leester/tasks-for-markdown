import * as vscode from 'vscode';
import { type TaskFormat, isTaskLine, parseTaskLine, serializeTask } from '../core/task';
import type { CommandDeps } from './registerCommands';
import { t } from '../l10n';

/** Rewrite every task line of the active document in the chosen format (emoji <-> dataview). */
export function registerConvertCommand(context: vscode.ExtensionContext, deps: CommandDeps): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('tasksmd.convertFormat', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        void vscode.window.showInformationMessage(t('Open a Markdown file first.'));
        return;
      }
      const picked = await vscode.window.showQuickPick(
        [
          { label: '📅 ' + t('Emoji format'), description: '📅 2026-09-25 ⏫ 🔁 every week', format: 'emoji' as TaskFormat },
          { label: '[::] ' + t('Dataview format'), description: '[due:: 2026-09-25] [priority:: high]', format: 'dataview' as TaskFormat },
        ],
        { placeHolder: t('Convert all task lines in this file to…') },
      );
      if (!picked) return;
      const doc = editor.document;
      const registry = deps.getStatusRegistry();
      const edit = new vscode.WorkspaceEdit();
      let changed = 0;
      let inFence = false;
      for (let l = 0; l < doc.lineCount; l++) {
        const text = doc.lineAt(l).text;
        if (/^\s*(```|~~~)/.test(text)) inFence = !inFence;
        if (inFence || !isTaskLine(text)) continue;
        const task = parseTaskLine(text, { statusRegistry: registry });
        if (!task) continue;
        const out = serializeTask(task, picked.format);
        if (out !== text) {
          edit.replace(doc.uri, doc.lineAt(l).range, out);
          changed++;
        }
      }
      if (changed) await vscode.workspace.applyEdit(edit);
      void vscode.window.showInformationMessage(t('Converted {0} task lines.', changed));
    }),
  );
}
