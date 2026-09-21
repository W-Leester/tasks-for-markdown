import * as vscode from 'vscode';
import type { GroupNode } from '../core/query';
import type { Task } from '../core/task';
import type { QueryService } from '../services/QueryService';
import type { SavedQuery, SavedQueryStore } from '../services/SavedQueryStore';
import type { Settings } from '../settings/Settings';
import { taskTreeItem } from './taskItem';
import { t } from '../l10n';

export const SAVED_QUERY_VIEW_ID = 'tasksmd.savedQueries';
const MAX_VISIBLE = 1000;

type Node =
  | { kind: 'query'; query: SavedQuery }
  | { kind: 'group'; queryId: string; path: string; node: GroupNode }
  | { kind: 'task'; task: Task }
  | { kind: 'error'; message: string }
  | { kind: 'more'; count: number };

export interface SavedQueryTreeDeps {
  store: SavedQueryStore;
  queries: QueryService;
  settings: Settings;
}

/** Sidebar view listing saved queries; each expands into its (grouped) results (FR-5.5 ~ FR-5.7). */
export class SavedQueryTreeProvider implements vscode.TreeDataProvider<Node>, vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly deps: SavedQueryTreeDeps) {
    this.disposables.push(deps.store.onDidChange(() => this.refresh()), deps.queries.onDidChange(() => this.refresh()), deps.settings.onDidChange(() => this.refresh(), ['globalFilter', 'removeGlobalFilterFromDescription']));
  }

  refresh(): void {
    this.changeEmitter.fire(undefined);
  }

  getChildren(element?: Node): Node[] {
    if (!element) return this.deps.store.all().map((query) => ({ kind: 'query', query }));
    if (element.kind === 'query') {
      const result = this.deps.queries.run(element.query.query, element.query.uri ? { path: vscode.workspace.asRelativePath(element.query.uri) } : undefined);
      if (result.errors.length) return result.errors.map((e) => ({ kind: 'error' as const, message: t('Line {0}: {1} — {2}', e.line, e.text, e.message) }));
      const nodes = this.groupChildren(element.query.id, '', result.root);
      if (result.runtimeErrors.length) nodes.unshift({ kind: 'error', message: result.runtimeErrors[0]! });
      return nodes;
    }
    if (element.kind === 'group') return this.groupChildren(element.queryId, element.path, element.node);
    return [];
  }

  private groupChildren(queryId: string, path: string, node: GroupNode): Node[] {
    if (node.children.length) return node.children.map((c) => ({ kind: 'group' as const, queryId, path: `${path}/${c.name}`, node: c }));
    const tasks = node.tasks.slice(0, MAX_VISIBLE).map((task) => ({ kind: 'task' as const, task }));
    const out: Node[] = tasks;
    if (node.tasks.length > MAX_VISIBLE) out.push({ kind: 'more', count: node.tasks.length - MAX_VISIBLE });
    return out;
  }

  getTreeItem(node: Node): vscode.TreeItem {
    switch (node.kind) {
      case 'query': {
        const item = new vscode.TreeItem(node.query.name, vscode.TreeItemCollapsibleState.Collapsed);
        item.id = `sq:${node.query.id}`;
        item.iconPath = new vscode.ThemeIcon(node.query.source === 'file' ? 'markdown' : 'settings-gear');
        try {
          const r = this.deps.queries.run(node.query.query, node.query.uri ? { path: vscode.workspace.asRelativePath(node.query.uri) } : undefined);
          item.description = r.errors.length ? '$(error)' : String(r.matched);
        } catch {
          item.description = '$(error)';
        }
        item.tooltip = new vscode.MarkdownString().appendCodeblock(node.query.query, 'tasks');
        item.contextValue = node.query.source === 'file' ? 'savedQuery.file' : 'savedQuery.settings';
        return item;
      }
      case 'group': {
        const item = new vscode.TreeItem(node.node.name, vscode.TreeItemCollapsibleState.Expanded);
        item.id = `sqg:${node.queryId}${node.path}`;
        item.description = String(node.node.count);
        item.iconPath = new vscode.ThemeIcon('folder');
        item.contextValue = 'group';
        return item;
      }
      case 'task':
        return taskTreeItem(node.task, this.deps.settings, { idPrefix: 'sqt' });
      case 'error': {
        const item = new vscode.TreeItem(node.message);
        item.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
        item.tooltip = node.message;
        return item;
      }
      case 'more': {
        const item = new vscode.TreeItem(t('… {0} more', node.count));
        item.iconPath = new vscode.ThemeIcon('ellipsis');
        return item;
      }
    }
  }

  dispose(): void {
    this.changeEmitter.dispose();
    for (const d of this.disposables) d.dispose();
  }
}
