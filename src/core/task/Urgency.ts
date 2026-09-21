/**
 * Urgency score, ported from Obsidian Tasks `src/Task/Urgency.ts` (MIT) so that sorting by
 * urgency matches the plugin exactly. Higher = more urgent.
 *   due:       +12 × multiplier (1.0 when ≥7 days overdue … 0.2 when >14 days away)
 *   scheduled: +5 once the scheduled day has arrived
 *   start:     −3 while the start date is still in the future
 *   priority:  highest +9, high +6, medium +3.9, none +1.95, low 0, lowest −1.8
 */
import type { Dayjs } from '../dates/dayjs';
import { Priority } from './Priority';
import type { Task } from './Task';

const DUE = 12.0;
const SCHEDULED = 5.0;
const STARTED = -3.0;
const PRIORITY = 6.0;

export function urgency(task: Task, now: Dayjs): number {
  let score = 0;
  const startOfToday = now.startOf('day');

  if (task.due?.date) {
    const daysOverdue = Math.round(startOfToday.diff(task.due.date, 'day', true));
    let multiplier: number;
    if (daysOverdue >= 7) multiplier = 1.0;
    else if (daysOverdue >= -14) multiplier = ((daysOverdue + 14) * 0.8) / 21 + 0.2;
    else multiplier = 0.2;
    score += multiplier * DUE;
  }
  if (task.scheduled?.date && !now.isBefore(task.scheduled.date)) score += SCHEDULED;
  if (task.start?.date && now.isBefore(task.start.date)) score += STARTED;

  switch (task.priority) {
    case Priority.Highest: score += 1.5 * PRIORITY; break;
    case Priority.High: score += 1.0 * PRIORITY; break;
    case Priority.Medium: score += 0.65 * PRIORITY; break;
    case Priority.None: score += 0.325 * PRIORITY; break;
    case Priority.Low: break;
    case Priority.Lowest: score -= 0.3 * PRIORITY; break;
  }
  return score;
}
