import * as vscode from 'vscode';
import { systemClock, type Clock } from '../core/dates';
import type { TaskIndex } from '../core/index';
import { DateField, type StatusRegistry, StatusType, Task, generateTaskId, parseTaskLine } from '../core/task';
import { Recurrence } from '../core/recurrence';
import { computeWeeklyStats } from '../core/stats';
import { noteBlock } from '../core/file';
import { dependants } from '../core/index';
import type { IndexService } from '../index/IndexService';
import type { QueryService } from '../services/QueryService';
import type { SavedQueryStore } from '../services/SavedQueryStore';
import { StaleLineError, type TaskEditService } from '../services/TaskEditService';
import { toGroupDto, toTaskDto } from '../services/dto';
import { applyFieldValues } from '../services/taskFields';
import type { Settings } from '../settings/Settings';
import type { FromWebview, InitState, TaskFieldName, ToWebview } from '../webviews/shared/protocol';
import { currentBundle, currentLanguage, t } from '../l10n';

export interface WebviewHostDeps {
  context: vscode.ExtensionContext;
  index: TaskIndex;
  settings: Settings;
  queries: QueryService;
  savedQueries: SavedQueryStore;
  editService: TaskEditService;
  indexService?: IndexService;
  getStatusRegistry(): StatusRegistry;
  log(m: string): void;
  clock?: Clock;
}

export interface WebviewAppOptions {
  /** Name of the bundle under dist/webviews/<app>.js and the workspaceState key for UI state. */
  app: string;
  title: string;
}

/**
 * Everything a Svelte webview needs from the extension (D§5.6): HTML with a strict CSP, the
 * typed message protocol, `state/init` on ready, `index/changed` pushes, and the edit
 * operations routed through TaskEditService. Works for both WebviewPanel and WebviewView.
 */
/** Last Markdown document that had focus — the fallback target for tasks created from a panel. */
let lastMarkdownDoc: vscode.TextDocument | undefined;
vscode.window.onDidChangeActiveTextEditor((e) => {
  if (e?.document.languageId === 'markdown') lastMarkdownDoc = e.document;
});
if (vscode.window.activeTextEditor?.document.languageId === 'markdown') lastMarkdownDoc = vscode.window.activeTextEditor.document;

