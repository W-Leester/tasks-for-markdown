import * as path from 'node:path';
import * as vscode from 'vscode';
import { type ArchiveFileInput, planArchive, renderArchiveBlock } from '../core/archive';
import { systemClock, type Clock } from '../core/dates';
import type { TaskIndex } from '../core/index';
import type { IndexService } from '../index/IndexService';
import type { Settings } from '../settings/Settings';
import { t } from '../l10n';

export interface ArchiveDeps {
  index: TaskIndex;
  indexService: IndexService;
  settings: Settings;
  clock?: Clock;
  log(m: string): void;
}

/** Manual "Archive completed tasks" (FR-10.5 ~ FR-10.8): preview, then one atomic WorkspaceEdit. */
export class ArchiveService {
  constructor(private readonly deps: ArchiveDeps) {}

  private today() {
    return (this.deps.clock ?? systemClock).now().startOf('day');
  }

  private archiveUri(): vscode.Uri {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) throw new Error(t('Open a workspace folder first'));
    const rel = this.deps.settings.get('archive.file') || 'Archive.md';
    return vscode.Uri.joinPath(folder.uri, ...rel.split(/[\\/]/));
  }

  /** Gather file texts + tasks for every indexed file (skipping the archive file itself). */
  private async inputs(): Promise<ArchiveFileInput[]> {
    const archiveKey = this.archiveUri().toString();
    const out: ArchiveFileInput[] = [];
    for (const key of this.deps.index.fileKeys()) {
      if (key === archiveKey) continue;
      const entry = this.deps.index.file(key)!;
      if (!entry.tasks.some((t) => t.isCompleted)) continue;
      const uri = vscode.Uri.parse(key);
      const doc = await vscode.workspace.openTextDocument(uri);
      out.push({ path: entry.path, lines: doc.getText().split(/\r?\n/), tasks: entry.tasks });
    }
    return out;
  }

  async run(): Promise<void> {
    const afterDays = this.deps.settings.get('archive.afterDays');
    const files = await this.inputs();
    const plan = planArchive(files, { today: this.today(), afterDays });
    if (!plan.totalTasks) {
      void vscode.window.showInformationMessage(t('No completed tasks older than {0} days to archive.', afterDays));
      return;
    }
    // Preview: every root task pre-selected; the user can deselect (FR-10.7).
    const items = plan.entries.flatMap((e) =>
      e.tasks.map((t) => ({ label: t.description || '(empty)', description: `${e.path}:${t.location.line + 1}`, detail: (t.done ?? t.cancelled)?.format(), picked: true, entry: e, task: t })),
    );
    const picked = await vscode.window.showQuickPick(items, { canPickMany: true, placeHolder: t('Archive {0} completed tasks to {1}', plan.totalTasks, this.deps.settings.get('archive.file') || 'Archive.md') });
    if (!picked || picked.length === 0) return;
    const keep = new Set(picked.map((p) => `${p.entry.path}#${p.task.location.line}`));
    const finalPlan = planArchive(files, { today: this.today(), afterDays, select: (t) => keep.has(`${t.location.path}#${t.location.line}`) });
    if (!finalPlan.totalTasks) return;

    const archiveUri = this.archiveUri();
    const linkPrefix = path.posix.relative(path.posix.dirname(vscode.workspace.asRelativePath(archiveUri, false)) || '.', '.') ;
    const block = renderArchiveBlock(finalPlan, files, { today: this.today(), linkStyle: this.deps.settings.get('archive.linkStyle'), linkPrefix: linkPrefix ? linkPrefix + '/' : '' });

    const edit = new vscode.WorkspaceEdit();
    let exists = true;
    try {
      await vscode.workspace.fs.stat(archiveUri);
    } catch {
      exists = false;
    }
    if (!exists) edit.createFile(archiveUri, { ignoreIfExists: true });
    const archiveDoc = exists ? await vscode.workspace.openTextDocument(archiveUri) : null;
    const end = archiveDoc ? archiveDoc.lineAt(Math.max(0, archiveDoc.lineCount - 1)).range.end : new vscode.Position(0, 0);
    const prefix = archiveDoc && archiveDoc.getText().trim().length ? (archiveDoc.getText().endsWith('\n') ? '\n' : '\n\n') : exists ? '' : `# ${t('Archive')}\n\n`;
    edit.insert(archiveUri, end, prefix + block);

    for (const e of finalPlan.entries) {
      const uri = vscode.Uri.parse(this.deps.index.fileKeys().find((k) => this.deps.index.file(k)!.path === e.path)!);
      const doc = await vscode.workspace.openTextDocument(uri);
      for (const line of [...e.lines].sort((a, b) => b - a)) {
        const range = line + 1 < doc.lineCount ? new vscode.Range(line, 0, line + 1, 0) : doc.lineAt(line).rangeIncludingLineBreak;
        edit.delete(uri, range);
      }
    }
    const ok = await vscode.workspace.applyEdit(edit);
    if (!ok) throw new Error('Archive edit was rejected');
    // Save touched files that are not open in an editor (same policy as TaskEditService).
    const touched = [archiveUri, ...finalPlan.entries.map((e) => vscode.Uri.parse(this.deps.index.fileKeys().find((k) => this.deps.index.file(k)!.path === e.path)!))];
    for (const uri of touched) {
      const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
      const visible = vscode.window.visibleTextEditors.some((ed) => ed.document.uri.toString() === uri.toString());
      if (doc && doc.isDirty && !visible) await doc.save();
      if (doc) this.deps.indexService.indexText(uri, doc.getText());
    }
    const n = finalPlan.entries.reduce((s, e) => s + e.tasks.length, 0);
    const open = t('Open archive');
    // Not awaited: the promise only settles when the toast is dismissed.
    void vscode.window.showInformationMessage(t('Archived {0} tasks.', n), open).then((choice) => {
      if (choice === open) void vscode.window.showTextDocument(archiveUri);
    });
  }
}
