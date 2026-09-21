import * as vscode from 'vscode';
import { STATUS_PRESETS, type StatusConfig, type StatusPresetName, presetStatuses } from '../core/task';
import { pickStatus } from '../editor/quickpicks/pickers';
import { type CommandDeps, resolveTargetTasks, runEdit } from './registerCommands';
import { t } from '../l10n';

export function registerStatusCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('tasksmd.loadStatusPreset', async () => {
      const picked = await vscode.window.showQuickPick(
        (Object.keys(STATUS_PRESETS) as StatusPresetName[]).map((k) => ({ label: t(STATUS_PRESETS[k].label), description: `${STATUS_PRESETS[k].rows.length}`, preset: k })),
        { placeHolder: t('Load which status set?') },
      );
      if (!picked) return;
      const mode = await vscode.window.showQuickPick(
        [
          { label: t('Add missing statuses'), merge: true },
          { label: t('Replace all statuses'), merge: false },
        ],
        { placeHolder: t('Load which status set?') },
      );
      if (!mode) return;
      const incoming = presetStatuses(picked.preset);
      let result: StatusConfig[];
      if (mode.merge) {
        const current = deps.settings.get('statuses');
        const have = new Set(current.map((s) => s.symbol));
        result = [...current, ...incoming.filter((s) => !have.has(s.symbol))];
      } else result = incoming;
      await deps.settings.update('statuses', result, vscode.ConfigurationTarget.Global);
      void vscode.window.showInformationMessage(t('Loaded {0} statuses from {1}.', result.length, t(STATUS_PRESETS[picked.preset].label)));
    }),
    // Same as tasksmd.setStatus but named like Obsidian's "Change status to…" for discoverability.
    vscode.commands.registerCommand('tasksmd.changeStatusTo', (arg) =>
      runEdit(deps, async () => {
        const targets = resolveTargetTasks(arg, deps);
        if (!targets.length) return;
        const status = await pickStatus(deps.getStatusRegistry(), targets[0]!.status);
        if (!status) return;
        for (const t of [...targets].sort((a, b) => b.location.line - a.location.line)) await deps.editService.setStatus(t, status);
      }),
    ),
  );
}
