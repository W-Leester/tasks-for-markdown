import * as vscode from 'vscode';
import { dayjs, type Dayjs } from '../core/dates/dayjs';
import { StatusType, type StatusRegistry, type Status, type Task, type TaskFields, applyStatusChange, generateTaskId, serializeTask } from '../core/task';
import type { TaskIndex } from '../core/index';
import { cleanNoteTexts, noteBlock } from '../core/file';
import { t } from '../l10n';
import type { IndexService } from '../index/IndexService';
import type { Settings } from '../settings/Settings';

export class StaleLineError extends Error {
  constructor(
    readonly uri: vscode.Uri,
    readonly line: number,
    readonly expected: string,
    readonly actual: string,
  ) {
    super(`Line ${line + 1} of ${uri.fsPath} changed since it was indexed`);
  }
}

export interface TaskEditDeps {
  settings: Settings;
  indexService: IndexService;
  index: TaskIndex;
  getStatusRegistry(): StatusRegistry;
  /** Injectable clock for tests. */
  today?: () => Dayjs;
}

export interface StatusChangeEvent {
  before: Task;
  after: Task;
  /** New occurrences written next to the task (recurrence). */
  created: Task[];
  deleted: boolean;
}

export interface LineInsert {
  position: 'above' | 'below';
  lines: string[];
}

/**
 * The only place that writes task lines to files (D§3.1). Every write re-checks that the target
 * line still matches the indexed text (NFR-3) and goes through a WorkspaceEdit so that Undo works
 * in open editors. Files that were not open are saved after the edit so they don't linger dirty.
 */
export class TaskEditService {
  private readonly statusListeners = new Set<(e: StatusChangeEvent) => void>();

  constructor(private readonly deps: TaskEditDeps) {}

  /** Fires after every status change written by this service (UI, commands and the public API alike). */
  onDidSetStatus(listener: (e: StatusChangeEvent) => void): { dispose(): void } {
    this.statusListeners.add(listener);
    return { dispose: () => this.statusListeners.delete(listener) };
  }

  private today(): Dayjs {
    return (this.deps.today ?? (() => dayjs()))();
  }

  /** Move the task to its status' `nextSymbol` (FR-1.18). */
  async toggle(task: Task): Promise<Task> {
    const registry = this.deps.getStatusRegistry();
    return this.setStatus(task, registry.next(task.status));
  }

  async setStatus(task: Task, status: Status): Promise<Task> {
    const settings = this.deps.settings;
    const registry = this.deps.getStatusRegistry();
    const result = applyStatusChange(task, status, {
      today: this.today(),
      setDoneDate: settings.get('setDoneDate'),
      setCancelledDate: settings.get('setCancelledDate'),
      recurrence: {
        todoStatus: registry.firstOfType(StatusType.TODO) ?? registry.bySymbol(' '),
        setCreatedDate: settings.get('setCreatedDate'),
        idHandling: settings.get('recurrence.idHandling'),
        copyDependsOn: settings.get('recurrence.copyDependsOn'),
        removeScheduledDateOnRecurrence: settings.get('recurrence.removeScheduledDate'),
        generateId: () => generateTaskId((id) => this.deps.index.byId(id).length > 0),
      },
    });
    const format = settings.get('taskFormat');
    const insert: LineInsert | undefined = result.newTasks.length
      ? { position: settings.get('recurrence.insertPosition'), lines: result.newTasks.map((t) => serializeTask(t, format)) }
      : undefined;
    await this.replaceTask(task, result.task, insert, result.deleteOriginal);
    for (const l of this.statusListeners) {
      try { l({ before: task, after: result.task, created: result.newTasks, deleted: result.deleteOriginal }); } catch { /* listeners must not break edits */ }
    }
    return result.task;
  }

