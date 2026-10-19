import * as vscode from 'vscode';
import { type Clock, type Dayjs, describeRelative, parseNaturalDate, systemClock } from '../core/dates';
import { isValidRecurrenceText } from '../core/recurrence';
import { DateField, PRIORITY_EMOJI, PRIORITY_NAME, Priority, type Task } from '../core/task';
import { type CommandDeps, resolveTargetTasks, runEdit, tasksAtCursors } from '../commands/registerCommands';
import { relativeText } from './relativeText';
import { t } from '../l10n';

export type InlinePickKind = 'priority' | 'due' | 'scheduled' | 'start' | 'recurrence';

/** One choice of the drop-down; `value` goes to `apply` unchanged. */
interface Choice {
  label: string;
  description?: string;
  filter: string;
  value: unknown;
  /** Built from what was typed (a parsed date, a valid rule): always shown. */
  typed?: boolean;
}

interface Pending {
  kind: InlinePickKind;
  key: string;
  line: number;
  start: vscode.Position;
}

const PRIORITIES: Priority[] = [Priority.Highest, Priority.High, Priority.Medium, Priority.None, Priority.Low, Priority.Lowest];
const PRIORITY_LABEL: Record<Priority, string> = {
  [Priority.Highest]: 'Highest',
  [Priority.High]: 'High',
  [Priority.Medium]: 'Medium',
  [Priority.None]: 'Normal',
  [Priority.Low]: 'Low',
  [Priority.Lowest]: 'Lowest',
};
const RECURRENCES = ['every day', 'every weekday', 'every week', 'every 2 weeks', 'every month', 'every month on the last', 'every year', 'every week when done', 'every day when done'];
/** Longer than any date or rule anyone types into the drop-down: past it, the user is writing, not picking. */
const MAX_TYPED = 60;

/**
 * The task buttons' pickers as a drop-down on the task line (M31). A QuickPick always opens at the top of the window;
 * only the suggestion list opens where the cursor is. The button puts the cursor at the end of the line, remembers
 * what is being picked and opens the suggestion list, which `TaskCompletionProvider` fills from `items`. A choice
 * inserts nothing (the typed filter text is removed) and runs `tasksmd.inlinePick.apply`.
 */
export class InlinePicker {
  private pending: Pending | null = null;

  constructor(private readonly deps: CommandDeps & { clock?: Clock }) {}

