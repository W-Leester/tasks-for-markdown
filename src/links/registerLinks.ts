import * as path from 'node:path';
import * as vscode from 'vscode';
import { resolveQueryBlock, type QueryTarget } from '../commands/queryCommands';
import type { TaskIndex } from '../core/index';
import type { IndexService } from '../index/IndexService';
import { t } from '../l10n';
import { parseTaskLink, queryLink, taskLink, type LinkError } from './taskLinks';

export interface LinkDeps {
  index: TaskIndex;
  indexService: IndexService;
  openQueryResults: (target: QueryTarget | null) => void;
  log: (msg: string) => void;
}

function errorText(code: LinkError, value = ''): string {
  switch (code) {
    case 'noPath': return t('The link has no file path.');
    case 'absolutePath': return t('The link must use a path inside the workspace, not an absolute path: {0}', value);
    case 'parentPath': return t('The link path may not contain "..": {0}', value);
    case 'badLine': return t('The line number in the link is not valid: {0}', value);
    case 'noQuery': return t('The link has no query text.');
    case 'functionQuery': return t('Queries with "by function" cannot be opened from a link.');
    case 'unknownAction': return t('Unknown link action: {0}', value || '(none)');
  }
}

/**
 * A workspace-relative path as the API uses it (multi-root: "<folder>/<path>") → a file inside an
 * open workspace folder, or undefined. Never resolves outside a folder.
 */
export async function resolveWorkspaceFile(relPath: string): Promise<vscode.Uri | undefined> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const parts = relPath.split('/').filter(Boolean);
  const candidates: { folder: vscode.WorkspaceFolder; rest: string[] }[] = [];
  const named = folders.length > 1 ? folders.find((f) => f.name === parts[0]) : undefined;
  if (named) candidates.push({ folder: named, rest: parts.slice(1) });
  for (const folder of folders) candidates.push({ folder, rest: parts });
  for (const { folder, rest } of candidates) {
    if (!rest.length) continue;
    const uri = vscode.Uri.joinPath(folder.uri, ...rest);
    const rel = path.posix.relative(folder.uri.path, uri.path);
    if (!rel || rel.startsWith('..')) continue;
    try {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.type & vscode.FileType.File) return uri;
    } catch { /* try the next folder */ }
  }
  return undefined;
}

/** Handle `<scheme>://hastycapybara.tasks-for-markdown/…` (design.md 7.17). Exposed for tests. */
export async function handleTaskLink(uri: vscode.Uri, deps: LinkDeps): Promise<void> {
  const link = parseTaskLink(uri.path, uri.query);
  deps.log(`link ${uri.path} → ${link.kind}`);
  if (link.kind === 'error') {
    void vscode.window.showErrorMessage(t('Tasks: {0}', errorText(link.code, link.value)));
    return;
  }
  if (link.kind === 'guide') {
    await vscode.commands.executeCommand('tasksmd.openWalkthrough');
    return;
  }
  if (link.kind === 'query') {
    deps.openQueryResults({ text: link.text, source: '', label: t('Link') });
    return;
  }
  const file = await resolveWorkspaceFile(link.path);
  if (!file) {
    void vscode.window.showErrorMessage(t('Tasks: {0}', t('The file in the link is not in this workspace: {0}', link.path)));
    return;
  }
  const doc = await vscode.workspace.openTextDocument(file);
  const editor = await vscode.window.showTextDocument(doc, { preserveFocus: false });
  const line = Math.min(link.line, doc.lineCount - 1);
  const range = doc.lineAt(line).range;
  editor.selection = new vscode.Selection(range.end, range.end);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
}

export function registerLinks(context: vscode.ExtensionContext, deps: LinkDeps): { handle: (uri: vscode.Uri) => Promise<void> } {
  const handle = (uri: vscode.Uri) => handleTaskLink(uri, deps);
  const copy = async (link: string) => {
    await vscode.env.clipboard.writeText(link);
    void vscode.window.showInformationMessage(t('Link copied: {0}', link));
  };
  context.subscriptions.push(
    vscode.window.registerUriHandler({ handleUri: (uri) => void handle(uri) }),
    vscode.commands.registerCommand('tasksmd.copyTaskLink', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      const line = editor.selection.active.line;
      const task = deps.index.taskAt(editor.document.uri.toString(), line);
      if (!task) {
        void vscode.window.showInformationMessage(t('Put the cursor on a task line to copy its link.'));
        return;
      }
      await copy(taskLink(vscode.env.uriScheme, deps.indexService.displayPath(editor.document.uri), line));
    }),
    vscode.commands.registerCommand('tasksmd.copyQueryLink', async (arg?: unknown) => {
      const found = resolveQueryBlock(arg);
      if (!found) {
        void vscode.window.showInformationMessage(t('Put the cursor inside a ```tasks block to copy its link.'));
        return;
      }
      await copy(queryLink(vscode.env.uriScheme, found.block.text));
    }),
  );
  return { handle };
}
