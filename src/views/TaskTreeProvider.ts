import * as vscode from 'vscode';
import { dayjs } from '../core/dates/dayjs';
import type { TaskIndex } from '../core/index';
import type { Task } from '../core/task';
import { GROUP_MODES, type GroupMode, SMART_VIEWS, type SmartViewId, groupTasks, runSmartView } from '../core/views';
import type { Settings } from '../settings/Settings';
import { taskTreeItem } from './taskItem';
import { t } from '../l10n';

export const TREE_VIEW_ID = 'tasksmd.tasks';
const MAX_VISIBLE = 1000;
const REFRESH_DEBOUNCE_MS = 200;

type Node =
  | { kind: 'smart'; id: SmartViewId }
  | { kind: 'group'; view: SmartViewId; id: string; label: string; literal: boolean; tasks: Task[] }
  | { kind: 'task'; task: Task }
  | { kind: 'more'; count: number };

export interface TaskTreeDeps {
  index: TaskIndex;
  settings: Settings;
  state: vscode.Memento;
}

const STATE_GROUP = 'tree.groupMode';

/** Sidebar tree: smart views → (groups) → tasks with native checkboxes (FR-5.1 ~ FR-5.4). */
export class TaskTreeProvider implements vscode.TreeDataProvider<Node>, vscode.Disposable {
  private readonly changeEmitter = new vscode.EventEmitter<Node | undefined>();
  readonly onDidChangeTreeData = this.changeEmitter.event;
  private readonly disposables: vscode.Disposable[] = [];
  private refreshTimer: NodeJS.Timeout | undefined;
  private filterText = '';
  private groupMode: GroupMode;
  /** Groups are built during getChildren and cached so task nodes can be resolved by id. */
  private groupCache = new Map<string, Node & { kind: 'group' }>();

  constructor(private readonly deps: TaskTreeDeps) {
    this.groupMode = deps.state.get<GroupMode>(STATE_GROUP, 'none');
    const sub = deps.index.onDidChange(() => this.scheduleRefresh());
    this.disposables.push({ dispose: () => sub.dispose() });
    this.disposables.push(deps.settings.onDidChange(() => this.scheduleRefresh(), ['globalFilter', 'removeGlobalFilterFromDescription']));
    void vscode.commands.executeCommand('setContext', 'tasksmd.tree.filterActive', false);
  }

  // ---- state -------------------------------------------------------------------------------

  get filter(): string {
    return this.filterText;
  }

  setFilter(text: string): void {
    this.filterText = text.trim();
    void vscode.commands.executeCommand('setContext', 'tasksmd.tree.filterActive', this.filterText.length > 0);
    this.refresh();
  }

  get grouping(): GroupMode {
    return this.groupMode;
  }

  async setGrouping(mode: GroupMode): Promise<void> {
    this.groupMode = mode;
    await this.deps.state.update(STATE_GROUP, mode);
    this.refresh();
  }

  refresh(): void {
    this.groupCache.clear();
    this.changeEmitter.fire(undefined);
  }

  private scheduleRefresh(): void {
    clearTimeout(this.refreshTimer);
    this.refreshTimer = setTimeout(() => this.refresh(), REFRESH_DEBOUNCE_MS);
  }

  // ---- data ----------------------------------------------------------------------------------

  private tasksFor(view: SmartViewId): Task[] {
    let tasks = runSmartView(view, { index: this.deps.index, today: dayjs() });
    if (this.filterText) {
      const needle = this.filterText.toLowerCase();
      tasks = tasks.filter((t) => t.description.toLowerCase().includes(needle) || t.location.path.toLowerCase().includes(needle));
    }
    return tasks;
  }

  getChildren(element?: Node): Node[] {
    if (!element) return SMART_VIEWS.map((v) => ({ kind: 'smart', id: v.id }));
    if (element.kind === 'smart') {
      const tasks = this.tasksFor(element.id);
      if (this.groupMode === 'none') return this.taskNodes(tasks);
      const groups = groupTasks(tasks, this.groupMode, dayjs());
      return groups.map((g) => {
        const node: Node & { kind: 'group' } = { kind: 'group', view: element.id, id: `${element.id}/${g.id}`, label: g.label, literal: g.literal, tasks: g.tasks };
        this.groupCache.set(node.id, node);
        return node;
      });
    }
    if (element.kind === 'group') return this.taskNodes(element.tasks);
    return [];
  }

  private taskNodes(tasks: Task[]): Node[] {
    const nodes: Node[] = tasks.slice(0, MAX_VISIBLE).map((task) => ({ kind: 'task', task }));
    if (tasks.length > MAX_VISIBLE) nodes.push({ kind: 'more', count: tasks.length - MAX_VISIBLE });
    return nodes;
  }

  getTreeItem(node: Node): vscode.TreeItem {
    switch (node.kind) {
      case 'smart': {
        const def = SMART_VIEWS.find((v) => v.id === node.id)!;
        const count = this.tasksFor(node.id).length;
        const item = new vscode.TreeItem(t(def.labelKey), node.id === 'open' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Collapsed);
        item.id = `smart:${node.id}`;
        item.iconPath = new vscode.ThemeIcon(def.icon, node.id === 'overdue' && count ? new vscode.ThemeColor('errorForeground') : undefined);
        item.description = String(count);
        item.contextValue = 'smartView';
        return item;
      }
      case 'group': {
        const item = new vscode.TreeItem(node.literal ? node.label : t(node.label), vscode.TreeItemCollapsibleState.Expanded);
        item.id = `group:${node.id}`;
        item.description = String(node.tasks.length);
        item.iconPath = new vscode.ThemeIcon(this.groupMode === 'file' ? 'markdown' : 'folder');
        item.contextValue = 'group';
        return item;
      }
      case 'task':
        return this.taskItem(node.task);
      case 'more': {
        const item = new vscode.TreeItem(t('… {0} more (narrow with the filter)', node.count));
        item.iconPath = new vscode.ThemeIcon('ellipsis');
        return item;
      }
    }
  }

  private taskItem(task: Task): vscode.TreeItem {
    return taskTreeItem(task, this.deps.settings, { showFile: this.groupMode !== 'file' });
  }

  getParent(): Node | undefined {
    return undefined;
  }

  dispose(): void {
    clearTimeout(this.refreshTimer);
    this.changeEmitter.dispose();
    for (const d of this.disposables) d.dispose();
  }
}

export { GROUP_MODES };
export { isTaskNode } from './taskItem';
