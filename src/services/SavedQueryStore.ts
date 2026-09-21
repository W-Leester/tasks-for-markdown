import * as vscode from 'vscode';
import type { Settings } from '../settings/Settings';

export interface SavedQuery {
  /** Stable id: `settings:<index>` or the file uri string. */
  id: string;
  name: string;
  query: string;
  source: 'settings' | 'file';
  /** For file-based queries. */
  uri?: vscode.Uri;
}

export const QUERIES_DIR = '.tasks/queries';
const FENCE_RE = /```tasks[^\n]*\n([\s\S]*?)```/;

/**
 * Saved queries come from two places (FR-5.5):
 *  1. the `tasksmd.savedQueries` setting (user or workspace),
 *  2. `.tasks/queries/*.md` files in each workspace folder — the query is the first ```tasks
 *     block (or the whole file when there is no fence); the name is the file name or first `# heading`.
 */
export class SavedQueryStore implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.emitter.event;
  private readonly disposables: vscode.Disposable[] = [];
  private fileQueries: SavedQuery[] = [];
  private loading: Promise<void> | null = null;

  constructor(private readonly settings: Settings) {
    const watcher = vscode.workspace.createFileSystemWatcher(`**/${QUERIES_DIR}/*.md`);
    const reload = () => void this.reload();
    watcher.onDidCreate(reload);
    watcher.onDidChange(reload);
    watcher.onDidDelete(reload);
    this.disposables.push(
      watcher,
      this.emitter,
      settings.onDidChange(() => this.emitter.fire(), ['savedQueries']),
      vscode.workspace.onDidChangeWorkspaceFolders(reload),
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.path.includes(`/${QUERIES_DIR}/`)) reload();
      }),
    );
    reload();
  }

  all(): SavedQuery[] {
    const fromSettings = this.settings.get('savedQueries').map((q, i) => ({ id: `settings:${i}`, name: q.name, query: q.query, source: 'settings' as const }));
    return [...fromSettings, ...this.fileQueries];
  }

  byId(id: string): SavedQuery | undefined {
    return this.all().find((q) => q.id === id);
  }

  async reload(): Promise<void> {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const files = await vscode.workspace.findFiles(`**/${QUERIES_DIR}/*.md`, '**/node_modules/**');
      const out: SavedQuery[] = [];
      for (const uri of files.sort((a, b) => a.path.localeCompare(b.path))) {
        const open = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
        const text = open ? open.getText() : Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
        out.push(parseQueryFile(uri, text));
      }
      this.fileQueries = out;
      this.emitter.fire();
    })().finally(() => (this.loading = null));
    return this.loading;
  }

  /** Create `.tasks/queries/<name>.md` in the first workspace folder and return its uri. */
  async createFile(name: string, query = 'not done\nsort by urgency'): Promise<vscode.Uri> {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (!folder) throw new Error('Open a workspace folder first');
    const safe = name.replace(/[\\/:*?"<>|]/g, '-').trim() || 'query';
    const uri = vscode.Uri.joinPath(folder.uri, QUERIES_DIR, `${safe}.md`);
    const content = `# ${name}\n\n\`\`\`tasks\n${query}\n\`\`\`\n`;
    await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(folder.uri, QUERIES_DIR));
    await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
    await this.reload();
    return uri;
  }

  async saveToSettings(name: string, query: string, target = vscode.ConfigurationTarget.Workspace): Promise<void> {
    const list = [...this.settings.get('savedQueries'), { name, query }];
    await this.settings.update('savedQueries', list, target);
  }

  async remove(q: SavedQuery): Promise<void> {
    if (q.source === 'file' && q.uri) {
      await vscode.workspace.fs.delete(q.uri);
      await this.reload();
    } else {
      const idx = Number(q.id.split(':')[1]);
      const list = this.settings.get('savedQueries').filter((_, i) => i !== idx);
      await this.settings.update('savedQueries', list, vscode.ConfigurationTarget.Workspace);
    }
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
  }
}

export function parseQueryFile(uri: vscode.Uri, text: string): SavedQuery {
  const heading = /^#\s+(.+)$/m.exec(text)?.[1]?.trim();
  const filename = uri.path.split('/').pop()!.replace(/\.md$/, '');
  const fence = FENCE_RE.exec(text);
  const query = (fence ? fence[1]! : text).trim();
  return { id: uri.toString(), name: heading || filename, query, source: 'file', uri };
}
