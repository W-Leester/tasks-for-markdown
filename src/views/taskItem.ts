import * as vscode from 'vscode';
import { PRIORITY_EMOJI, Priority, type Task } from '../core/task';
import type { Settings } from '../settings/Settings';
import { t } from '../l10n';

const PRIORITY_ICON: Partial<Record<Priority, string>> = {
  [Priority.Highest]: 'triangle-up',
  [Priority.High]: 'arrow-up',
  [Priority.Medium]: 'arrow-small-up',
  [Priority.Low]: 'arrow-small-down',
  [Priority.Lowest]: 'arrow-down',
};
const PRIORITY_COLOR: Partial<Record<Priority, string>> = {
  [Priority.Highest]: 'errorForeground',
  [Priority.High]: 'editorWarning.foreground',
  [Priority.Medium]: 'editorInfo.foreground',
  [Priority.Low]: 'descriptionForeground',
  [Priority.Lowest]: 'disabledForeground',
};

export function displayDescription(task: Task, settings: Settings): string {
  let d = task.description;
  const gf = settings.get('globalFilter');
  if (gf && settings.get('removeGlobalFilterFromDescription')) d = d.replace(gf, '').replace(/\s{2,}/g, ' ').trim();
  return d || t('(empty task)');
}

/** One task row shared by every tree (smart views, saved queries). */
export function taskTreeItem(task: Task, settings: Settings, opts: { showFile?: boolean; idPrefix?: string } = {}): vscode.TreeItem {
  const item = new vscode.TreeItem(displayDescription(task, settings), vscode.TreeItemCollapsibleState.None);
  item.id = `${opts.idPrefix ?? 'task'}:${task.location.key}#${task.location.line}`;
  item.checkboxState = task.isCompleted ? vscode.TreeItemCheckboxState.Checked : vscode.TreeItemCheckboxState.Unchecked;
  item.contextValue = task.isCompleted ? 'task.completed' : 'task';
  const parts: string[] = [];
  if (task.due) parts.push(`📅 ${task.due.format()}`);
  else if (task.scheduled) parts.push(`⏳ ${task.scheduled.format()}`);
  else if (task.start) parts.push(`🛫 ${task.start.format()}`);
  if (task.recurrenceText) parts.push('🔁');
  if (task.dependsOn.length) parts.push('⛔');
  if (opts.showFile !== false) parts.push(task.location.path.split('/').pop() ?? task.location.path);
  item.description = parts.join(' · ');
  item.tooltip = tooltip(task);
  item.command = { command: 'tasksmd.openTask', title: 'Open', arguments: [task] };
  if (task.priority !== Priority.None) item.iconPath = new vscode.ThemeIcon(PRIORITY_ICON[task.priority]!, new vscode.ThemeColor(PRIORITY_COLOR[task.priority]!));
  return item;
}

function tooltip(task: Task): vscode.MarkdownString {
  const md = new vscode.MarkdownString();
  md.appendMarkdown(`**${task.description || '(empty)'}**\n\n`);
  const rows: string[] = [`Status: \`[${task.status.symbol}]\` ${task.status.name}`];
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

export function isTaskNode(node: unknown): node is { kind: 'task'; task: Task } {
  return !!node && typeof node === 'object' && (node as { kind?: string }).kind === 'task';
}
