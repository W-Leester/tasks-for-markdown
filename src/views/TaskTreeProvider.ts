import * as vscode from 'vscode';
import { dayjs } from '../core/dates/dayjs';
import type { TaskIndex } from '../core/index';
import { PRIORITY_EMOJI, Priority, type Task } from '../core/task';
import { GROUP_MODES, type GroupMode, SMART_VIEWS, type SmartViewId, groupTasks, runSmartView } from '../core/views';
import type { Settings } from '../settings/Settings';

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
        const item = new vscode.TreeItem(vscode.l10n.t(def.labelKey), node.id === 'open' ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Collapsed);
        item.id = `smart:${node.id}`;
        item.iconPath = new vscode.ThemeIcon(def.icon, node.id === 'overdue' && count ? new vscode.ThemeColor('errorForeground') : undefined);
        item.description = String(count);
        item.contextValue = 'smartView';
        return item;
      }
      case 'group': {
        const item = new vscode.TreeItem(node.literal ? node.label : vscode.l10n.t(node.label), vscode.TreeItemCollapsibleState.Expanded);
        item.id = `group:${node.id}`;
        item.description = String(node.tasks.length);
        item.iconPath = new vscode.ThemeIcon(this.groupMode === 'file' ? 'markdown' : 'folder');
        item.contextValue = 'group';
        return item;
      }
      case 'task':
        return this.taskItem(node.task);
      case 'more': {
        const item = new vscode.TreeItem(vscode.l10n.t('… {0} more (narrow with the filter)', node.count));
        item.iconPath = new vscode.ThemeIcon('ellipsis');
        return item;
      }
    }
  }

  private taskItem(task: Task): vscode.TreeItem {
    const item = new vscode.TreeItem(this.displayDescription(task), vscode.TreeItemCollapsibleState.None);
    item.id = `task:${task.location.key}#${task.location.line}`;
    item.checkboxState = task.isCompleted ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked;
    item.contextValue = task.isCompleted ? 'task.completed' : 'task';
    item.description = this.secondary(task);
    item.tooltip = this.tooltip(task);
    item.command = { command: 'tasksmd.openTask', title: 'Open', arguments: [task] };
    if (task.priority !== Priority.None) item.iconPath = new vscode.ThemeIcon(PRIORITY_ICON[task.priority]!, PRIORITY_COLOR[task.priority]);
    return item;
  }

  private displayDescription(task: Task): string {
    let d = task.description;
    const gf = this.deps.settings.get('globalFilter');
    if (gf && this.deps.settings.get('removeGlobalFilterFromDescription')) d = d.replace(gf, '').replace(/\s{2,}/g, ' ').trim();
    return d || vscode.l10n.t('(empty task)');
  }

  private secondary(task: Task): string {
    const parts: string[] = [];
    if (task.due) parts.push(`📅 ${task.due.format()}`);
    else if (task.scheduled) parts.push(`⏳ ${task.scheduled.format()}`);
    else if (task.start) parts.push(`🛫 ${task.start.format()}`);
    if (task.recurrenceText) parts.push('🔁');
    if (task.dependsOn.length) parts.push('⛔');
    if (this.groupMode !== 'file') parts.push(task.location.path.split('/').pop() ?? task.location.path);
    return parts.join(' · ');
  }

  private tooltip(task: Task): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${task.description || '(empty)'}**\n\n`);
    const rows: string[] = [];
    rows.push(`Status: \`[${task.status.symbol}]\` ${task.status.name}`);
    if (task.priority !== Priority.None) rows.push(`Priority: ${PRIORITY_EMOJI[task.priority]} ${task.priority}`);
    for (const [label, f] of [['Created', task.created], ['Start', task.start], ['Scheduled', task.scheduled], ['Due', task.due], ['Done', task.done], ['Cancelled', task.cancelled]] as const) {
      if (f) rows.push(`${label}: ${f.format()}${f.valid ? '' : ' ⚠ invalid'}`);
    }
    if (task.recurrenceText) rows.push(`Repeats: ${task.recurrenceText}`);
    if (task.id) rows.push(`Id: ${task.id}`);
    if (task.dependsOn.length) rows.push(`Depends on: ${task.dependsOn.join(', ')}`);
    md.appendMarkdown(rows.map((r) => `- ${r}`).join('\n'));
    md.appendMarkdown(`\n\n${task.location.path}:${task.location.line + 1}`);
    return md;
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

const PRIORITY_ICON: Partial<Record<Priority, string>> = {
  [Priority.Highest]: 'triangle-up',
  [Priority.High]: 'arrow-up',
  [Priority.Medium]: 'arrow-small-up',
  [Priority.Low]: 'arrow-small-down',
  [Priority.Lowest]: 'arrow-down',
};
const PRIORITY_COLOR: Partial<Record<Priority, vscode.ThemeColor>> = {
  [Priority.Highest]: new vscode.ThemeColor('errorForeground'),
  [Priority.High]: new vscode.ThemeColor('editorWarning.foreground'),
  [Priority.Medium]: new vscode.ThemeColor('editorInfo.foreground'),
  [Priority.Low]: new vscode.ThemeColor('descriptionForeground'),
  [Priority.Lowest]: new vscode.ThemeColor('disabledForeground'),
};

export function isTaskNode(node: unknown): node is { kind: 'task'; task: Task } {
  return !!node && typeof node === 'object' && (node as { kind?: string }).kind === 'task';
}

export { GROUP_MODES };
