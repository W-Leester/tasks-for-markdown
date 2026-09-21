import type { RelativeDate } from '../core/dates';
import { t } from '../l10n';

/** Translate a core RelativeDate into user-facing text. */
export function relativeText(r: RelativeDate): string {
  switch (r.key) {
    case 'today': return t('today');
    case 'tomorrow': return t('tomorrow');
    case 'yesterday': return t('yesterday');
    case 'inDays': return t('{0} days left', r.n);
    case 'daysAgo': return t('{0} days ago', r.n);
    case 'inWeeks': return t('{0} weeks left', r.n);
    case 'weeksAgo': return t('{0} weeks ago', r.n);
    case 'onDate': return r.iso;
  }
}

/** "overdue by N days" phrasing for due dates in the past. */
export function overdueText(r: RelativeDate): string {
  switch (r.key) {
    case 'yesterday': return t('1 day overdue');
    case 'daysAgo': return t('{0} days overdue', r.n);
    case 'weeksAgo': return t('{0} weeks overdue', r.n);
    default: return relativeText(r);
  }
}