  /** Remove the task's line entirely (public API `edit.remove`). */
  async deleteTaskLine(task: Task): Promise<void> {
    const uri = vscode.Uri.parse(task.location.key);
    const line = task.location.line;
    const doc = await vscode.workspace.openTextDocument(uri);
    const visible = vscode.window.visibleTextEditors.some((e) => e.document.uri.toString() === uri.toString());
    const shouldSave = !visible && !doc.isDirty;
    const strip = (s: string) => (s.endsWith('\r') ? s.slice(0, -1) : s);
    const actual = line < doc.lineCount ? doc.lineAt(line).text : '';
    if (strip(actual) !== strip(task.originalMarkdown)) {
      void this.deps.indexService.indexText(uri, doc.getText());
      throw new StaleLineError(uri, line, task.originalMarkdown, actual);
    }
    const edit = new vscode.WorkspaceEdit();
    const range = doc.lineAt(line).rangeIncludingLineBreak;
    // Deleting the last line: take the preceding line break instead so no trailing blank line remains.
    if (line === doc.lineCount - 1 && line > 0) edit.delete(uri, new vscode.Range(doc.lineAt(line - 1).range.end, range.end));
    else edit.delete(uri, range);
    const ok = await vscode.workspace.applyEdit(edit);
    if (!ok) throw new Error(`Could not edit ${uri.fsPath}`);
    this.deps.indexService.indexText(uri, doc.getText());
    if (shouldSave) await doc.save();
  }

  /** Change any fields (dates, priority, description…) and write the line back; `notes` replaces the task's notes too. */
  async update(task: Task, changes: Partial<TaskFields>, notes?: readonly string[]): Promise<Task> {
    const updated = task.with(changes);
    await this.replaceTask(task, updated, undefined, false, notes);
    return updated;
  }

  /**
   * Add one note (an indented plain bullet) under the task, after its existing notes or right
   * below the task line. Returns the new line number.
   */
  async addNote(task: Task, text: string): Promise<number> {
    const note = text.replace(/\s*\n\s*/gu, ' ').trim();
    if (!note) throw new Error(t('Empty note'));
    const uri = vscode.Uri.parse(task.location.key);
    const line = task.location.line;
    return this.withLine(uri, line, task.originalMarkdown, (doc, edit, eol) => {
      const block = noteBlock(docLines(doc), line);
      const after = block.notes.length ? block.notes[block.notes.length - 1]!.end : line;
      edit.insert(uri, doc.lineAt(after).range.end, eol + block.childIndent + block.marker + ' ' + note);
      return after + 1;
    });
  }

  /** Replace the task's notes: existing note lines are rewritten in place, extras added or removed. */
  async setNotes(task: Task, notes: readonly string[]): Promise<void> {
    await this.replaceLine(vscode.Uri.parse(task.location.key), task.location.line, task.originalMarkdown, null, undefined, false, notes);
  }

  /** Stale-checked, single-WorkspaceEdit write around one line (see replaceLine). */
  private async withLine<T>(uri: vscode.Uri, line: number, expectedOriginal: string, build: (doc: vscode.TextDocument, edit: vscode.WorkspaceEdit, eol: string) => T): Promise<T> {
    const doc = await vscode.workspace.openTextDocument(uri);
    // Save afterwards only when nobody is editing this file: not shown in any editor and not
    // dirty. (Closed editors keep their TextDocument around for a while, so "is it in
    // workspace.textDocuments" is not a reliable signal.)
    const visible = vscode.window.visibleTextEditors.some((e) => e.document.uri.toString() === uri.toString());
    const shouldSave = !visible && !doc.isDirty;
    const strip = (s: string) => (s.endsWith('\r') ? s.slice(0, -1) : s);
    const actual = line < doc.lineCount ? doc.lineAt(line).text : '';
    if (strip(actual) !== strip(expectedOriginal)) {
      void this.deps.indexService.indexText(uri, doc.getText());
      throw new StaleLineError(uri, line, expectedOriginal, actual);
    }
    const edit = new vscode.WorkspaceEdit();
    const eol = doc.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    const result = build(doc, edit, eol);
    if (edit.size === 0) return result; // nothing to change (e.g. same notes)
    const ok = await vscode.workspace.applyEdit(edit);
    if (!ok) throw new Error(`Could not edit ${uri.fsPath}`);
    // Keep the index exact immediately instead of waiting for the debounced document event.
    this.deps.indexService.indexText(uri, doc.getText());
    if (shouldSave) await doc.save();
    return result;
  }

