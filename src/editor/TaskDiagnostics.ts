import * as vscode from 'vscode';
import { type Clock, systemClock } from '../core/dates';
import { type TaskIndex, findDependencyCycle } from '../core/index';
import { isValidRecurrenceText } from '../core/recurrence';
import { DateField, type DateFieldName, type StatusRegistry, type Task, isTaskLine, parseTaskLine, serializeTask } from '../core/task';
import type { Settings } from '../settings/Settings';
import { t } from '../l10n';

const DEBOUNCE_MS = 300;
export const DIAG_SOURCE = 'Tasks';
export const CODE_INVALID_DATE = 'invalid-date';
export const CODE_UNKNOWN_DEPENDENCY = 'unknown-dependency';
export const CODE_RECURRING_WITHOUT_DATE = 'recurring-without-date';
export const CODE_INVALID_RECURRENCE = 'invalid-recurrence';
export const CODE_DEPENDENCY_CYCLE = 'dependency-cycle';
export const CODE_MISSING_DUE = 'missing-due-date';
export const CODE_UNCLOSED_FRONT_MATTER = 'unclosed-front-matter';

const DATE_FIELDS: DateFieldName[] = ['created', 'start', 'scheduled', 'due', 'done', 'cancelled'];
const DATE_LABEL: Record<DateFieldName, string> = { created: 'created', start: 'start', scheduled: 'scheduled', due: 'due', done: 'done', cancelled: 'cancelled' };

export interface DiagnosticsDeps {
  index: TaskIndex;
  settings: Settings;
  getStatusRegistry(): StatusRegistry;
  clock?: Clock;
}

/**
 * Problems-panel diagnostics for open markdown documents (FR-3.17): invalid dates, ⛔ ids that
 * no task carries, recurring tasks without any date. Recurrence-rule parsing and dependency
 * cycles are added in M3. Also provides the matching quick fixes.
 */
