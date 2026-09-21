import * as vscode from 'vscode';
import { parseFile } from '../core/file';
import { TaskIndex } from '../core/index';
import type { StatusRegistry } from '../core/task';
import type { Settings } from '../settings/Settings';
import { GitignoreFilter } from './GitignoreFilter';

const CHUNK_SIZE = 50;
const DOCUMENT_DEBOUNCE_MS = 300;
const WATCHER_DEBOUNCE_MS = 100;

export interface IndexServiceDeps {
  index: TaskIndex;
  settings: Settings;
  getStatusRegistry(): StatusRegistry;
  log(message: string): void;
}

/**
 * Keeps the TaskIndex in sync with the workspace: initial scan, file watcher, and live text of
 * open documents (an open editor's buffer beats the file on disk). Also re-scans when settings
 * that affect what counts as a task change.
 */
export class IndexService implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly gitignore = new GitignoreFilter();
  private readonly pendingDocs = new Map<string, NodeJS.Timeout>();
  private readonly pendingFiles = new Map<string, NodeJS.Timeout>();
  private watcher: vscode.FileSystemWatcher | null = null;
  private scanToken = 0;

  constructor(private readonly deps: IndexServiceDeps) {}

  get index(): TaskIndex {
    return this.deps.index;
  }

  async start(): Promise<void> {
    this.installWatcher();
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChanged(e.document)),
      vscode.workspace.onDidCloseTextDocument((doc) => this.onDocumentClosed(doc)),
      vscode.workspace.onDidChangeWorkspaceFolders(() => void this.rescan()),
      this.deps.settings.onDidChange(
        () => void this.rescan(),
        ['include', 'exclude', 'respectGitignore', 'maxFileSizeKB', 'globalFilter'],
      ),
    );
    await this.rescan();
  }

  /** Full scan. A newer call supersedes an in-flight one. */
  async rescan(): Promise<void> {
    const token = ++this.scanToken;
    const { index, settings, log } = this.deps;
    const started = Date.now();
    index.setProgress({ state: 'scanning', done: 0, total: 0 });

    if (settings.get('respectGitignore')) await this.gitignore.load();
    const uris = (await vscode.workspace.findFiles(this.includeGlob(), this.excludeGlob())).filter(
      (u) => !settings.get('respectGitignore') || !this.gitignore.isIgnored(u),
    );
    if (token !== this.scanToken) return;

    const seen = new Set<string>();
    const changed: string[] = [];
    index.setProgress({ state: 'scanning', done: 0, total: uris.length });
    for (let i = 0; i < uris.length; i += CHUNK_SIZE) {
      const chunk = uris.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (uri) => {
          const key = uri.toString();
          seen.add(key);
          if (await this.indexUri(uri, true)) changed.push(key);
        }),
      );
      if (token !== this.scanToken) return;
      index.setProgress({ state: 'scanning', done: Math.min(i + CHUNK_SIZE, uris.length), total: uris.length });
      await new Promise<void>((r) => setTimeout(r, 0)); // let the extension host breathe
    }

    const removed = index.retainOnly(seen);
    index.setProgress({ state: 'ready', done: uris.length, total: uris.length });
    index.emitBulkChange({ changed, removed });
    log(`indexed ${index.fileCount()} files / ${index.taskCount()} tasks in ${Date.now() - started}ms` +
      (index.skippedFiles().length ? ` (skipped ${index.skippedFiles().length} large files)` : ''));
  }

  /** Re-index one file from disk or from its open document. Returns true if it was indexed. */
  async indexUri(uri: vscode.Uri, silent = false): Promise<boolean> {
    const { index, settings } = this.deps;
    const key = uri.toString();
    const open = vscode.workspace.textDocuments.find((d) => d.uri.toString() === key);
    let text: string;
    if (open) {
      text = open.getText();
    } else {
      let stat: vscode.FileStat;
      try {
        stat = await vscode.workspace.fs.stat(uri);
      } catch {
        index.removeFile(key, silent);
        return false;
      }
      const maxBytes = settings.get('maxFileSizeKB') * 1024;
      if (stat.size > maxBytes) {
        index.markSkipped({ key, path: this.displayPath(uri), reason: 'too-large', sizeKB: Math.round(stat.size / 1024) });
        return false;
      }
      text = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
    }
    this.indexText(uri, text, silent);
    return true;
  }

  indexText(uri: vscode.Uri, text: string, silent = false): void {
    const { index, settings } = this.deps;
    const path = this.displayPath(uri);
    const globalFilter = settings.get('globalFilter') || undefined;
    const result = parseFile(text, { path, statusRegistry: this.deps.getStatusRegistry(), globalFilter });
    index.setFile({ key: uri.toString(), path, tasks: result.tasks, headings: result.headings, frontmatterTags: result.frontmatterTags }, silent);
  }

  displayPath(uri: vscode.Uri): string {
    return vscode.workspace.asRelativePath(uri, (vscode.workspace.workspaceFolders?.length ?? 0) > 1).replace(/\\/g, '/');
  }

  isMarkdown(uri: vscode.Uri): boolean {
    if (uri.scheme !== 'file' && uri.scheme !== 'vscode-remote') return false;
    const rel = vscode.workspace.asRelativePath(uri, false);
    return this.includeMatchers().some((re) => re.test(rel));
  }

  // ---- change sources -------------------------------------------------------------------

  private installWatcher(): void {
    this.watcher?.dispose();
    this.watcher = vscode.workspace.createFileSystemWatcher(this.includeGlob());
    const schedule = (uri: vscode.Uri) => {
      const key = uri.toString();
      clearTimeout(this.pendingFiles.get(key));
      this.pendingFiles.set(
        key,
        setTimeout(() => {
          this.pendingFiles.delete(key);
          if (!this.isExcluded(uri)) void this.indexUri(uri);
        }, WATCHER_DEBOUNCE_MS),
      );
    };
    this.watcher.onDidCreate(schedule);
    this.watcher.onDidChange(schedule);
    this.watcher.onDidDelete((uri) => this.deps.index.removeFile(uri.toString()));
    this.disposables.push(this.watcher);
  }

  private onDocumentChanged(doc: vscode.TextDocument): void {
    if (doc.languageId !== 'markdown' || !this.isMarkdown(doc.uri) || this.isExcluded(doc.uri)) return;
    const key = doc.uri.toString();
    clearTimeout(this.pendingDocs.get(key));
    this.pendingDocs.set(
      key,
      setTimeout(() => {
        this.pendingDocs.delete(key);
        if (!doc.isClosed) this.indexText(doc.uri, doc.getText());
      }, DOCUMENT_DEBOUNCE_MS),
    );
  }

  private onDocumentClosed(doc: vscode.TextDocument): void {
    // A closed-without-saving buffer may differ from disk: re-read the file.
    if (doc.languageId !== 'markdown' || !this.isMarkdown(doc.uri)) return;
    clearTimeout(this.pendingDocs.get(doc.uri.toString()));
    if (doc.isDirty || this.deps.index.file(doc.uri.toString())) void this.indexUri(doc.uri);
  }

  // ---- globs ------------------------------------------------------------------------------

  private includeGlob(): string {
    const inc = this.deps.settings.get('include');
    return inc.length === 1 ? inc[0]! : `{${inc.join(',')}}`;
  }

  private excludeGlob(): string | undefined {
    const patterns = [...this.deps.settings.get('exclude')];
    const filesExclude = vscode.workspace.getConfiguration('files').get<Record<string, boolean>>('exclude') ?? {};
    for (const [glob, on] of Object.entries(filesExclude)) if (on) patterns.push(glob);
    return patterns.length ? `{${patterns.join(',')}}` : undefined;
  }

  private includeMatchers(): RegExp[] {
    return this.deps.settings.get('include').map(globToRegExp);
  }

  private isExcluded(uri: vscode.Uri): boolean {
    const rel = vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/');
    if (this.deps.settings.get('exclude').some((g) => globToRegExp(g).test(rel))) return true;
    return this.deps.settings.get('respectGitignore') && this.gitignore.isIgnored(uri);
  }

  dispose(): void {
    for (const t of this.pendingDocs.values()) clearTimeout(t);
    for (const t of this.pendingFiles.values()) clearTimeout(t);
    for (const d of this.disposables) d.dispose();
  }
}

/** Small glob → RegExp for `**`, `*`, `?` and `{a,b}` — enough for include/exclude patterns. */
export function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]!;
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*';
        i += glob[i + 2] === '/' ? 2 : 1;
      } else re += '[^/]*';
    } else if (c === '?') re += '[^/]';
    else if (c === '{') re += '(?:';
    else if (c === '}') re += ')';
    else if (c === ',') re += '|';
    else re += c.replace(/[.+^$()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
