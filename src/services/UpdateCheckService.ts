import * as fs from 'node:fs/promises';
import * as vscode from 'vscode';
import type { Settings } from '../settings/Settings';
import { t } from '../l10n';

const STATE_LAST_CHECK = 'update.lastCheck';
const STATE_SKIPPED = 'update.skippedVersion';
const DAY = 86_400_000;

export interface LatestJson {
  version: string;
  /** Path or URL of the .vsix to install. */
  vsix?: string;
  notes?: string;
}

/**
 * Optional update check for installs distributed as .vsix (FR-10.15). `tasksmd.updateCheckUrl`
 * points at a `latest.json` (file path or http(s) URL). Nothing happens when the setting is
 * empty, in untrusted workspaces, or when the extension came from a marketplace (those
 * auto-update already).
 */
export class UpdateCheckService {
  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly settings: Settings,
    private readonly log: (m: string) => void,
  ) {}

  /** Marketplace / Open VSX installs carry `__metadata` in their package.json. */
  private fromMarketplace(): boolean {
    return !!(this.context.extension.packageJSON as { __metadata?: unknown }).__metadata;
  }

  async checkOnStartup(): Promise<void> {
    const url = this.settings.get('updateCheckUrl');
    if (!url || !vscode.workspace.isTrusted || this.fromMarketplace()) return;
    const last = this.context.globalState.get<number>(STATE_LAST_CHECK, 0);
    if (Date.now() - last < DAY) return;
    await this.context.globalState.update(STATE_LAST_CHECK, Date.now());
    await this.check(false);
  }

  async check(interactive: boolean): Promise<void> {
    const url = this.settings.get('updateCheckUrl');
    if (!url) {
      if (interactive) void vscode.window.showInformationMessage(t('Set tasksmd.updateCheckUrl to the location of latest.json first.'));
      return;
    }
    let latest: LatestJson;
    try {
      latest = await readLatest(url);
    } catch (err) {
      this.log(`update check failed: ${err instanceof Error ? err.message : String(err)}`);
      if (interactive) void vscode.window.showWarningMessage(t('Could not read {0}.', url));
      return;
    }
    const current = String(this.context.extension.packageJSON.version);
    if (compareVersions(latest.version, current) <= 0) {
      if (interactive) void vscode.window.showInformationMessage(t('Tasks for Markdown {0} is up to date.', current));
      return;
    }
    if (!interactive && this.context.globalState.get<string>(STATE_SKIPPED) === latest.version) return;
    const install = t('Open .vsix location');
    const skip = t('Skip this version');
    const choice = await vscode.window.showInformationMessage(
      t('Tasks for Markdown {0} is available (you have {1}).', latest.version, current) + (latest.notes ? ` ${latest.notes}` : ''),
      ...(latest.vsix ? [install] : []),
      skip,
    );
    if (choice === install && latest.vsix) {
      const target = /^https?:/.test(latest.vsix) ? vscode.Uri.parse(latest.vsix) : vscode.Uri.file(latest.vsix);
      if (target.scheme === 'file') await vscode.commands.executeCommand('revealFileInOS', target);
      else await vscode.env.openExternal(target);
    } else if (choice === skip) {
      await this.context.globalState.update(STATE_SKIPPED, latest.version);
    }
  }
}

export async function readLatest(location: string): Promise<LatestJson> {
  let text: string;
  if (/^https?:\/\//.test(location)) {
    const res = await fetch(location, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    text = await res.text();
  } else {
    text = await fs.readFile(location.replace(/^file:\/\//, ''), 'utf8');
  }
  const json = JSON.parse(text) as LatestJson;
  if (typeof json.version !== 'string') throw new Error('latest.json has no "version"');
  return json;
}

/** Compare `a` and `b` as dotted numeric versions (pre-release suffixes ignored). */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('-')[0]!.split('.').map(Number);
  const pb = b.split('-')[0]!.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}
