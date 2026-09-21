import * as vscode from 'vscode';
import { type Clock, type Dayjs, describeRelative, parseNaturalDate, systemClock } from '../../core/dates';
import { DateField, PRIORITY_EMOJI, PRIORITY_NAME, Priority, type Status, type StatusRegistry, StatusType } from '../../core/task';
import { relativeText } from '../relativeText';

const TYPE_ICON: Record<StatusType, string> = {
  [StatusType.TODO]: 'circle-large-outline',
  [StatusType.IN_PROGRESS]: 'play-circle',
  [StatusType.ON_HOLD]: 'debug-pause',
  [StatusType.DONE]: 'pass-filled',
  [StatusType.CANCELLED]: 'circle-slash',
  [StatusType.NON_TASK]: 'dash',
};

export async function pickStatus(registry: StatusRegistry, current?: Status): Promise<Status | undefined> {
  const items = registry.all().map((s) => ({
    label: `$(${TYPE_ICON[s.type]}) [${s.symbol}] ${s.name}`,
    description: s.type + (s === current || s.symbol === current?.symbol ? `  $(check)` : ''),
    detail: vscode.l10n.t('Next: [{0}]', s.nextSymbol),
    status: s,
  }));
  const picked = await vscode.window.showQuickPick(items, { placeHolder: vscode.l10n.t('Set status'), matchOnDescription: true });
  return picked?.status;
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

export async function pickPriority(current?: Priority): Promise<Priority | undefined> {
  const items = PRIORITIES.map((p) => ({
    label: `${PRIORITY_EMOJI[p] || '　'} ${vscode.l10n.t(PRIORITY_LABEL[p])}`,
    description: (p === current ? '$(check) ' : '') + PRIORITY_NAME[p],
    priority: p,
  }));
  const picked = await vscode.window.showQuickPick(items, { placeHolder: vscode.l10n.t('Set priority') });
  return picked?.priority;
}

interface DateItem extends vscode.QuickPickItem {
  value: Dayjs | null | undefined; // null = remove date, undefined = separator/none
}

/**
 * Date picker: a QuickPick whose first item mirrors whatever the user types, parsed as natural
 * language ("next fri", "in 3 days", "10월 6일"). Returns a DateField, `null` to remove the date,
 * or `undefined` when cancelled.
 */
export function pickDate(fieldLabel: string, current: DateField | null, clock: Clock = systemClock): Promise<DateField | null | undefined> {
  const today = clock.now().startOf('day');
  const fmt = (d: Dayjs) => `${d.format('YYYY-MM-DD')} (${d.format('ddd')}) · ${relativeText(describeRelative(d, today))}`;
  const presets = (): DateItem[] => {
    const monday = today.add((8 - today.day()) % 7 || 7, 'day');
    const friday = today.add((5 - today.day() + 7) % 7 || 7, 'day');
    const list: DateItem[] = [
      { label: `$(calendar) ${vscode.l10n.t('Today')}`, description: fmt(today), value: today },
      { label: `$(calendar) ${vscode.l10n.t('Tomorrow')}`, description: fmt(today.add(1, 'day')), value: today.add(1, 'day') },
      { label: `$(calendar) ${vscode.l10n.t('Friday')}`, description: fmt(friday), value: friday },
      { label: `$(calendar) ${vscode.l10n.t('Next Monday')}`, description: fmt(monday), value: monday },
      { label: `$(calendar) ${vscode.l10n.t('In 1 week')}`, description: fmt(today.add(7, 'day')), value: today.add(7, 'day') },
      { label: `$(calendar) ${vscode.l10n.t('In 2 weeks')}`, description: fmt(today.add(14, 'day')), value: today.add(14, 'day') },
      { label: `$(calendar) ${vscode.l10n.t('Next month')}`, description: fmt(today.add(1, 'month')), value: today.add(1, 'month') },
    ];
    if (current) list.push({ label: `$(trash) ${vscode.l10n.t('Remove {0}', fieldLabel)}`, description: current.format(), value: null });
    return list;
  };

  return new Promise((resolve) => {
    const qp = vscode.window.createQuickPick<DateItem>();
    qp.title = current ? vscode.l10n.t('{0}: {1}', fieldLabel, current.format()) : fieldLabel;
    qp.placeholder = vscode.l10n.t('Type a date: 2026-09-25, tomorrow, next fri, in 3 days, 6 oct…');
    qp.matchOnDescription = true;
    qp.items = presets();
    qp.onDidChangeValue((text) => {
      const parsed = text.trim() ? parseNaturalDate(text, today) : null;
      const typed: DateItem[] = parsed
        ? [{ label: `$(arrow-right) ${text.trim()}`, description: fmt(parsed), value: parsed, alwaysShow: true }]
        : text.trim()
          ? [{ label: `$(warning) ${text.trim()}`, description: vscode.l10n.t('not a recognised date'), value: undefined, alwaysShow: true }]
          : [];
      qp.items = [...typed, ...presets()];
    });
    let done = false;
    qp.onDidAccept(() => {
      const sel = qp.selectedItems[0];
      if (!sel || sel.value === undefined) return;
      done = true;
      qp.hide();
      resolve(sel.value === null ? null : DateField.fromDate(sel.value));
    });
    qp.onDidHide(() => {
      if (!done) resolve(undefined);
      qp.dispose();
    });
    qp.show();
  });
}

export interface PostponeChoice {
  label: string;
  date: Dayjs;
}

export async function pickPostpone(from: Dayjs, clock: Clock = systemClock): Promise<Dayjs | undefined> {
  const today = clock.now().startOf('day');
  const base = from.isBefore(today) ? today : from; // never postpone into the past
  const monday = base.add((8 - base.day()) % 7 || 7, 'day');
  const choices: PostponeChoice[] = [
    { label: vscode.l10n.t('Tomorrow'), date: today.add(1, 'day') },
    { label: vscode.l10n.t('+2 days'), date: base.add(2, 'day') },
    { label: vscode.l10n.t('Next Monday'), date: monday },
    { label: vscode.l10n.t('+1 week'), date: base.add(1, 'week') },
    { label: vscode.l10n.t('+2 weeks'), date: base.add(2, 'week') },
    { label: vscode.l10n.t('+1 month'), date: base.add(1, 'month') },
  ];
  const picked = await vscode.window.showQuickPick(
    choices.map((c) => ({ label: `$(calendar) ${c.label}`, description: `${c.date.format('YYYY-MM-DD')} (${c.date.format('ddd')})`, date: c.date })),
    { placeHolder: vscode.l10n.t('Postpone to…') },
  );
  return picked?.date;
}
