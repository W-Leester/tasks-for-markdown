import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { ExtensionApi } from '../../src/extension';

export const EXTENSION_ID = 'HMCVECDT.tasks-for-markdown';

export async function getApi(): Promise<ExtensionApi> {
  const ext = vscode.extensions.getExtension<ExtensionApi>(EXTENSION_ID);
  if (!ext) throw new Error(`extension ${EXTENSION_ID} not found`);
  const api = await ext.activate();
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
    // Revert dirty buffers first, otherwise a lingering in-memory document would shadow the
    // restored file (and later saves fail with "File Modified Since").
    for (const doc of vscode.workspace.textDocuments) {
      if (!doc.isDirty) continue;
      await vscode.window.showTextDocument(doc, { preview: false });
      await vscode.commands.executeCommand('workbench.action.revertAndCloseActiveEditor');
    }
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    for (const [p, text] of this.saved) fs.writeFileSync(p, text);
    this.saved.clear();
    await sleep(150); // let the watcher re-index the restored files
  }
}