export class WebviewHost implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private webview: vscode.Webview | null = null;
  /** Message types received so far — handy for tests and logs. */
  readonly received: string[] = [];
  /** Extra per-panel values merged into `state/init.uiState` (e.g. the edit target). */
  extras: Record<string, unknown> = {};

  constructor(
    private readonly deps: WebviewHostDeps,
    private readonly options: WebviewAppOptions,
  ) {}

  attach(webview: vscode.Webview): void {
    this.webview = webview;
    webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.joinPath(this.deps.context.extensionUri, 'dist', 'webviews')] };
    webview.html = this.html(webview);
    this.disposables.push(
      webview.onDidReceiveMessage((m: FromWebview) => void this.handle(m)),
      this.deps.settings.onDidChange(() => this.send({ type: 'state/patch', state: this.state() })),
      this.deps.savedQueries.onDidChange(() => this.send({ type: 'state/patch', state: { savedQueries: this.state().savedQueries } })),
      this.deps.queries.onDidChange(() => this.send({ type: 'index/changed' })),
    );
  }

  send(msg: ToWebview): void {
    void this.webview?.postMessage(msg);
  }

  private today() {
    return (this.deps.clock ?? systemClock).now().startOf('day');
  }

  private state(): InitState {
    return {
      locale: currentLanguage(),
      l10n: currentBundle(),
      today: this.today().format('YYYY-MM-DD'),
      statuses: this.deps.getStatusRegistry().all().map((s) => ({ symbol: s.symbol, name: s.name, type: s.type, nextSymbol: s.nextSymbol })),
      taskFormat: this.deps.settings.get('taskFormat'),
      savedQueries: this.deps.savedQueries.all().map((q) => ({ id: q.id, name: q.name, query: q.query, source: q.source })),
      uiState: { ...this.deps.context.workspaceState.get<Record<string, unknown>>(`webview.${this.options.app}`, {}), ...this.extras },
      editModal: { accessKeys: this.deps.settings.get('editModal.accessKeys'), hiddenFields: this.deps.settings.get('editModal.hiddenFields') },
      globalFilter: this.deps.settings.get('globalFilter'),
      calendarFontSize: this.deps.settings.get('calendar.fontSize'),
      requireDueDate: this.deps.settings.get('requireDueDate'),
    };
  }

  private async handle(msg: FromWebview): Promise<void> {
    this.received.push(msg.type);
    try {
      switch (msg.type) {
        case 'ui/ready':
          this.send({ type: 'state/init', state: this.state() });
          break;
        case 'ui/state':
          await this.deps.context.workspaceState.update(`webview.${this.options.app}`, msg.state);
          break;
        case 'query/run': {
          const r = this.deps.queries.run(msg.query, msg.source ? { path: msg.source } : undefined);
          const today = this.today();
          this.send({
            type: 'query/result',
            requestId: msg.requestId,
            tasks: r.root.children.length || r.root.tree ? [] : r.root.tasks.map((t) => toTaskDto(t, this.deps.index, today)),
            groups: r.root.children.length || r.root.tree ? toGroupDto(r.root, this.deps.index, today) : null,
            matched: r.matched,
            errors: [...r.errors.map((e) => `Line ${e.line}: ${e.message}`), ...r.runtimeErrors],
          });
          break;
        }
        case 'task/toggle': {
          const task = this.deps.index.taskAt(msg.key, msg.line);
          if (task) await this.deps.editService.toggle(task);
          break;
        }
        case 'task/setField': {
          const task = this.deps.index.taskAt(msg.key, msg.line);
          if (task) await this.applyFields(task, { [msg.field]: msg.value });
          break;
        }
        case 'task/setFields': {
          const task = this.deps.index.taskAt(msg.key, msg.line);
          if (task) await this.applyFields(task, msg.fields, msg.notes);
          break;
        }
        case 'task/create': {
          const registry = this.deps.getStatusRegistry();
          let task = Task.blank('', registry.firstOfType(StatusType.TODO) ?? registry.bySymbol(' '));
          if (Array.isArray(msg.fields.dependsOn)) msg.fields.dependsOn = await this.resolveDependencyRefs(msg.fields.dependsOn);
          task = applyFieldValues(task, msg.fields);
          if (typeof msg.fields.status === 'string') task = task.with({ status: registry.bySymbol(msg.fields.status) });
          if (this.deps.settings.get('setCreatedDate')) task = task.with({ created: DateField.fromDate(this.today()) });
          if (this.deps.settings.get('requireDueDate') && !task.due) throw new Error(t('A due date is required (tasksmd.requireDueDate).'));
          let target = msg.key ? vscode.Uri.parse(msg.key) : undefined;
          let line = msg.line ?? Number.MAX_SAFE_INTEGER;
          if (!target) {
            // Calendar and other views: use the configured inbox file, else the active Markdown editor.
            const inbox = this.deps.settings.get('calendar.newTaskFile');
            const folder = vscode.workspace.workspaceFolders?.[0];
            if (inbox && folder) {
              target = vscode.Uri.joinPath(folder.uri, ...inbox.split(/[\\/]/));
              try { await vscode.workspace.fs.stat(target); } catch { await vscode.workspace.fs.writeFile(target, Buffer.from(`# ${inbox.split('/').pop()!.replace(/\.md$/, '')}\n\n`, 'utf8')); }
            } else {
              const editor = vscode.window.activeTextEditor?.document.languageId === 'markdown'
                ? vscode.window.activeTextEditor
                : vscode.window.visibleTextEditors.find((e) => e.document.languageId === 'markdown');
              if (editor) {
                target = editor.document.uri;
                line = msg.line ?? editor.selection.active.line;
              } else if (lastMarkdownDoc && !lastMarkdownDoc.isClosed) {
                target = lastMarkdownDoc.uri;
                line = msg.line ?? lastMarkdownDoc.lineCount;
              } else throw new Error(t('Open a Markdown file to create a task, or set tasksmd.calendar.newTaskFile.'));
            }
          }
          this.deps.log(`task/create -> ${target.toString()} line ${line}: ${task.description}`);
          await this.deps.editService.insertNewTask(target, line, task, msg.notes);
          break;
        }
        case 'task/open': {
          const task = this.deps.index.taskAt(msg.key, msg.line);
          if (task) await vscode.commands.executeCommand('tasksmd.openTask', task);
          break;
        }
        case 'task/edit': {
          const task = this.deps.index.taskAt(msg.key, msg.line);
          if (task) await vscode.commands.executeCommand('tasksmd.createOrEdit', task);
          break;
        }
        case 'task/load': {
          const today = this.today();
          let task = msg.key !== null && msg.line !== null ? this.deps.index.taskAt(msg.key, msg.line) : undefined;
          if (!task && msg.key !== null && msg.line !== null) {
            // The index may lag behind the editor (debounce) — read the line straight from the document.
            try {
              const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(msg.key));
              if (msg.line < doc.lineCount) {
                const parsed = parseTaskLine(doc.lineAt(msg.line).text, {
                  statusRegistry: this.deps.getStatusRegistry(),
                  globalFilter: this.deps.settings.get('globalFilter') || undefined,
                  location: { key: msg.key, path: vscode.workspace.asRelativePath(doc.uri, false), line: msg.line, heading: null, frontmatterTags: [], depth: 0, parentLine: null },
                });
                if (parsed) {
                  task = parsed;
                  this.deps.indexService?.indexText(doc.uri, doc.getText());
                }
              }
            } catch (err) {
              this.deps.log(`task/load: could not read ${msg.key}: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
          this.deps.log(`task/load key=${msg.key} line=${msg.line} -> ${task ? 'edit "' + task.description + '"' : 'new task'}`);
          const candidates = this.deps.index.all().filter((t) => !t.isCompleted && t !== task).map((t) => toTaskDto(t, this.deps.index, today));
          const deps = task ? dependants(task, this.deps.index).map((t) => toTaskDto(t, this.deps.index, today)) : [];
          const dto = task ? toTaskDto(task, this.deps.index, today) : null;
          if (dto) {
            // Notes straight from the document: the fallback parse above has none, and the index may lag.
            try {
              const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(dto.key));
              dto.notes = noteBlock(doc.getText().split('\n'), dto.line).notes.map((n) => ({ line: n.line, text: n.text }));
            } catch { /* keep the indexed notes */ }
          }
          this.send({ type: 'task/loaded', requestId: msg.requestId, task: dto, candidates, dependants: deps });
          break;
        }
        case 'query/explain': {
          const r = this.deps.queries.run(msg.query);
          this.send({ type: 'query/explained', requestId: msg.requestId, explain: this.deps.queries.explain(msg.query), errors: [...r.errors.map((e) => `Line ${e.line}: ${e.message}`), ...r.runtimeErrors], matched: r.matched });
          break;
        }
        case 'query/save': {
          const existing = msg.id ? this.deps.savedQueries.byId(msg.id) : undefined;
          if (existing?.source === 'file' && existing.uri) {
            const doc = await vscode.workspace.openTextDocument(existing.uri);
            const text = doc.getText();
            const fenced = /```tasks[^\n]*\n[\s\S]*?```/.test(text) ? text.replace(/(```tasks[^\n]*\n)[\s\S]*?(```)/, (_, a, b) => `${a}${msg.query.trim()}\n${b}`) : `# ${msg.name}\n\n\`\`\`tasks\n${msg.query.trim()}\n\`\`\`\n`;
            const edit = new vscode.WorkspaceEdit();
            edit.replace(existing.uri, new vscode.Range(0, 0, doc.lineCount, 0), text.replace(/^#\s+.+$/m, `# ${msg.name}`) === text && !text.startsWith('# ') ? fenced : fenced.replace(/^#\s+.+$/m, `# ${msg.name}`));
            await vscode.workspace.applyEdit(edit);
            await doc.save();
          } else if (existing?.source === 'settings') {
            const idx = Number(existing.id.split(':')[1]);
            const list = this.deps.settings.get('savedQueries').map((q, i) => (i === idx ? { name: msg.name, query: msg.query } : q));
            await this.deps.settings.update('savedQueries', list, vscode.ConfigurationTarget.Workspace);
          } else if (msg.destination === 'file') {
            await this.deps.savedQueries.createFile(msg.name, msg.query.trim());
          } else {
            await this.deps.savedQueries.saveToSettings(msg.name, msg.query.trim());
          }
          void vscode.window.showInformationMessage(t('Saved query "{0}".', msg.name));
          break;
        }
        case 'query/insert': {
          const editor = vscode.window.activeTextEditor ?? vscode.window.visibleTextEditors.find((e) => e.document.languageId === 'markdown');
          if (!editor || editor.document.languageId !== 'markdown') throw new Error(t('Open a Markdown file to insert a query block.'));
          await editor.insertSnippet(new vscode.SnippetString('```tasks\n' + msg.query.trim().replace(/\$/g, '\\$') + '\n```\n$0'));
          await vscode.window.showTextDocument(editor.document, editor.viewColumn);
          break;
        }
        case 'stats/request': {
          const stats = computeWeeklyStats(this.deps.index.all(), { today: this.today(), weeks: msg.weeks, tag: msg.tag ?? undefined, folder: msg.folder ?? undefined });
          this.send({ type: 'stats/result', requestId: msg.requestId, stats });
          break;
        }
        case 'recurrence/validate': {
          const r = Recurrence.fromText(msg.text, { start: null, scheduled: null, due: null }, { today: this.today() });
          this.send({ type: 'recurrence/validated', requestId: msg.requestId, valid: r !== null, canonical: r ? r.toText() : null });
          break;
        }
        case 'ui/notify':
          if (msg.level === 'error') void vscode.window.showErrorMessage(msg.message);
          else if (msg.level === 'warn') void vscode.window.showWarningMessage(msg.message);
          else void vscode.window.showInformationMessage(msg.message);
          break;
        case 'ui/close':
          this.onClose?.();
          break;
        case 'ui/fullscreen':
          await this.onFullscreen?.(msg.on);
          break;
      }
    } catch (err) {
      const message = err instanceof StaleLineError ? t('The file changed since it was indexed; it has been re-read. Please try again.') : err instanceof Error ? err.message : String(err);
      this.deps.log(`webview ${this.options.app}: ${message}`);
      this.send({ type: 'error', message });
      void vscode.window.showErrorMessage(t('Tasks: {0}', message));
    }
  }

  onClose?: () => void;
  /** Set by panel openers: maximize/restore the panel's layout (see PanelFullscreen). */
  onFullscreen?: (on: boolean) => Promise<void>;

  private async resolveDependencyRefs(list: string[]): Promise<string[]> {
    const out: string[] = [];
    for (const entry of list) {
      if (!entry.startsWith('@')) { out.push(entry); continue; }
      const hash = entry.lastIndexOf('#');
      const key = entry.slice(1, hash), line = Number(entry.slice(hash + 1));
      const t = this.deps.index.taskAt(key, line);
      if (!t) continue;
      if (t.id) { out.push(t.id); continue; }
      const id = generateTaskId((x) => this.deps.index.byId(x).length > 0 || out.includes(x));
      await this.deps.editService.update(t, { id });
      out.push(id);
    }
    return out;
  }
  private async applyFields(task: Task, fields: Partial<Record<TaskFieldName, string | string[] | null>>, notes?: string[]): Promise<void> {
    const { status, ...rest } = fields;
    if (Array.isArray(rest.dependsOn)) rest.dependsOn = await this.resolveDependencyRefs(rest.dependsOn);
    let current = this.deps.index.taskAt(task.location.key, task.location.line) ?? task;
    if (Object.keys(rest).length) current = await this.deps.editService.update(current, applyFieldValues(current, rest).toFields(), notes);
    else if (notes) await this.deps.editService.setNotes(current, notes);
    if (typeof status === 'string') {
      const target = this.deps.getStatusRegistry().bySymbol(status);
      const fresh = this.deps.index.taskAt(current.location.key, current.location.line) ?? current;
      if (fresh.status.symbol !== target.symbol) await this.deps.editService.setStatus(fresh, target);
    }
  }

  private html(webview: vscode.Webview): string {
    const nonce = Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 62)]).join('');
    const script = webview.asWebviewUri(vscode.Uri.joinPath(this.deps.context.extensionUri, 'dist', 'webviews', `${this.options.app}.js`));
    const css = webview.asWebviewUri(vscode.Uri.joinPath(this.deps.context.extensionUri, 'dist', 'webviews', `${this.options.app}.css`));
    return `<!DOCTYPE html>
<html lang="${vscode.env.language}">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource};">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${css}">
<title>${this.options.title}</title>
</head>
<body>
<div id="app"></div>
<script nonce="${nonce}" src="${script}"></script>
</body>
</html>`;
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose();
    this.disposables.length = 0;
    this.webview = null;
  }
}
