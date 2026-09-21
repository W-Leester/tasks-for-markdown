import { dayjs, type Dayjs } from './dayjs';
import { parseNaturalDate } from './DateParser';

export interface DateRange {
  start: Dayjs; // inclusive, start of day
  end: Dayjs; // inclusive, start of day
}

/**
 * Query date ranges (FR-7.2): `this|last|next week|month|quarter|year`, `2026-W38`, `2026-09`,
 * `2026-Q3`, `2026`, or two dates `2026-09-01 2026-09-30` (each side may be natural language).
 * Weeks are ISO (Monday–Sunday).
 */
export function parseDateRange(input: string, today: Dayjs): DateRange | null {
  const text = input.trim().toLowerCase().replace(/\s+/g, ' ');
  const base = today.startOf('day');

  let m = /^(this|last|next) (week|month|quarter|year)$/.exec(text);
  if (m) {
    const shift = m[1] === 'next' ? 1 : m[1] === 'last' ? -1 : 0;
    return periodOf(base, m[2] as 'week' | 'month' | 'quarter' | 'year', shift);
  }
  m = /^(\d{4})-w(\d{1,2})$/.exec(text);
  if (m) {
    const start = dayjs(`${m[1]}-01-04`).isoWeek(+m[2]!).startOf('isoWeek');
    return start.isValid() ? { start, end: start.endOf('isoWeek').startOf('day') } : null;
  }
  m = /^(\d{4})-q([1-4])$/.exec(text);
  if (m) {
    const start = dayjs(`${m[1]}-${String((+m[2]! - 1) * 3 + 1).padStart(2, '0')}-01`);
    return { start, end: start.add(2, 'month').endOf('month').startOf('day') };
  }
  m = /^(\d{4})-(\d{2})$/.exec(text);
  if (m) {
    const start = dayjs(`${m[1]}-${m[2]}-01`, 'YYYY-MM-DD', true);
    return start.isValid() ? { start, end: start.endOf('month').startOf('day') } : null;
  }
  m = /^(\d{4})$/.exec(text);
  if (m) {
    const start = dayjs(`${m[1]}-01-01`);
    return { start, end: start.endOf('year').startOf('day') };
  }
  // two dates separated by whitespace; try every split point so "next monday next friday" works
  const words = text.split(' ');
  for (let i = 1; i < words.length; i++) {
    const a = parseNaturalDate(words.slice(0, i).join(' '), base);
    const b = parseNaturalDate(words.slice(i).join(' '), base);
    if (a && b) return a.isAfter(b) ? { start: b, end: a } : { start: a, end: b };
  }
  return null;
}

export function periodOf(base: Dayjs, unit: 'week' | 'month' | 'quarter' | 'year', shift: number): DateRange {
  if (unit === 'week') {
    const start = base.startOf('isoWeek').add(shift, 'week');
    return { start, end: start.endOf('isoWeek').startOf('day') };
  }
  if (unit === 'quarter') {
    const qStartMonth = Math.floor(base.month() / 3) * 3;
    const start = base.month(qStartMonth).startOf('month').add(shift * 3, 'month');
    return { start, end: start.add(2, 'month').endOf('month').startOf('day') };
  }
  const start = base.startOf(unit).add(shift, unit);
  return { start, end: start.endOf(unit).startOf('day') };
}

export function inRange(date: Dayjs, range: DateRange): boolean {
  return !date.isBefore(range.start, 'day') && !date.isAfter(range.end, 'day');
}
