import * as vscode from 'vscode';
import { dayjs, type Dayjs } from '../core/dates/dayjs';
import { StatusType, type StatusRegistry, type Status, type Task, type TaskFields, applyStatusChange, generateTaskId, serializeTask } from '../core/task';
import type { TaskIndex } from '../core/index';
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
  constructor(private readonly deps: TaskEditDeps) {}

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
    return result.task;
  }

  /** Change any fields (dates, priority, description…) and write the line back. */
  async update(task: Task, changes: Partial<TaskFields>): Promise<Task> {
    const updated = task.with(changes);
    await this.replaceTask(task, updated);
    return updated;
  }

  /**
   * Insert a brand-new task line. If `line` is blank it is replaced; otherwise the task goes on
   * a new line after it, inheriting the indentation of a list item on that line.
   */
  async insertNewTask(uri: vscode.Uri, line: number, task: Task): Promise<number> {
    const doc = await vscode.workspace.openTextDocument(uri);
    const format = this.deps.settings.get('taskFormat');
    const visible = vscode.window.visibleTextEditors.some((e) => e.document.uri.toString() === uri.toString());
    const shouldSave = !visible && !doc.isDirty;
    const edit = new vscode.WorkspaceEdit();
    const eol = doc.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    let targetLine: number;
    if (doc.lineCount === 0 || line >= doc.lineCount) {
      const end = doc.lineCount ? doc.lineAt(doc.lineCount - 1).range.end : new vscode.Position(0, 0);
      edit.insert(uri, end, (doc.lineCount ? eol : '') + serializeTask(task, format));
      targetLine = doc.lineCount;
    } else {
      const current = doc.lineAt(line);
      if (current.text.trim().length === 0) {
        edit.replace(uri, current.range, serializeTask(task.with({ indentation: current.text }), format));
        targetLine = line;
      } else {
        const indent = /^[ \t]*/.exec(current.text)?.[0] ?? '';
        edit.insert(uri, current.range.end, eol + serializeTask(task.with({ indentation: indent }), format));
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
  async replaceTask(original: Task, updated: Task, insert?: LineInsert, deleteOriginal = false): Promise<void> {
    const text = serializeTask(updated, this.deps.settings.get('taskFormat'));
    await this.replaceLine(vscode.Uri.parse(original.location.key), original.location.line, original.originalMarkdown, text, insert, deleteOriginal);
  }

  async replaceLine(uri: vscode.Uri, line: number, expectedOriginal: string, newText: string, insert?: LineInsert, deleteOriginal = false): Promise<void> {
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
    const range = doc.lineAt(line).range;
    const eol = doc.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    if (deleteOriginal && insert?.lines.length) {
      // One atomic replacement keeps a single undo stop.
      edit.replace(uri, range, insert.lines.join(eol));
    } else {
      edit.replace(uri, range, newText);
      if (insert?.lines.length) {
        const block = insert.lines.join(eol);
        if (insert.position === 'above') edit.insert(uri, range.start, block + eol);
        else edit.insert(uri, range.end, eol + block);
      }
    }
    const ok = await vscode.workspace.applyEdit(edit);
    if (!ok) throw new Error(`Could not edit ${uri.fsPath}`);

    // Keep the index exact immediately instead of waiting for the debounced document event.
    this.deps.indexService.indexText(uri, doc.getText());
    if (shouldSave) await doc.save();
  }
}
