import type { Dayjs } from './dayjs';

/**
 * Locale-neutral description of a date relative to today. The rendering layer turns the key
 * into text ("3 days left" / "3일 남음") so core stays free of i18n.
 */
export type RelativeDate =
  | { key: 'today' }
  | { key: 'tomorrow' }
  | { key: 'yesterday' }
  | { key: 'inDays'; n: number }
  | { key: 'daysAgo'; n: number }
  | { key: 'inWeeks'; n: number }
  | { key: 'weeksAgo'; n: number }
  | { key: 'onDate'; iso: string };

export function describeRelative(date: Dayjs, today: Dayjs, maxDays = 60): RelativeDate {
  const diff = date.startOf('day').diff(today.startOf('day'), 'day');
  if (diff === 0) return { key: 'today' };
  if (diff === 1) return { key: 'tomorrow' };
  if (diff === -1) return { key: 'yesterday' };
  if (Math.abs(diff) > maxDays) return { key: 'onDate', iso: date.format('YYYY-MM-DD') };
  if (Math.abs(diff) >= 14 && diff % 7 === 0) return diff > 0 ? { key: 'inWeeks', n: diff / 7 } : { key: 'weeksAgo', n: -diff / 7 };
  return diff > 0 ? { key: 'inDays', n: diff } : { key: 'daysAgo', n: -diff };
}

/** Plain-English fallback used where no l10n is available (tests, logs). */
export function relativeToEnglish(r: RelativeDate): string {
  switch (r.key) {
    case 'today': return 'today';
    case 'tomorrow': return 'tomorrow';
    case 'yesterday': return 'yesterday';
    case 'inDays': return `in ${r.n} days`;
    case 'daysAgo': return `${r.n} days ago`;
    case 'inWeeks': return `in ${r.n} weeks`;
    case 'weeksAgo': return `${r.n} weeks ago`;
    case 'onDate': return r.iso;
  }
}
