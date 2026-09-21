import * as vscode from 'vscode';
import { describeRelative, systemClock, type Clock } from '../core/dates';
import type { TaskIndex } from '../core/index';
import { PRIORITY_EMOJI, PRIORITY_NAME, Priority, type DateFieldName, type StatusRegistry, type Task, isTaskLine, parseTaskLine, urgency } from '../core/task';
import { isBlocked, isBlocking } from '../core/index';
import type { Settings } from '../settings/Settings';
import { overdueText, relativeText } from './relativeText';
import { t } from '../l10n';

export interface HoverDeps {
  index: TaskIndex;
  settings: Settings;
  getStatusRegistry(): StatusRegistry;
  clock?: Clock;
}

const DATE_LABEL: Record<DateFieldName, string> = { created: 'Created', start: 'Start', scheduled: 'Scheduled', due: 'Due', done: 'Done', cancelled: 'Cancelled' };
const DATE_ICON: Record<DateFieldName, string> = { created: '➕', start: '🛫', scheduled: '⏳', due: '📅', done: '✅', cancelled: '❌' };

/** Hover card for a task line with its fields, dependency links and command links (FR-3.9 / FR-3.10). */
export class TaskHoverProvider implements vscode.HoverProvider {
  constructor(private readonly deps: HoverDeps) {}

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const text = document.lineAt(position.line).text;
    if (!isTaskLine(text)) return undefined;
    const task = parseTaskLine(text, {
      statusRegistry: this.deps.getStatusRegistry(),
      globalFilter: this.deps.settings.get('globalFilter') || undefined,
      location: { key: document.uri.toString(), path: vscode.workspace.asRelativePath(document.uri), line: position.line, heading: null, frontmatterTags: [], depth: 0, parentLine: null },
    });
    if (!task) return undefined;
    const md = this.render(task);
    return new vscode.Hover(md, document.lineAt(position.line).range);
  }

  render(task: Task): vscode.MarkdownString {
    const today = (this.deps.clock ?? systemClock).now().startOf('day');
    const md = new vscode.MarkdownString(undefined, true);
    md.isTrusted = { enabledCommands: ['tasksmd.markDone', 'tasksmd.reopen', 'tasksmd.markCancelled', 'tasksmd.setPriority', 'tasksmd.setDueDate', 'tasksmd.postpone', 'tasksmd.createOrEdit', 'tasksmd.openTask'] };
    const arg = encodeURIComponent(JSON.stringify([taskRef(task)]));
    const cmd = (id: string, label: string) => `[${label}](command:${id}?${arg})`;

    md.appendMarkdown(`**${escape(task.description) || t('(empty task)')}**\n\n`);
    const rows: string[] = [];
    rows.push(`\`[${task.status.symbol}]\` ${task.status.name} · ${task.status.type}`);
    if (task.priority !== Priority.None) rows.push(`${PRIORITY_EMOJI[task.priority]} ${t('Priority')}: ${PRIORITY_NAME[task.priority]}`);
    for (const name of ['due', 'scheduled', 'start', 'created', 'done', 'cancelled'] as DateFieldName[]) {
      const f = task[name];
      if (!f) continue;
      let rel = '';
      if (f.date) {
        const r = describeRelative(f.date, today);
        rel = name === 'due' && f.date.isBefore(today) && !task.isCompleted ? ` — ⚠ ${overdueText(r)}` : ` — ${relativeText(r)}`;
      } else rel = ` — ⚠ ${t('invalid date')}`;
      rows.push(`${DATE_ICON[name]} ${t(DATE_LABEL[name])}: ${f.format()}${rel}`);
    }
    if (task.recurrenceText) rows.push(`🔁 ${t('Repeats')}: ${escape(task.recurrenceText)}`);
    if (task.onCompletion) rows.push(`🏁 ${t('On completion')}: ${task.onCompletion}`);
    if (task.id) {
      const dependants = this.deps.index.all().filter((t) => t.dependsOn.includes(task.id!));
      rows.push(`🆔 ${task.id}` + (dependants.length ? ` — ${t('blocks')} ${dependants.map((t) => this.link(t)).join(', ')}` : '') + (isBlocking(task, this.deps.index) ? ` (**${t('blocking')}**)` : ''));
    }
    if (task.dependsOn.length) {
      const items = task.dependsOn.map((id) => {
        const found = this.deps.index.byId(id);
        if (!found.length) return `\`${id}\` (${t('not found')})`;
        return found.map((t) => `${this.link(t)}${t.isCompleted ? ' ✅' : ''}`).join(', ');
      });
      rows.push(`⛔ ${t('Depends on')}: ${items.join('; ')}` + (isBlocked(task, this.deps.index) ? ` — **${t('blocked')}**` : ''));
    }
    if (task.tags.length) rows.push(`🏷 ${task.tags.map(escape).join(' ')}`);
    if (!task.isCompleted) rows.push(`🔥 ${t('Urgency')}: ${urgency(task, today).toFixed(2)}`);
    md.appendMarkdown(rows.map((r) => `- ${r}`).join('\n') + '\n\n');

    const actions = task.isCompleted
      ? [cmd('tasksmd.reopen', `$(debug-restart) ${t('Reopen')}`)]
      : [cmd('tasksmd.markDone', `$(check) ${t('Done')}`), cmd('tasksmd.markCancelled', `$(circle-slash) ${t('Cancel')}`), cmd('tasksmd.setPriority', `$(arrow-up) ${t('Priority')}`), cmd('tasksmd.setDueDate', `📅 ${t('Due')}`), cmd('tasksmd.postpone', `$(watch) ${t('Postpone')}`)];
    actions.push(cmd('tasksmd.createOrEdit', `$(edit) ${t('Edit')}`));
    md.appendMarkdown(actions.join(' · '));
    return md;
  }

  private link(t: Task): string {
    const arg = encodeURIComponent(JSON.stringify([taskRef(t)]));
    return `[${escape(t.description.slice(0, 40)) || t.id || '?'}](command:tasksmd.openTask?${arg} "${escape(t.location.path)}:${t.location.line + 1}")`;
  }
}

/** Serialisable pointer to a task for command: links (a Task instance can't cross the URI). */
export interface TaskRef {
  key: string;
  line: number;
}
export function taskRef(t: Task): TaskRef {
  return { key: t.location.key, line: t.location.line };
}

function escape(s: string): string {
  return s.replace(/[\\`*_{}[\]()#+\-.!|<>]/g, (c) => '\\' + c);
}
