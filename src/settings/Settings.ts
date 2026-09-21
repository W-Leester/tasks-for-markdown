import * as vscode from 'vscode';
import { SETTINGS_DEFAULTS, SETTINGS_KEYS, SETTINGS_SECTION, type SettingsKey, type SettingsSchema } from './schema';

export type SettingsChangeListener = (changedKeys: readonly SettingsKey[]) => void;

/**
 * Type-safe access to the `tasksmd.*` configuration plus change notifications that tell listeners
 * exactly which keys changed. Values are read live from VS Code (no caching) so workspace/user
 * precedence is always honoured.
 */
export class Settings implements vscode.Disposable {
  private readonly emitter = new vscode.EventEmitter<readonly SettingsKey[]>();
  private readonly subscription: vscode.Disposable;
  private snapshot: SettingsSchema;

  constructor() {
    this.snapshot = this.readAll();
    this.subscription = vscode.workspace.onDidChangeConfiguration((e) => {
      if (!e.affectsConfiguration(SETTINGS_SECTION)) return;
      const before = this.snapshot;
      this.snapshot = this.readAll();
      const changed = SETTINGS_KEYS.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(this.snapshot[k]));
      if (changed.length) this.emitter.fire(changed);
    });
  }

  get<K extends SettingsKey>(key: K): SettingsSchema[K] {
    const value = vscode.workspace.getConfiguration(SETTINGS_SECTION).get<SettingsSchema[K]>(key);
    return value === undefined ? SETTINGS_DEFAULTS[key] : value;
  }

  /** All values as one immutable object — convenient to pass into core functions. */
  all(): Readonly<SettingsSchema> {
    return this.snapshot;
  }

  /** Fire `listener` when any of `keys` changes (or on any change if `keys` is omitted). */
  onDidChange(listener: SettingsChangeListener, keys?: readonly SettingsKey[]): vscode.Disposable {
    return this.emitter.event((changed) => {
      if (!keys || changed.some((k) => keys.includes(k))) listener(changed);
    });
  }

  async update<K extends SettingsKey>(key: K, value: SettingsSchema[K], target?: vscode.ConfigurationTarget): Promise<void> {
    await vscode.workspace.getConfiguration(SETTINGS_SECTION).update(key, value, target);
  }

  private readAll(): SettingsSchema {
    const out = { ...SETTINGS_DEFAULTS } as SettingsSchema;
    for (const k of SETTINGS_KEYS) (out as Record<SettingsKey, unknown>)[k] = this.get(k);
    return out;
  }

  dispose(): void {
    this.subscription.dispose();
    this.emitter.dispose();
  }
}