  register(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
      vscode.commands.registerCommand('tasksmd.inlinePick', (arg: { kind: InlinePickKind; task: Task }) => this.open(arg.kind, arg.task)),
      vscode.commands.registerCommand('tasksmd.inlinePick.apply', (arg: { kind: InlinePickKind; value: unknown }) => this.apply(arg.kind, arg.value)),
    );
  }

  private async open(kind: InlinePickKind, task: Task): Promise<void> {
    const key = task.location.key;
    const visible = vscode.window.activeTextEditor?.document.uri.toString() === key
      ? vscode.window.activeTextEditor
      : vscode.window.visibleTextEditors.find((e) => e.document.uri.toString() === key);
    if (!visible) {
      // No editor showing the line (cannot happen from a button): the top QuickPick still works.
      await vscode.commands.executeCommand(FALLBACK[kind], task);
      return;
    }
    const editor = await vscode.window.showTextDocument(visible.document, visible.viewColumn);
    const line = task.location.line;
    const end = editor.document.lineAt(line).range.end;
    editor.selection = new vscode.Selection(end, end);
    this.pending = { kind, key, line, start: end };
    await vscode.commands.executeCommand('editor.action.triggerSuggest');
  }

  /** The drop-down's items while a pick is open at `position`, else undefined (the normal suggestions apply). */
  items(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionList | undefined {
    const p = this.pending;
    if (!p) return undefined;
    if (document.uri.toString() !== p.key || position.line !== p.line || position.isBefore(p.start) || position.character - p.start.character > MAX_TYPED) {
      this.pending = null;
      return undefined;
    }
    const range = new vscode.Range(p.start, position);
    const typed = document.getText(range).trim();
    const task = resolveTargetTasks({ key: p.key, line: p.line }, this.deps)[0]; // for ✓ on the current value
    // We filter, not the editor: it compares everything typed since the button ("next f") with each item and closes
    // the list for good when nothing matches, so every item carries the typed text as its filter text.
    const needle = typed.toLowerCase();
    const choices = this.choices(p.kind, task, typed).filter((c) => !needle || c.typed || c.filter.toLowerCase().split(' ').some((w) => w.startsWith(needle)) || c.filter.toLowerCase().includes(needle));
    // Half-typed ("next f"): an empty list would close for good, so say it is not a date yet and keep it open.
    if (!choices.length && typed && p.kind !== 'priority') {
      choices.push({ label: `⚠ ${typed}`, description: t(p.kind === 'recurrence' ? 'not a recognised rule' : 'not a recognised date'), filter: typed, value: undefined, typed: true });
    }
    const items = choices.map((c, i) => {
      const item = new vscode.CompletionItem({ label: c.label, description: c.description }, vscode.CompletionItemKind.Value);
      item.range = range;
      item.filterText = document.getText(range);
      item.sortText = String(i).padStart(3, '0');
      if (c.value === undefined) {
        item.insertText = document.getText(range); // picking it leaves what was typed
      } else {
        item.insertText = '';
        item.command = { command: 'tasksmd.inlinePick.apply', title: c.label, arguments: [{ kind: p.kind, value: c.value }] };
      }
      return item;
    });
    if (items[0]) items[0].preselect = true;
    // Ask again on every key: the filtering and the typed date or rule are ours.
    return new vscode.CompletionList(items, true);
  }

  private choices(kind: InlinePickKind, task: Task | undefined, typed: string): Choice[] {
    const today = (this.deps.clock ?? systemClock).now().startOf('day');
    const fmt = (d: Dayjs) => `${d.format('YYYY-MM-DD')} (${d.format('ddd')}) · ${relativeText(describeRelative(d, today))}`;
    switch (kind) {
      case 'priority':
        return PRIORITIES.map((p) => ({
          label: `${PRIORITY_EMOJI[p] || '　'} ${t(PRIORITY_LABEL[p])}`,
          description: p === task?.priority ? '✓' : undefined,
          filter: `${PRIORITY_NAME[p]} ${t(PRIORITY_LABEL[p])}`,
          value: p,
        }));
      case 'due':
      case 'scheduled':
      case 'start': {
        const monday = today.add((8 - today.day()) % 7 || 7, 'day');
        const friday = today.add((5 - today.day() + 7) % 7 || 7, 'day');
        const presets: [string, Dayjs][] = [
          ['Today', today], ['Tomorrow', today.add(1, 'day')], ['Friday', friday], ['Next Monday', monday],
          ['In 1 week', today.add(7, 'day')], ['In 2 weeks', today.add(14, 'day')], ['Next month', today.add(1, 'month')],
        ];
        const out: Choice[] = [];
        const parsed = typed ? parseNaturalDate(typed, today) : null;
        if (parsed) out.push({ label: `→ ${parsed.format('YYYY-MM-DD')}`, description: fmt(parsed), filter: typed, value: parsed, typed: true });
        for (const [name, d] of presets) out.push({ label: `📅 ${t(name)}`, description: fmt(d), filter: `${name} ${t(name)}`, value: d });
        const current = task?.[kind];
        if (current) out.push({ label: `🗑 ${t('Remove')}`, description: current.format(), filter: `remove ${t('Remove')}`, value: null });
        return out;
      }
      case 'recurrence': {
        const out: Choice[] = [];
        if (typed && isValidRecurrenceText(typed)) out.push({ label: `→ ${typed}`, description: t('valid rule'), filter: typed, value: typed, typed: true });
        for (const r of RECURRENCES) out.push({ label: `🔁 ${r}`, description: r === task?.recurrenceText ? '✓' : undefined, filter: r, value: r });
        if (task?.recurrenceText) out.push({ label: `🗑 ${t('Remove recurrence')}`, filter: `remove ${t('Remove recurrence')}`, value: null });
        return out;
      }
    }
  }

  private apply(kind: InlinePickKind, value: unknown): Promise<void> {
    this.pending = null;
    return runEdit(this.deps, async () => {
      const editor = vscode.window.activeTextEditor;
      // Re-read the line: the typed filter text was just removed, the index may not know yet.
      const task = editor ? tasksAtCursors(editor, this.deps)[0] : undefined;
      if (!task) return;
      const edit = this.deps.editService;
      if (kind === 'priority') await edit.update(task, { priority: value as Priority });
      else if (kind === 'recurrence') await edit.update(task, { recurrenceText: value as string | null });
      else await edit.update(task, { [kind]: value === null ? null : DateField.fromDate(value as Dayjs) });
    });
  }
}

const FALLBACK: Record<InlinePickKind, string> = {
  priority: 'tasksmd.setPriority',
  due: 'tasksmd.setDueDate',
  scheduled: 'tasksmd.setScheduledDate',
  start: 'tasksmd.setStartDate',
  recurrence: 'tasksmd.setRecurrence',
};
