import * as vscode from 'vscode';
import { describeRelative, type Clock, systemClock } from '../core/dates';
import type { TaskIndex } from '../core/index';
import { StatusType, type StatusRegistry, type Task, isTaskLine, parseTaskLine } from '../core/task';
import { isBlocked } from '../core/views';
import type { Settings } from '../settings/Settings';
import { fieldsStartOffset } from './lineFields';
import { overdueText, relativeText } from './relativeText';

const DEBOUNCE_MS = 100;
const RANGE_PADDING = 50;

export interface DecorationDeps {
  index: TaskIndex;
  settings: Settings;
  getStatusRegistry(): StatusRegistry;
  clock?: Clock;
}

function gutterIcon(svg: string): vscode.Uri {
  return vscode.Uri.parse(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
}
const ICON = {
  todo: gutterIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" fill="none" stroke="#8a8a8a" stroke-width="1.5"/></svg>'),
  inProgress: gutterIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" fill="none" stroke="#3b82f6" stroke-width="1.5"/><path d="M8 3a5 5 0 0 1 0 10z" fill="#3b82f6"/></svg>'),
  onHold: gutterIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" fill="none" stroke="#d97706" stroke-width="1.5"/><rect x="6" y="5.5" width="1.5" height="5" fill="#d97706"/><rect x="8.5" y="5.5" width="1.5" height="5" fill="#d97706"/></svg>'),
  done: gutterIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5.5" fill="#16a34a"/><path d="M5.2 8.2l1.9 1.9 3.8-4" fill="none" stroke="#fff" stroke-width="1.6"/></svg>'),
  cancelled: gutterIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="5" fill="none" stroke="#8a8a8a" stroke-width="1.5"/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#8a8a8a" stroke-width="1.5"/></svg>'),
};

/**
 * Editor decorations for task lines (FR-3.1 ~ FR-3.6): relative-date hints after the line,
 * overdue / due-today backgrounds, dimmed completed tasks, dimmed metadata, gutter status icons.
 * Lines are parsed straight from the document so hints are exact while typing.
 */
export class TaskDecorations implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly overdue = vscode.window.createTextEditorDecorationType({ isWholeLine: true, backgroundColor: new vscode.ThemeColor('tasksmd.overdueBackground'), overviewRulerColor: new vscode.ThemeColor('tasksmd.overdueBackground'), overviewRulerLane: vscode.OverviewRulerLane.Right });
  private readonly dueToday = vscode.window.createTextEditorDecorationType({ isWholeLine: true, backgroundColor: new vscode.ThemeColor('tasksmd.dueTodayBackground') });
  private readonly completed = vscode.window.createTextEditorDecorationType({ opacity: '0.6', textDecoration: 'line-through' });
  private readonly fields = vscode.window.createTextEditorDecorationType({ color: new vscode.ThemeColor('tasksmd.fieldForeground') });
  private readonly hint = vscode.window.createTextEditorDecorationType({ after: { color: new vscode.ThemeColor('tasksmd.hintForeground'), fontStyle: 'italic', margin: '0 0 0 1.5em' } });
  private readonly gutter: Record<keyof typeof ICON, vscode.TextEditorDecorationType> = {
    todo: vscode.window.createTextEditorDecorationType({ gutterIconPath: ICON.todo, gutterIconSize: '70%' }),
    inProgress: vscode.window.createTextEditorDecorationType({ gutterIconPath: ICON.inProgress, gutterIconSize: '70%' }),
    onHold: vscode.window.createTextEditorDecorationType({ gutterIconPath: ICON.onHold, gutterIconSize: '70%' }),
    done: vscode.window.createTextEditorDecorationType({ gutterIconPath: ICON.done, gutterIconSize: '70%' }),
    cancelled: vscode.window.createTextEditorDecorationType({ gutterIconPath: ICON.cancelled, gutterIconSize: '70%' }),
  };

  constructor(private readonly deps: DecorationDeps) {
    this.disposables.push(
      this.overdue, this.dueToday, this.completed, this.fields, this.hint, ...Object.values(this.gutter),
      vscode.window.onDidChangeActiveTextEditor(() => this.refreshAll()),
      vscode.window.onDidChangeVisibleTextEditors(() => this.refreshAll()),
      vscode.window.onDidChangeTextEditorVisibleRanges((e) => this.schedule(e.textEditor)),
      vscode.workspace.onDidChangeTextDocument((e) => {
        for (const ed of vscode.window.visibleTextEditors) if (ed.document === e.document) this.schedule(ed);
      }),
      deps.settings.onDidChange(() => this.refreshAll()),
    );
    const sub = deps.index.onDidChange(() => this.refreshAll());
    this.disposables.push({ dispose: () => sub.dispose() });
    this.refreshAll();
  }

  refreshAll(): void {
    for (const ed of vscode.window.visibleTextEditors) this.schedule(ed);
  }

  private schedule(editor: vscode.TextEditor): void {
    if (editor.document.languageId !== 'markdown') return;
    const key = editor.document.uri.toString() + editor.viewColumn;
    clearTimeout(this.timers.get(key));
    this.timers.set(key, setTimeout(() => { this.timers.delete(key); this.apply(editor); }, DEBOUNCE_MS));
  }

  apply(editor: vscode.TextEditor): void {
    const s = this.deps.settings;
    const doc = editor.document;
    if (doc.languageId !== 'markdown' || doc.isClosed) return;
    const today = (this.deps.clock ?? systemClock).now().startOf('day');
    const registry = this.deps.getStatusRegistry();
    const globalFilter = s.get('globalFilter') || undefined;

    const overdue: vscode.Range[] = [], dueToday: vscode.Range[] = [], completed: vscode.Range[] = [], fields: vscode.Range[] = [];
    const hints: vscode.DecorationOptions[] = [];
    const gutter: Record<keyof typeof ICON, vscode.Range[]> = { todo: [], inProgress: [], onHold: [], done: [], cancelled: [] };

    const lines = new Set<number>();
    for (const r of editor.visibleRanges) {
      for (let l = Math.max(0, r.start.line - RANGE_PADDING); l <= Math.min(doc.lineCount - 1, r.end.line + RANGE_PADDING); l++) lines.add(l);
    }
    for (const line of lines) {
      const text = doc.lineAt(line).text;
      if (!isTaskLine(text)) continue;
      const task = parseTaskLine(text, { statusRegistry: registry, globalFilter, location: { key: doc.uri.toString(), path: '', line, heading: null, frontmatterTags: [], depth: 0, parentLine: null } });
      if (!task) continue;
      const range = doc.lineAt(line).range;
      const endRange = new vscode.Range(range.end, range.end);

      if (s.get('decorations.gutterIcons')) gutter[gutterKind(task)].push(range);
      if (task.isCompleted) {
        if (s.get('decorations.strikeDone')) completed.push(range);
      } else {
        if (s.get('decorations.overdueHighlight') && task.due?.date) {
          if (task.due.date.isBefore(today)) overdue.push(range);
          else if (task.due.date.isSame(today, 'day')) dueToday.push(range);
        }
        if (s.get('decorations.relativeDates')) {
          const hint = this.hintFor(task, today);
          if (hint) hints.push({ range: endRange, renderOptions: { after: { contentText: hint } } });
        }
      }
      if (s.get('decorations.dimFields')) {
        const off = fieldsStartOffset(text, task);
        if (off !== null) fields.push(new vscode.Range(line, off, line, range.end.character));
      }
    }

    editor.setDecorations(this.overdue, overdue);
    editor.setDecorations(this.dueToday, dueToday);
    editor.setDecorations(this.completed, completed);
    editor.setDecorations(this.fields, fields);
    editor.setDecorations(this.hint, hints);
    for (const k of Object.keys(gutter) as (keyof typeof ICON)[]) editor.setDecorations(this.gutter[k], gutter[k]);
  }

  private hintFor(task: Task, today: import('dayjs').Dayjs): string | null {
    const parts: string[] = [];
    if (task.due?.date) {
      const rel = describeRelative(task.due.date, today);
      parts.push(task.due.date.isBefore(today) ? `⚠ ${overdueText(rel)}` : `📅 ${relativeText(rel)}`);
    } else if (task.scheduled?.date) {
      parts.push(`⏳ ${relativeText(describeRelative(task.scheduled.date, today))}`);
    } else if (task.start?.date && task.start.date.isAfter(today)) {
      parts.push(`🛫 ${relativeText(describeRelative(task.start.date, today))}`);
    }
    if (task.dependsOn.length && isBlocked(task, this.deps.index)) {
      const n = task.dependsOn.filter((id) => this.deps.index.byId(id).some((t) => !t.isCompleted)).length;
      parts.push(`⛔ ${vscode.l10n.t('blocked ({0})', n)}`);
    }
    for (const f of [task.due, task.scheduled, task.start, task.created, task.done, task.cancelled]) {
      if (f && !f.valid) { parts.push(`⚠ ${vscode.l10n.t('invalid date')}`); break; }
    }
    return parts.length ? parts.join('  ') : null;
  }

  dispose(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    for (const d of this.disposables) d.dispose();
  }
}

function gutterKind(task: Task): keyof typeof ICON {
  switch (task.status.type) {
    case StatusType.DONE: return 'done';
    case StatusType.CANCELLED: return 'cancelled';
    case StatusType.IN_PROGRESS: return 'inProgress';
    case StatusType.ON_HOLD: return 'onHold';
    default: return 'todo';
  }
}
