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

/** One button: `icon` is a codicon for CodeLens, `glyph` the plain-text stand-in for an inlay hint (which cannot draw codicons). */
interface TaskAction {
  label: string;
  icon?: string;
  glyph?: string;
  command: string;
  tooltip?: string;
}

/**
 * Clickable actions on task lines (FR-3.7 / FR-3.8):
 *   ✔ Done · ⏫ High ▾ · 📅 Sep 25 ▾ · 🔁 weekly ▾ · ✎ Edit
 * At the end of the line as inlay hints (`codeLens.position: lineEnd`, default since M30) or above it as
 * CodeLens (`above`). Mode `cursorLine` (default) shows them only for the line with the cursor, `all` for
 * every task line in view, `off` disables both.
 */
export class TaskCodeLensProvider implements vscode.CodeLensProvider, vscode.InlayHintsProvider, vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.changeEmitter.event;
  readonly onDidChangeInlayHints = this.changeEmitter.event;
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
      deps.settings.onDidChange(() => this.changeEmitter.fire(), ['codeLens.mode', 'codeLens.position', 'globalFilter']),
    );
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const out: vscode.CodeLens[] = this.queryBlockLenses(document);
    if (this.deps.settings.get('codeLens.position') !== 'above') return out;
    for (const { task, line, today } of this.taskLines(document)) {
      const range = new vscode.Range(line, 0, line, 0);
      for (const a of this.actionsFor(task, today)) {
        out.push(new vscode.CodeLens(range, { title: a.icon ? `$(${a.icon}) ${a.label}` : a.label, command: a.command, arguments: [task], tooltip: a.tooltip }));
      }
    }
    return out;
  }

  /**
   * The same buttons right after the end of the line (M30): CodeLens can only sit above it. One hint per button —
   * the editor cuts a hint off after `editor.inlayHints.maximumLength` (43) characters, which hid Edit.
   */
  provideInlayHints(document: vscode.TextDocument): vscode.InlayHint[] {
    if (this.deps.settings.get('codeLens.position') === 'above') return [];
    const out: vscode.InlayHint[] = [];
    for (const { task, line, today } of this.taskLines(document)) {
      const at = new vscode.Position(line, document.lineAt(line).text.length);
      for (const a of this.actionsFor(task, today)) {
        const part = new vscode.InlayHintLabelPart(a.glyph ? `${a.glyph} ${a.label}` : a.label);
        part.command = { title: a.label, command: a.command, arguments: [task] };
        // The editor runs an inlay hint's command on Cmd/Ctrl+click only (a plain click just places the cursor).
        part.tooltip = t('{0} ({1}+click)', a.tooltip ?? a.label, process.platform === 'darwin' ? 'Cmd' : 'Ctrl');
        const hint = new vscode.InlayHint(at, [part]);
        hint.paddingLeft = true;
        out.push(hint);
      }
    }
    return out;
  }

  /** Task lines that get buttons under the current mode, parsed. */
  private taskLines(document: vscode.TextDocument): { task: Task; line: number; today: import('dayjs').Dayjs }[] {
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
    const out: { task: Task; line: number; today: import('dayjs').Dayjs }[] = [];
    for (const line of lines) {
      if (line >= document.lineCount) continue;
      const text = document.lineAt(line).text;
      if (!isTaskLine(text)) continue;
      const task = parseTaskLine(text, { statusRegistry: registry, globalFilter, location: { key: document.uri.toString(), path: '', line, heading: null, frontmatterTags: [], depth: 0, parentLine: null } });
      if (task) out.push({ task, line, today });
    }
    return out;
  }

  /** "Show results · Explain" above every ```tasks fence — the way to see a query where the preview cannot render it. */
  private queryBlockLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    const out: vscode.CodeLens[] = [];
    const limit = Math.min(document.lineCount, 20000);
    for (let line = 0; line < limit; line++) {
      if (!/^\s*```tasks\b/.test(document.lineAt(line).text)) continue;
      const range = new vscode.Range(line, 0, line, 0);
      const ref = { uri: document.uri.toString(), line };
      out.push(
        new vscode.CodeLens(range, { title: `$(play) ${t('Show results')}`, command: 'tasksmd.runQueryAtCursor', arguments: [ref], tooltip: t('Open the results of this query in a panel beside the editor') }),
        new vscode.CodeLens(range, { title: `$(question) ${t('Explain')}`, command: 'tasksmd.explainQuery', arguments: [ref] }),
      );
    }
    return out;
  }

  private actionsFor(task: Task, today: import('dayjs').Dayjs): TaskAction[] {
    const out: TaskAction[] = [];
    out.push(
      task.isCompleted
        ? { label: t('Reopen'), icon: 'debug-restart', glyph: '↺', command: 'tasksmd.reopen' }
        : { label: t('Done'), icon: 'check', glyph: '✓', command: 'tasksmd.markDone', tooltip: t('Mark as done') },
    );
    if (!task.isCompleted) {
      const p = task.priority;
      out.push({ label: `${PRIORITY_EMOJI[p] ? PRIORITY_EMOJI[p] + ' ' : ''}${t(PRIORITY_LABEL[p])} ▾`, command: 'tasksmd.setPriority' });
      const dueTitle = task.due?.date
        ? `📅 ${task.due.date.format('MMM D')} · ${relativeText(describeRelative(task.due.date, today))} ▾`
        : `📅 ${t('Due')} ▾`;
      out.push({ label: dueTitle, command: 'tasksmd.setDueDate' });
      if (task.scheduled?.date) out.push({ label: `⏳ ${task.scheduled.date.format('MMM D')} ▾`, command: 'tasksmd.setScheduledDate' });
      if (task.recurrenceText) out.push({ label: `🔁 ${task.recurrenceText} ▾`, command: 'tasksmd.setRecurrence' });
      else if (task.due || task.scheduled || task.start) out.push({ label: `🔁 ${t('Repeat')} ▾`, command: 'tasksmd.setRecurrence' });
      if (task.due || task.scheduled) out.push({ label: t('Postpone'), icon: 'watch', glyph: '⏱', command: 'tasksmd.postpone' });
    }
    out.push({ label: t('Edit'), icon: 'edit', glyph: '✎', command: 'tasksmd.createOrEdit' });
    return out;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}