  /**
   * Insert a brand-new task line. If `line` is blank it is replaced; otherwise the task goes on
   * a new line after it, inheriting the indentation of a list item on that line.
   */
  async insertNewTask(uri: vscode.Uri, line: number, task: Task, notes: readonly string[] = []): Promise<number> {
    const doc = await vscode.workspace.openTextDocument(uri);
    const format = this.deps.settings.get('taskFormat');
    const visible = vscode.window.visibleTextEditors.some((e) => e.document.uri.toString() === uri.toString());
    const shouldSave = !visible && !doc.isDirty;
    const edit = new vscode.WorkspaceEdit();
    const eol = doc.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    // Notes go right under the new task, one list level deeper.
    const withNotes = (t: Task) => [serializeTask(t, format), ...cleanNotes(notes).map((n) => t.indentation + '  - ' + n)].join(eol);
    let targetLine: number;
    if (doc.lineCount === 0 || line >= doc.lineCount) {
      const end = doc.lineCount ? doc.lineAt(doc.lineCount - 1).range.end : new vscode.Position(0, 0);
      edit.insert(uri, end, (doc.lineCount ? eol : '') + withNotes(task));
      targetLine = doc.lineCount;
    } else {
      const current = doc.lineAt(line);
      if (current.text.trim().length === 0) {
        edit.replace(uri, current.range, withNotes(task.with({ indentation: current.text })));
        targetLine = line;
      } else {
        const indent = /^[ \t]*/.exec(current.text)?.[0] ?? '';
        edit.insert(uri, current.range.end, eol + withNotes(task.with({ indentation: indent })));
        targetLine = line + 1;
      }
    }
    const ok = await vscode.workspace.applyEdit(edit);
    if (!ok) throw new Error(`Could not edit ${uri.fsPath}`);
    this.deps.indexService.indexText(uri, doc.getText());
    if (shouldSave) await doc.save();
    return targetLine;
  }

  /**
   * Serialise `updated` over `original`'s line, optionally inserting lines next to it. With
   * `deleteOriginal` (🏁 delete) the original line is removed and only the inserted lines remain.
   */
  async replaceTask(original: Task, updated: Task, insert?: LineInsert, deleteOriginal = false, notes?: readonly string[]): Promise<void> {
    const text = serializeTask(updated, this.deps.settings.get('taskFormat'));
    await this.replaceLine(vscode.Uri.parse(original.location.key), original.location.line, original.originalMarkdown, text, insert, deleteOriginal, notes);
  }

  /** `newText` null leaves the line as is; `notes` (if given) replaces the task's notes in the same edit. */
  async replaceLine(uri: vscode.Uri, line: number, expectedOriginal: string, newText: string | null, insert?: LineInsert, deleteOriginal = false, notes?: readonly string[]): Promise<void> {
    await this.withLine(uri, line, expectedOriginal, (doc, edit, eol) => {
      const range = doc.lineAt(line).range;
      if (deleteOriginal && insert?.lines.length) {
        // One atomic replacement keeps a single undo stop.
        edit.replace(uri, range, insert.lines.join(eol));
        return;
      }
      if (newText !== null) edit.replace(uri, range, newText);
      if (insert?.lines.length) {
        const block = insert.lines.join(eol);
        if (insert.position === 'above') edit.insert(uri, range.start, block + eol);
        else edit.insert(uri, range.end, eol + block);
      }
      if (notes) this.noteEdits(doc, line, cleanNotes(notes), edit, eol);
    });
  }

  private noteEdits(doc: vscode.TextDocument, line: number, notes: string[], edit: vscode.WorkspaceEdit, eol: string): void {
    const uri = doc.uri;
    const block = noteBlock(docLines(doc), line);
    const existing = block.notes;
    for (let i = 0; i < Math.min(existing.length, notes.length); i++) {
      const n = existing[i]!;
      if (n.text !== notes[i]) edit.replace(uri, doc.lineAt(n.line).range, `${n.indent}${n.marker} ${notes[i]}`);
    }
    if (notes.length > existing.length) {
      const after = existing.length ? existing[existing.length - 1]!.end : line;
      const lines = notes.slice(existing.length).map((n) => `${block.childIndent}${block.marker} ${n}`);
      edit.insert(uri, doc.lineAt(after).range.end, eol + lines.join(eol));
    }
    // Removed notes take their own sub-items with them.
    for (const n of existing.slice(notes.length)) {
      const endLine = n.end;
      if (endLine + 1 < doc.lineCount) edit.delete(uri, new vscode.Range(n.line, 0, endLine + 1, 0));
      else edit.delete(uri, new vscode.Range(doc.lineAt(n.line - 1).range.end, doc.lineAt(endLine).range.end));
    }
  }
}

function docLines(doc: vscode.TextDocument): string[] {
  return doc.getText().split('\n');
}

/** One note per non-empty line, trimmed (shared with the CLI/MCP). */
export const cleanNotes = cleanNoteTexts;
