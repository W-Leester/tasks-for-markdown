import ignore, { type Ignore } from 'ignore';
import * as vscode from 'vscode';

/**
 * Root-level `.gitignore` per workspace folder. Nested .gitignore files are not read (v1);
 * they are rare for note collections and would need a directory walk.
 */
export class GitignoreFilter {
  private readonly rules = new Map<string, Ignore>(); // folder uri -> rules

  async load(): Promise<void> {
    this.rules.clear();
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      try {
        const bytes = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder.uri, '.gitignore'));
        this.rules.set(folder.uri.toString(), ignore().add(Buffer.from(bytes).toString('utf8')));
      } catch {
        // no .gitignore in this folder
      }
    }
  }

  isIgnored(uri: vscode.Uri): boolean {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (!folder) return false;
    const rules = this.rules.get(folder.uri.toString());
    if (!rules) return false;
    const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
    if (!rel || rel.startsWith('..')) return false;
    return rules.ignores(rel);
  }
}