export class TaskDiagnostics implements vscode.CodeActionProvider, vscode.Disposable {
  static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
  private readonly collection = vscode.languages.createDiagnosticCollection('tasksmd');
  private readonly disposables: vscode.Disposable[] = [];
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly deps: DiagnosticsDeps) {
    this.disposables.push(
      this.collection,
      vscode.workspace.onDidOpenTextDocument((d) => this.schedule(d)),
      vscode.workspace.onDidChangeTextDocument((e) => this.schedule(e.document)),
      vscode.workspace.onDidCloseTextDocument((d) => this.collection.delete(d.uri)),
      deps.settings.onDidChange(() => this.refreshAll(), ['globalFilter', 'requireDueDate']),
    );
    const sub = deps.index.onDidChange(() => this.refreshAll());
    this.disposables.push({ dispose: () => sub.dispose() });
    this.refreshAll();
  }

  refreshAll(): void {
    for (const d of vscode.workspace.textDocuments) this.schedule(d);
  }

  private schedule(doc: vscode.TextDocument): void {
    if (doc.languageId !== 'markdown') return;
    const key = doc.uri.toString();
    clearTimeout(this.timers.get(key));
    this.timers.set(key, setTimeout(() => { this.timers.delete(key); this.analyse(doc); }, DEBOUNCE_MS));
  }

  analyse(doc: vscode.TextDocument): void {
    if (doc.isClosed) return;
    const diags: vscode.Diagnostic[] = [];
    const registry = this.deps.getStatusRegistry();
    const globalFilter = this.deps.settings.get('globalFilter') || undefined;
    // A lone `---` on the first line opens YAML front matter; without a closing `---` the built-in
    // Markdown preview treats the whole note as front matter and shows an empty page.
    if (doc.lineCount > 0 && doc.lineAt(0).text.trim() === '---') {
      let closed = false;
      for (let l = 1; l < doc.lineCount && !closed; l++) closed = /^(---|\.\.\.)\s*$/.test(doc.lineAt(l).text);
      if (!closed) {
        const d = new vscode.Diagnostic(doc.lineAt(0).range, t('Front matter is opened with "---" but never closed: the Markdown preview will show an empty page.'), vscode.DiagnosticSeverity.Warning);
        d.code = CODE_UNCLOSED_FRONT_MATTER;
        d.source = DIAG_SOURCE;
        diags.push(d);
      }
    }
    for (let line = 0; line < doc.lineCount; line++) {
      const text = doc.lineAt(line).text;
      if (!isTaskLine(text)) continue;
      const task = parseTaskLine(text, { statusRegistry: registry, globalFilter, location: { key: doc.uri.toString(), path: '', line, heading: null, frontmatterTags: [], depth: 0, parentLine: null } });
      if (!task) continue;
      for (const name of DATE_FIELDS) {
        const f = task[name];
        if (f && !f.valid) {
          const d = new vscode.Diagnostic(rangeOf(doc, line, f.raw), t('Invalid {0} date "{1}" — expected YYYY-MM-DD.', DATE_LABEL[name], f.raw), vscode.DiagnosticSeverity.Warning);
          d.code = CODE_INVALID_DATE;
          d.source = DIAG_SOURCE;
          diags.push(d);
        }
      }
      for (const id of task.dependsOn) {
        if (this.deps.index.byId(id).length === 0) {
          const d = new vscode.Diagnostic(rangeOf(doc, line, id), t('No task has the id "{0}".', id), vscode.DiagnosticSeverity.Warning);
          d.code = CODE_UNKNOWN_DEPENDENCY;
          d.source = DIAG_SOURCE;
          diags.push(d);
        }
      }
      if (this.deps.settings.get('requireDueDate') && !task.isCompleted && !task.due) {
        const d = new vscode.Diagnostic(rangeOf(doc, line, task.description || text.trim()), t('Open task without a due date (tasksmd.requireDueDate).'), vscode.DiagnosticSeverity.Warning);
        d.code = CODE_MISSING_DUE;
        d.source = DIAG_SOURCE;
        diags.push(d);
      }
      if (task.recurrenceText && !isValidRecurrenceText(task.recurrenceText)) {
        const d = new vscode.Diagnostic(rangeOf(doc, line, task.recurrenceText), t('Unrecognised recurrence rule "{0}". Examples: every day, every week on Monday, every month on the last.', task.recurrenceText), vscode.DiagnosticSeverity.Warning);
        d.code = CODE_INVALID_RECURRENCE;
        d.source = DIAG_SOURCE;
        diags.push(d);
      }
      if (task.id && task.dependsOn.length) {
        const cycle = findDependencyCycle(task, this.deps.index);
        if (cycle) {
          const d = new vscode.Diagnostic(rangeOf(doc, line, task.dependsOn.find((id) => cycle.includes(id)) ?? task.id), t('Circular dependency: {0}.', cycle.join(' → ')), vscode.DiagnosticSeverity.Error);
          d.code = CODE_DEPENDENCY_CYCLE;
          d.source = DIAG_SOURCE;
          diags.push(d);
        }
      }
      if (task.recurrenceText && !task.due && !task.scheduled && !task.start) {
        const d = new vscode.Diagnostic(rangeOf(doc, line, task.recurrenceText), t('A recurring task needs a due, scheduled or start date to repeat from.'), vscode.DiagnosticSeverity.Warning);
        d.code = CODE_RECURRING_WITHOUT_DATE;
        d.source = DIAG_SOURCE;
        diags.push(d);
      }
    }
    this.collection.set(doc.uri, diags);
  }

  provideCodeActions(doc: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    const registry = this.deps.getStatusRegistry();
    const format = this.deps.settings.get('taskFormat');
    for (const diag of context.diagnostics) {
      if (diag.source !== DIAG_SOURCE) continue;
      if (diag.code === CODE_UNCLOSED_FRONT_MATTER) {
        const a = new vscode.CodeAction(t('Remove the opening "---"'), vscode.CodeActionKind.QuickFix);
        a.diagnostics = [diag];
        a.isPreferred = true;
        a.edit = new vscode.WorkspaceEdit();
        a.edit.delete(doc.uri, doc.lineAt(0).rangeIncludingLineBreak);
        actions.push(a);
        continue;
      }
      const line = diag.range.start.line;
      const text = doc.lineAt(line).text;
      const task = parseTaskLine(text, { statusRegistry: registry });
      if (!task) continue;
      const replaceWith = (title: string, updated: Task, preferred = false) => {
        const a = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        a.diagnostics = [diag];
        a.isPreferred = preferred;
        a.edit = new vscode.WorkspaceEdit();
        a.edit.replace(doc.uri, doc.lineAt(line).range, serializeTask(updated, format));
        actions.push(a);
      };
      if (diag.code === CODE_INVALID_DATE) {
        const field = DATE_FIELDS.find((n) => task[n] && !task[n]!.valid && text.includes(task[n]!.raw));
        if (!field) continue;
        const today = (this.deps.clock ?? systemClock).now();
        replaceWith(t('Set {0} date to today ({1})', DATE_LABEL[field], today.format('YYYY-MM-DD')), task.with({ [field]: DateField.fromDate(today) }), true);
        replaceWith(t('Remove invalid {0} date', DATE_LABEL[field]), task.with({ [field]: null }));
      } else if (diag.code === CODE_UNKNOWN_DEPENDENCY) {
        const id = doc.getText(diag.range);
        replaceWith(t('Remove dependency on "{0}"', id), task.with({ dependsOn: task.dependsOn.filter((d) => d !== id) }), true);
      } else if (diag.code === CODE_DEPENDENCY_CYCLE) {
        const id = doc.getText(diag.range);
        if (task.dependsOn.includes(id)) replaceWith(t('Remove dependency on "{0}"', id), task.with({ dependsOn: task.dependsOn.filter((d) => d !== id) }), true);
      } else if (diag.code === CODE_INVALID_RECURRENCE) {
        replaceWith(t('Remove recurrence'), task.with({ recurrenceText: null }));
      } else if (diag.code === CODE_MISSING_DUE) {
        const today = (this.deps.clock ?? systemClock).now();
        const pick = new vscode.CodeAction(t('Set due date…'), vscode.CodeActionKind.QuickFix);
        pick.diagnostics = [diag];
        pick.isPreferred = true;
        pick.command = { command: 'tasksmd.setDueDate', title: t('Set due date…'), arguments: [{ key: doc.uri.toString(), line }] };
        actions.push(pick);
        replaceWith(t('Add due date today ({0})', today.format('YYYY-MM-DD')), task.with({ due: DateField.fromDate(today) }));
      } else if (diag.code === CODE_RECURRING_WITHOUT_DATE) {
        const today = (this.deps.clock ?? systemClock).now();
        replaceWith(t('Add due date today ({0})', today.format('YYYY-MM-DD')), task.with({ due: DateField.fromDate(today) }), true);
        replaceWith(t('Remove recurrence'), task.with({ recurrenceText: null }));
      }
    }
    return actions;
  }

  dispose(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    for (const d of this.disposables) d.dispose();
  }
}

function rangeOf(doc: vscode.TextDocument, line: number, needle: string): vscode.Range {
  const text = doc.lineAt(line).text;
  const idx = text.lastIndexOf(needle);
  if (idx < 0) return doc.lineAt(line).range;
  return new vscode.Range(line, idx, line, idx + needle.length);
}
