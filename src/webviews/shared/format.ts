import { t } from './l10n';

/** Days between two ISO dates (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!)) / 86_400_000);
}

export function relativeLabel(iso: string, today: string): string {
  const d = daysBetween(today, iso);
  if (d === 0) return t('today');
  if (d === 1) return t('tomorrow');
  if (d === -1) return t('yesterday');
  if (d > 0) return t('{0} days left', d);
  return t('{0} days overdue', -d);
}

export function shortDate(iso: string): string {
  return iso.slice(5).replace('-', '/');
}

export const PRIORITY_LABELS: Record<string, string> = { '0': 'Highest', '1': 'High', '2': 'Medium', '3': 'Normal', '4': 'Low', '5': 'Lowest' };
export const PRIORITY_EMOJI: Record<string, string> = { '0': '🔺', '1': '⏫', '2': '🔼', '3': '', '4': '🔽', '5': '⏬' };
