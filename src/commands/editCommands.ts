import * as vscode from 'vscode';
import { systemClock, type Clock } from '../core/dates';
import { DateField, type DateFieldName, Task } from '../core/task';
import { pickDependencies } from '../editor/quickpicks/dependencyPick';
import { pickDate, pickPostpone, pickPriority, pickStatus } from '../editor/quickpicks/pickers';
import { generateTaskId } from '../core/task';
import { type CommandDeps, resolveTargetTasks, runEdit } from './registerCommands';

const DATE_LABEL: Record<DateFieldName, string> = {
  due: 'Due date',
  scheduled: 'Scheduled date',
  start: 'Start date',
  created: 'Created date',
  done: 'Done date',
  cancelled: 'Cancelled date',
};

/** Commands that change one field of the task(s) under the cursor through a QuickPick (FR-3.16). */
export function registerEditCommands(context: vscode.ExtensionContext, deps: CommandDeps, clock: Clock = systemClock): void {
  const register = (id: string, handler: (...args: unknown[]) => unknown) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));

  const forTargets = (arg: unknown, fn: (tasks: Task[]) => Promise<void>) =>
    runEdit(deps, async () => {
      const targets = resolveTargetTasks(arg, deps);
      if (!targets.length) {
        void vscode.window.showInformationMessage(vscode.l10n.t('Place the cursor on a task line (e.g. "- [ ] …") first.'));
        return;
      }
      await fn([...targets].sort((a, b) => b.location.line - a.location.line));
    });

  register('tasksmd.setStatus', (arg) =>
    forTargets(arg, async (tasks) => {
      const status = await pickStatus(deps.getStatusRegistry(), tasks[0]!.status);
      if (!status) return;
      for (const t of tasks) await deps.editService.setStatus(t, status);
    }),
  );

  register('tasksmd.setPriority', (arg) =>
    forTargets(arg, async (tasks) => {
      const priority = await pickPriority(tasks[0]!.priority);
      if (priority === undefined) return;
      for (const t of tasks) await deps.editService.update(t, { priority });
    }),
  );

  const dateCommand = (field: DateFieldName) => (arg: unknown) =>
    forTargets(arg, async (tasks) => {
      const value = await pickDate(vscode.l10n.t(DATE_LABEL[field]), tasks[0]![field], clock);
      if (value === undefined) return;
      for (const t of tasks) await deps.editService.update(t, { [field]: value });
    });
  register('tasksmd.setDueDate', dateCommand('due'));
  register('tasksmd.setScheduledDate', dateCommand('scheduled'));
  register('tasksmd.setStartDate', dateCommand('start'));

  register('tasksmd.postpone', (arg) =>
    forTargets(arg, async (tasks) => {
      const first = tasks[0]!;
      // Postpone whichever of due / scheduled the task has (due wins); a task with neither gets a due date.
      const field: DateFieldName = first.due ? 'due' : first.scheduled ? 'scheduled' : 'due';
      const from = first[field]?.date ?? clock.now().startOf('day');
      const date = await pickPostpone(from, clock);
      if (!date) return;
      for (const t of tasks) {
        const f: DateFieldName = t.due ? 'due' : t.scheduled ? 'scheduled' : 'due';
        await deps.editService.update(t, { [f]: DateField.fromDate(date) });
      }
    }),
  );

  register('tasksmd.setDependencies', (arg) =>
    forTargets(arg, async (tasks) => {
      const target = tasks[0]!;
      const picked = await pickDependencies(deps.index, target);
      if (!picked) return;
      // Give ids to picked tasks that lack one (this edits their lines, in their own files).
      const ids: string[] = [];
      for (const t of picked) {
        if (t.id) {
          ids.push(t.id);
          continue;
        }
        const id = generateTaskId((x) => deps.index.byId(x).length > 0 || ids.includes(x));
        await deps.editService.update(t, { id });
        ids.push(id);
      }
      // Re-read the target in case it lives in a file we just edited (its line text is unchanged,
      // but the index entry was replaced).
      const fresh = deps.index.taskAt(target.location.key, target.location.line) ?? target;
      await deps.editService.update(fresh, { dependsOn: ids });
    }),
  );

  // Temporary create/edit flow (sequential pickers) until the webview modal lands in M6.
  register('tasksmd.createOrEdit', (arg) =>
    runEdit(deps, async () => {
      const editor = vscode.window.activeTextEditor;
      const existing = resolveTargetTasks(arg, deps)[0];
      const description = await vscode.window.showInputBox({
        prompt: existing ? vscode.l10n.t('Edit task description') : vscode.l10n.t('New task description'),
        value: existing?.description ?? '',
        valueSelection: existing ? undefined : [0, 0],
        ignoreFocusOut: true,
      });
      if (description === undefined) return;
      const priority = await pickPriority(existing?.priority);
      if (priority === undefined) return;
      const due = await pickDate(vscode.l10n.t('Due date'), existing?.due ?? null, clock);
      if (due === undefined) return;

      if (existing) {
        await deps.editService.update(existing, { description, priority, due });
        return;
      }
      if (!editor || editor.document.languageId !== 'markdown') {
        void vscode.window.showInformationMessage(vscode.l10n.t('Open a Markdown file to create a task.'));
        return;
      }
      let task = Task.blank(description, deps.getStatusRegistry().bySymbol(' ')).with({ priority, due });
      if (deps.settings.get('setCreatedDate')) task = task.with({ created: DateField.fromDate(clock.now()) });
      const gf = deps.settings.get('globalFilter');
      if (gf && !task.description.includes(gf)) task = task.with({ description: `${gf} ${task.description}`.trim() });
      const line = await deps.editService.insertNewTask(editor.document.uri, editor.selection.active.line, task);
      const pos = editor.document.lineAt(line).range.end;
      editor.selection = new vscode.Selection(pos, pos);
    }),
  );
}
