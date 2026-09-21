import * as vscode from 'vscode';
import { systemClock, type Clock } from '../core/dates';
import { DateField, type DateFieldName, type Task } from '../core/task';
import { pickDependencies } from '../editor/quickpicks/dependencyPick';
import { pickDate, pickPostpone, pickPriority, pickRecurrence, pickStatus } from '../editor/quickpicks/pickers';
import { isValidRecurrenceText } from '../core/recurrence';
import { generateTaskId } from '../core/task';
import { type CommandDeps, resolveTargetTasks, runEdit } from './registerCommands';
import { t } from '../l10n';

const DATE_LABEL: Record<DateFieldName, string> = {
  due: 'Due date',
  scheduled: 'Scheduled date',
  start: 'Start date',
  created: 'Created date',
  done: 'Done date',
  cancelled: 'Cancelled date',
};

/** Commands that change one field of the task(s) under the cursor through a QuickPick (FR-3.16). */
export function registerEditCommands(context: vscode.ExtensionContext, deps: CommandDeps & { openEdit: (target: { key: string | null; line: number | null }) => unknown }, clock: Clock = systemClock): void {
  const register = (id: string, handler: (...args: unknown[]) => unknown) =>
    context.subscriptions.push(vscode.commands.registerCommand(id, handler));

  const forTargets = (arg: unknown, fn: (tasks: Task[]) => Promise<void>) =>
    runEdit(deps, async () => {
      const targets = resolveTargetTasks(arg, deps);
      if (!targets.length) {
        void vscode.window.showInformationMessage(t('Place the cursor on a task line (e.g. "- [ ] …") first.'));
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
      const value = await pickDate(t(DATE_LABEL[field]), tasks[0]![field], clock);
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

  register('tasksmd.setRecurrence', (arg) =>
    forTargets(arg, async (tasks) => {
      const value = await pickRecurrence(tasks[0]!.recurrenceText, isValidRecurrenceText);
      if (value === undefined) return;
      for (const t of tasks) await deps.editService.update(t, { recurrenceText: value });
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

  // Create or edit: opens the webview dialog (FR-6). Edits the task under the cursor / the tree
  // argument. When the focus is elsewhere (Markdown preview, sidebar) there is no cursor, so the
  // previewed / last used Markdown document's tasks are offered in a QuickPick instead.
  let lastMarkdownDoc: vscode.TextDocument | undefined;
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((e) => {
      if (e?.document.languageId === 'markdown') lastMarkdownDoc = e.document;
    }),
  );
  register('tasksmd.createOrEdit', (arg) =>
    runEdit(deps, async () => {
      const existing = resolveTargetTasks(arg, deps)[0];
      if (existing) {
        deps.openEdit({ key: existing.location.key, line: existing.location.line });
        return;
      }
      const active = vscode.window.activeTextEditor;
      if (active?.document.languageId === 'markdown') {
        deps.openEdit({ key: active.document.uri.toString(), line: active.selection.active.line });
        return;
      }
      const doc = vscode.window.visibleTextEditors.find((e) => e.document.languageId === 'markdown')?.document ?? (lastMarkdownDoc && !lastMarkdownDoc.isClosed ? lastMarkdownDoc : undefined);
      if (!doc) {
        deps.openEdit({ key: null, line: null });
        return;
      }
      const key = doc.uri.toString();
      const tasks = deps.index.file(key)?.tasks ?? [];
      const fileName = doc.uri.path.split('/').pop() ?? '';
      const picked = await vscode.window.showQuickPick(
        [
          { label: `$(add) ${t('New task at the end of {0}', fileName)}`, line: doc.lineCount, alwaysShow: true },
          ...tasks.map((task) => ({
            label: `${task.isCompleted ? '$(pass-filled)' : '$(circle-large-outline)'} ${task.description || t('(empty task)')}`,
            description: [task.due ? `📅 ${task.due.format()}` : '', task.location.heading ? `› ${task.location.heading}` : ''].filter(Boolean).join('  '),
            detail: t('line {0}', task.location.line + 1),
            line: task.location.line,
          })),
        ],
        { placeHolder: t('Which task in {0} do you want to edit?', fileName), matchOnDescription: true },
      );
      if (picked) deps.openEdit({ key, line: picked.line });
    }),
  );
}
