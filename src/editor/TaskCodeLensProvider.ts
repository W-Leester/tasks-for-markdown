import * as vscode from 'vscode';
import { describeRelative, systemClock, type Clock } from '../core/dates';
import { PRIORITY_EMOJI, Priority, type StatusRegistry, type Task, isTaskLine, parseTaskLine } from '../core/task';
import type { Settings } from '../settings/Settings';
import { relativeText } from './relativeText';
import { t } from '../l10n';

export interface CodeLensDeps {
  settings: Settings;
  getStatusRegistry(): StatusRegistry;
  clock?: Clock;
}

const PRIORITY_LABEL: Record<Priority, string> = {
  [Priority.Highest]: 'Highest',
  [Priority.High]: 'High',
  [Priority.Medium]: 'Medium',
  [Priority.None]: 'Priority',
  [Priority.Low]: 'Low',
  [Priority.Lowest]: 'Lowest',
};

/**
 * Clickable actions above task lines (FR-3.7 / FR-3.8):
 *   ✔ Done · ⏫ High ▾ · 📅 Sep 25 ▾ · 🔁 weekly ▾ · ✎ Edit
 * Mode `cursorLine` (default) shows lenses only for the line with the cursor, `all` for every
 * task line in view, `off` disables the provider's output.
 */
export class TaskCodeLensProvider implements vscode.CodeLensProvider, vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.changeEmitter.event;
  private readonly disposables: vscode.Disposable[] = [];
  private lastCursorLine = -1;

  constructor(private readonly deps: CodeLensDeps) {
    this.disposables.push(
      this.changeEmitter,
      vscode.window.onDidChangeTextEditorSelection((e) => {
        if (this.deps.settings.get('codeLens.mode') !== 'cursorLine') return;
        const line = e.textEditor.selection.active.line;
        if (line !== this.lastCursorLine) {
          this.lastCursorLine = line;
          this.changeEmitter.fire();
        }
      }),
      deps.settings.onDidChange(() => this.changeEmitter.fire(), ['codeLens.mode', 'globalFilter']),
    );
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const mode = this.deps.settings.get('codeLens.mode');
    if (mode === 'off') return [];
    const editor = vscode.window.visibleTextEditors.find((e) => e.document === document);
    let lines: number[];
    if (mode === 'cursorLine') {
      if (!editor || vscode.window.activeTextEditor !== editor) return [];
      lines = [...new Set(editor.selections.map((s) => s.active.line))];
    } else {
      lines = [];
      const ranges = editor?.visibleRanges ?? [new vscode.Range(0, 0, Math.min(document.lineCount - 1, 200), 0)];
      for (const r of ranges) for (let l = r.start.line; l <= r.end.line; l++) lines.push(l);
    }

    const registry = this.deps.getStatusRegistry();
    const globalFilter = this.deps.settings.get('globalFilter') || undefined;
    const today = (this.deps.clock ?? systemClock).now().startOf('day');
    const out: vscode.CodeLens[] = [];
    for (const line of lines) {
      if (line >= document.lineCount) continue;
      const text = document.lineAt(line).text;
      if (!isTaskLine(text)) continue;
      const task = parseTaskLine(text, { statusRegistry: registry, globalFilter, location: { key: document.uri.toString(), path: '', line, heading: null, frontmatterTags: [], depth: 0, parentLine: null } });
      if (!task) continue;
      const range = new vscode.Range(line, 0, line, 0);
      out.push(...this.lensesFor(task, range, today));
    }
    return out;
  }

  private lensesFor(task: Task, range: vscode.Range, today: import('dayjs').Dayjs): vscode.CodeLens[] {
    const lens = (title: string, command: string, tooltip?: string) => new vscode.CodeLens(range, { title, command, arguments: [task], tooltip });
    const out: vscode.CodeLens[] = [];
    out.push(
      task.isCompleted
        ? lens(`$(debug-restart) ${t('Reopen')}`, 'tasksmd.reopen')
        : lens(`$(check) ${t('Done')}`, 'tasksmd.markDone', t('Mark as done')),
    );
    if (!task.isCompleted) {
      const p = task.priority;
      out.push(lens(`${PRIORITY_EMOJI[p] ? PRIORITY_EMOJI[p] + ' ' : ''}${t(PRIORITY_LABEL[p])} ▾`, 'tasksmd.setPriority'));
      const dueTitle = task.due?.date
        ? `📅 ${task.due.date.format('MMM D')} · ${relativeText(describeRelative(task.due.date, today))} ▾`
        : `📅 ${t('Due')} ▾`;
      out.push(lens(dueTitle, 'tasksmd.setDueDate'));
      if (task.scheduled?.date) out.push(lens(`⏳ ${task.scheduled.date.format('MMM D')} ▾`, 'tasksmd.setScheduledDate'));
      if (task.recurrenceText) out.push(lens(`🔁 ${task.recurrenceText} ▾`, 'tasksmd.setRecurrence'));
      else if (task.due || task.scheduled || task.start) out.push(lens(`🔁 ${t('Repeat')} ▾`, 'tasksmd.setRecurrence'));
      if (task.due || task.scheduled) out.push(lens(`$(watch) ${t('Postpone')}`, 'tasksmd.postpone'));
    }
    out.push(lens(`$(edit) ${t('Edit')}`, 'tasksmd.createOrEdit'));
    return out;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
