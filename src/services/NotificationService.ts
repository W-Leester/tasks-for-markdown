import { execFile } from 'node:child_process';
import * as vscode from 'vscode';
import { systemClock, type Clock } from '../core/dates';
import type { TaskIndex } from '../core/index';
import type { Task } from '../core/task';
import { runSmartView } from '../core/views';
import type { Settings } from '../settings/Settings';
import { t } from '../l10n';

const MINUTE = 60_000;
const STATE_LAST_DAILY = 'notifications.lastDaily';
const STATE_LAST_DUE = 'notifications.lastDueDigest';
const STATE_SNOOZE = 'notifications.snooze';

export interface NotificationDeps {
  index: TaskIndex;
  settings: Settings;
  state: vscode.Memento;
  clock?: Clock;
  log(m: string): void;
  /** Injectable for tests. */
  osNotify?: (title: string, body: string) => Promise<void>;
}

/**
 * Daily summary + due-soon digest (FR-10.1 ~ FR-10.4). Toasts always; native OS notifications
 * only when enabled and the workspace is trusted. Everything runs at most once per day and is
 * remembered in globalState so restarting VS Code does not repeat it.
 */
export class NotificationService implements vscode.Disposable {
  private timer: NodeJS.Timeout | undefined;
  private readonly disposables: vscode.Disposable[] = [];
  private started = false;

  constructor(private readonly deps: NotificationDeps) {}

  start(): void {
    const sub = this.deps.index.onDidChangeProgress((p) => {
      if (p.state === 'ready' && !this.started) {
        this.started = true;
        void this.tick(true);
      }
    });
    this.disposables.push({ dispose: () => sub.dispose() });
    this.timer = setInterval(() => void this.tick(false), MINUTE);
  }

  private now() {
    return (this.deps.clock ?? systemClock).now();
  }

  /** Runs every minute: fire the daily summary once the configured time has passed today. */
  async tick(startup: boolean): Promise<void> {
    const s = this.deps.settings;
    if (!s.get('notifications.enabled')) return;
    const now = this.now();
    const today = now.format('YYYY-MM-DD');
    const [hh, mm] = (s.get('notifications.dailyTime') || '09:00').split(':').map(Number);
    const dueTime = now.startOf('day').add(hh ?? 9, 'hour').add(mm ?? 0, 'minute');
    const afterTime = !now.isBefore(dueTime);
    if ((startup || afterTime) && this.deps.state.get<string>(STATE_LAST_DAILY) !== today && (afterTime || startup)) {
      await this.deps.state.update(STATE_LAST_DAILY, today);
      await this.dailySummary();
    }
    if (this.deps.state.get<string>(STATE_LAST_DUE) !== today && (startup || afterTime)) {
      await this.deps.state.update(STATE_LAST_DUE, today);
      await this.dueDigest();
    }
  }

  private ctx() {
    return { index: this.deps.index, today: this.now().startOf('day') };
  }

  async dailySummary(): Promise<void> {
    const todayCount = runSmartView('today', this.ctx()).length;
    const overdue = runSmartView('overdue', this.ctx()).length;
    if (todayCount === 0 && overdue === 0) return;
    const title = t('Tasks for today');
    const body = overdue
      ? t('{0} due today or earlier, {1} overdue', todayCount, overdue)
      : t('{0} due today or earlier', todayCount);
    await this.notify(title, body);
  }

  async dueDigest(): Promise<void> {
    const within = this.deps.settings.get('notifications.dueWithinDays');
    const today = this.now().startOf('day');
    const limit = today.add(within, 'day').endOf('day');
    const snoozed = this.deps.state.get<Record<string, string>>(STATE_SNOOZE, {});
    const soon = this.deps.index.all().filter((t) => {
      if (t.isCompleted || !t.due?.date) return false;
      if (t.due.date.isBefore(today, 'day') || t.due.date.isAfter(limit)) return false;
      const until = snoozed[snoozeKey(t)];
      return !until || until < today.format('YYYY-MM-DD');
    });
    if (!soon.length) return;
    const list = soon.slice(0, 5).map((t) => `• ${t.description.slice(0, 60)} (${t.due!.format()})`).join('\n');
    const more = soon.length > 5 ? `\n… +${soon.length - 5}` : '';
    const body = t('{0} tasks due within {1} days', soon.length, within);
    const choice = await this.notify(t('Upcoming tasks'), body, `${list}${more}`, [t('Snooze until tomorrow'), t('Snooze a week')]);
    if (choice) {
      const days = choice === t('Snooze a week') ? 7 : 1;
      const until = today.add(days, 'day').format('YYYY-MM-DD');
      for (const t of soon) snoozed[snoozeKey(t)] = until;
      await this.deps.state.update(STATE_SNOOZE, snoozed);
    }
  }

  /** Toast (with "Show today" button) and, if enabled, an OS notification. Returns the chosen extra action. */
  private async notify(title: string, body: string, detail = '', actions: string[] = []): Promise<string | undefined> {
    if (this.deps.settings.get('notifications.os') && vscode.workspace.isTrusted) {
      try {
        await (this.deps.osNotify ?? osNotify)(title, body);
      } catch (err) {
        this.deps.log(`OS notification failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    const show = t('Show today');
    const choice = await vscode.window.showInformationMessage(`${title}: ${body}${detail ? `\n${detail}` : ''}`, show, ...actions);
    if (choice === show) void vscode.commands.executeCommand('tasksmd.openSidebar');
    return choice && choice !== show ? choice : undefined;
  }

  dispose(): void {
    if (this.timer) clearInterval(this.timer);
    for (const d of this.disposables) d.dispose();
  }
}

function snoozeKey(t: Task): string {
  return `${t.location.key}#${t.description}`;
}

/** Native notification via the platform's own tool; arguments are passed as arrays, never through a shell (D§10). */
export function osNotify(title: string, body: string): Promise<void> {
  const run = (cmd: string, args: string[]) =>
    new Promise<void>((resolve, reject) => {
      execFile(cmd, args, { timeout: 5000, windowsHide: true }, (err) => (err ? reject(err) : resolve()));
    });
  const safe = (s: string) => s.replace(/["\\]/g, '');
  switch (process.platform) {
    case 'darwin':
      return run('osascript', ['-e', `display notification "${safe(body)}" with title "${safe(title)}"`]);
    case 'win32': {
      const ps = `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null;
$t = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02);
$n = $t.GetElementsByTagName('text'); $n.Item(0).AppendChild($t.CreateTextNode('${safe(title).replace(/'/g, "''")}')) | Out-Null; $n.Item(1).AppendChild($t.CreateTextNode('${safe(body).replace(/'/g, "''")}')) | Out-Null;
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Visual Studio Code').Show([Windows.UI.Notifications.ToastNotification]::new($t))`;
      return run('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps]);
    }
    default:
      return run('notify-send', [title, body]);
  }
}
