import * as vscode from 'vscode';
import type { RelativeDate } from '../core/dates';

/** Translate a core RelativeDate into user-facing text. */
export function relativeText(r: RelativeDate): string {
  switch (r.key) {
    case 'today': return vscode.l10n.t('today');
    case 'tomorrow': return vscode.l10n.t('tomorrow');
    case 'yesterday': return vscode.l10n.t('yesterday');
    case 'inDays': return vscode.l10n.t('{0} days left', r.n);
    case 'daysAgo': return vscode.l10n.t('{0} days ago', r.n);
    case 'inWeeks': return vscode.l10n.t('{0} weeks left', r.n);
    case 'weeksAgo': return vscode.l10n.t('{0} weeks ago', r.n);
    case 'onDate': return r.iso;
  }
}

/** "overdue by N days" phrasing for due dates in the past. */
export function overdueText(r: RelativeDate): string {
  switch (r.key) {
    case 'yesterday': return vscode.l10n.t('1 day overdue');
    case 'daysAgo': return vscode.l10n.t('{0} days overdue', r.n);
    case 'weeksAgo': return vscode.l10n.t('{0} weeks overdue', r.n);
    default: return relativeText(r);
  }
}
