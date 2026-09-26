import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { ExtensionApi, ExtensionExports } from '../../src/extension';

export const EXTENSION_ID = 'HMCVECDT.tasks-for-markdown';

export async function getExports(): Promise<ExtensionExports> {
  const ext = vscode.extensions.getExtension<ExtensionExports>(EXTENSION_ID);
  if (!ext) throw new Error(`extension ${EXTENSION_ID} not found`);
  return ext.activate();
}

export async function getApi(): Promise<ExtensionApi> {
  const api = (await getExports()).__internal;
  await waitFor(() => api.index.state === 'ready', 15000, 'index ready');
  return api;
}

export function workspaceRoot(): string {
  return vscode.workspace.workspaceFolders![0]!.uri.fsPath;
}

export function fixtureUri(rel: string): vscode.Uri {
  return vscode.Uri.file(path.join(workspaceRoot(), rel));
}

export async function waitFor(cond: () => boolean, timeoutMs = 5000, what = 'condition'): Promise<void> {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${what}`);
    await sleep(50);
  }
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Snapshot / restore fixture files so tests that write can leave the tree clean. */
export class FixtureGuard {
  private readonly saved = new Map<string, string>();
  protect(rel: string): void {
    const p = path.join(workspaceRoot(), rel);
    if (!this.saved.has(p)) this.saved.set(p, fs.readFileSync(p, 'utf8'));
  }
  async restore(): Promise<void> {
    // Restore through the VS Code API (not fs) so the in-memory document, the file on disk and
    // the index agree and no "File Modified Since" conflict dialog can appear.
    for (const [p, text] of this.saved) {
      const uri = vscode.Uri.file(p);
      const doc = await vscode.workspace.openTextDocument(uri);
      if (doc.getText() !== text) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(uri, new vscode.Range(0, 0, doc.lineCount, 0), text);
        await vscode.workspace.applyEdit(edit);
      }
      if (doc.isDirty) await doc.save();
    }
    const restored = [...this.saved.keys()];
    this.saved.clear();
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    const api = await getApi();
    for (const p of restored) await api.indexService.indexUri(vscode.Uri.file(p));
  }
}

/** Find an indexed task by description, waiting briefly for the index to settle. */
export async function findTask(api: ExtensionApi, rel: string, description: string): Promise<import('../../src/core/task').Task> {
  const key = fixtureUri(rel).toString();
  let found: import('../../src/core/task').Task | undefined;
  await waitFor(() => {
    found = api.index.file(key)?.tasks.find((t) => t.description === description);
    return found !== undefined;
  }, 3000, `task "${description}" in ${rel}`);
  return found!;
}

/** Today's date in *local* time as YYYY-MM-DD — the extension writes local dates, never UTC. */
export function localToday(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
