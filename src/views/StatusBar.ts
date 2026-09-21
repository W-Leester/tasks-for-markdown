import * as vscode from 'vscode';
import { dayjs } from '../core/dates/dayjs';
import type { TaskIndex } from '../core/index';
import { runSmartView } from '../core/views';

const UPDATE_DEBOUNCE_MS = 250;

/**
 * `$(checklist) 57 · today 4 · overdue 2` — click opens the sidebar. While scanning it shows
 * progress; skipped (too large) files add a warning icon and are listed in the tooltip (FR-2.6).
 */
export class StatusBar implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;
  private readonly disposables: vscode.Disposable[] = [];
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly index: TaskIndex) {
    this.item = vscode.window.createStatusBarItem('tasksmd.status', vscode.StatusBarAlignment.Left, 50);
    this.item.name = 'Tasks for Markdown';
    this.item.command = 'tasksmd.openSidebar';
    const s1 = index.onDidChange(() => this.schedule());
    const s2 = index.onDidChangeProgress(() => this.render());
    this.disposables.push({ dispose: () => s1.dispose() }, { dispose: () => s2.dispose() }, this.item);
    this.render();
    this.item.show();
  }

  private schedule(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.render(), UPDATE_DEBOUNCE_MS);
  }

  render(): void {
    const p = this.index.progress;
    if (p.state === 'scanning') {
      this.item.text = p.total ? `$(sync~spin) Tasks ${p.done}/${p.total}` : '$(sync~spin) Tasks';
      this.item.tooltip = vscode.l10n.t('Indexing tasks…');
      this.item.backgroundColor = undefined;
      return;
    }
    const ctx = { index: this.index, today: dayjs() };
    const open = runSmartView('open', ctx).length;
    const today = runSmartView('today', ctx).length;
    const overdue = runSmartView('overdue', ctx).length;
    const skipped = this.index.skippedFiles();

    const parts = [`$(checklist) ${open}`];
    if (today) parts.push(vscode.l10n.t('today {0}', today));
    if (overdue) parts.push(vscode.l10n.t('overdue {0}', overdue));
    if (skipped.length) parts.push('$(warning)');
    this.item.text = parts.join(' · ');

    const md = new vscode.MarkdownString();
    md.appendMarkdown(vscode.l10n.t('**Tasks for Markdown** — {0} files, {1} tasks', this.index.fileCount(), this.index.taskCount()) + '\n\n');
    md.appendMarkdown(`- ${vscode.l10n.t('Open')}: ${open}\n- ${vscode.l10n.t('Today')}: ${today}\n- ${vscode.l10n.t('Overdue')}: ${overdue}\n`);
    if (skipped.length) {
      md.appendMarkdown('\n' + vscode.l10n.t('Skipped (larger than tasksmd.maxFileSizeKB):') + '\n');
      for (const f of skipped.slice(0, 10)) md.appendMarkdown(`- ${f.path} (${f.sizeKB} KB)\n`);
      if (skipped.length > 10) md.appendMarkdown(`- … +${skipped.length - 10}\n`);
    }
    md.appendMarkdown('\n' + vscode.l10n.t('Click to open the Tasks sidebar.'));
    this.item.tooltip = md;
    this.item.backgroundColor = overdue ? new vscode.ThemeColor('statusBarItem.warningBackground') : undefined;
  }

  dispose(): void {
    clearTimeout(this.timer);
    for (const d of this.disposables) d.dispose();
  }
}
