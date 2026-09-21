import * as vscode from 'vscode';
import { DEFAULT_STATUSES, StatusRegistry, type StatusConfig, isStatusType } from '../core/task';
import type { Settings } from './Settings';

/** Build a StatusRegistry from `tasksmd.statuses`, skipping malformed entries; always has the defaults as fallback. */
export function statusRegistryFromSettings(settings: Settings, log: (m: string) => void): StatusRegistry {
  const raw = settings.get('statuses');
  const valid: StatusConfig[] = [];
  for (const entry of Array.isArray(raw) ? raw : []) {
    const e = entry as Partial<StatusConfig>;
    if (typeof e.symbol === 'string' && e.symbol.length === 1 && typeof e.name === 'string' && typeof e.nextSymbol === 'string' && e.nextSymbol.length === 1 && isStatusType(e.type)) {
      valid.push({ symbol: e.symbol, name: e.name, nextSymbol: e.nextSymbol, type: e.type });
    } else {
      log(vscode.l10n.t('Ignoring invalid status entry in tasksmd.statuses: {0}', JSON.stringify(entry)));
    }
  }
  return new StatusRegistry(valid.length ? valid : DEFAULT_STATUSES);
}
