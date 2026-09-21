/**
 * Cases ported from Obsidian Tasks tests/Task/Recurrence.test.ts (MIT) plus rule-text coverage.
 */
import { describe, expect, it } from 'vitest';
import { dayjs } from '../../../src/core/dates';
import { Recurrence, isValidRecurrenceText, type Occurrence } from '../../../src/core/recurrence';

const d = (s: string) => dayjs(s).startOf('day');
const today = d('2026-09-21');
const occ = (o: Partial<Occurrence>): Occurrence => ({ start: null, scheduled: null, due: null, ...o });
const fmt = (x: ReturnType<typeof d> | null) => (x ? x.format('YYYY-MM-DD') : null);
const nextDue = (rule: string, due: string, extra: Record<string, unknown> = {}) =>
  fmt(Recurrence.fromText(rule, occ({ due: d(due) }), { today, ...extra })!.next().due);

describe('Recurrence (ported)', () => {
  it('creates a recurring instance even if no date is given', () => {
    const r = Recurrence.fromText('every week', occ({}), { today })!;
    expect(r.next()).toEqual({ start: null, scheduled: null, due: null });
  });
  it('creates a recurrence the next month, even on the 31st', () => {
    expect(nextDue('every month', '2022-01-31')).toBe('2022-02-28');
  });
  it('creates a recurrence 3 months in', () => {
    expect(nextDue('every 3 months', '2022-01-31')).toBe('2022-04-30');
  });
  it('creates a recurrence the next month, even across years', () => {
    expect(nextDue('every 2 months', '2023-12-31')).toBe('2024-02-29');
  });
  it('creates a recurrence in 2 years, even on Feb 29th', () => {
    expect(nextDue('every 2 years', '2024-02-29')).toBe('2026-02-28');
  });
  it('creates a recurrence in 11 months, even on March 31', () => {
    expect(nextDue('every 11 months', '2020-03-31')).toBe('2021-02-28');
  });
  it('creates a recurrence in 13 months, even on Jan 31', () => {
    expect(nextDue('every 13 months', '2020-01-31')).toBe('2021-02-28');
  });
  it('removes the scheduled date when the setting is on and another date exists', () => {
    const r = Recurrence.fromText('every month', occ({ start: d('2022-01-01'), scheduled: d('2022-01-04'), due: d('2022-01-10') }), { today, removeScheduledDateOnRecurrence: true })!;
    const n = r.next();
    expect(fmt(n.start)).toBe('2022-02-01');
    expect(n.scheduled).toBeNull();
    expect(fmt(n.due)).toBe('2022-02-10');
  });
  it('keeps the scheduled date when it is the only date', () => {
    const r = Recurrence.fromText('every month', occ({ scheduled: d('2022-01-04') }), { today, removeScheduledDateOnRecurrence: true })!;
    expect(fmt(r.next().scheduled)).toBe('2022-02-04');
  });
  it('drop scheduled + when done uses the start date as reference', () => {
    const t = d('2022-01-10');
    const r = Recurrence.fromText('every 3 days when done', occ({ start: d('2022-01-01'), scheduled: d('2022-01-04') }), { today: t, removeScheduledDateOnRecurrence: true })!;
    const n = r.next(t);
    expect(fmt(n.start)).toBe('2022-01-13');
    expect(n.scheduled).toBeNull();
  });
});

describe('Recurrence rules', () => {
  it.each([
    ['every day', '2026-09-25', '2026-09-26'],
    ['every 3 days', '2026-09-25', '2026-09-28'],
    ['every weekday', '2026-09-25', '2026-09-28'], // Fri -> Mon
    ['every week', '2026-09-25', '2026-10-02'],
    ['every week on Sunday', '2026-09-25', '2026-09-27'],
    ['every week on Monday, Friday', '2026-09-25', '2026-09-28'],
    ['every 2 weeks', '2026-09-25', '2026-10-09'],
    ['every month', '2026-09-25', '2026-10-25'],
    ['every month on the 15th', '2026-09-25', '2026-10-15'],
    ['every month on the last', '2026-09-25', '2026-09-30'],
    ['every month on the last Friday', '2026-09-25', '2026-10-30'],
    ['every year', '2026-09-25', '2027-09-25'],
    ['every January on the 4th', '2026-09-25', '2027-01-04'],
    ['every day when done', '2026-09-25', '2026-09-22'], // today = 09-21
    ['every week when done', '2026-09-01', '2026-09-28'],
  ])('%s from %s -> %s', (rule, due, expected) => {
    expect(nextDue(rule, due)).toBe(expected);
  });

  it('keeps the relative distance between dates', () => {
    const r = Recurrence.fromText('every week', occ({ start: d('2026-09-20'), scheduled: d('2026-09-22'), due: d('2026-09-25') }), { today })!;
    const n = r.next();
    expect([fmt(n.start), fmt(n.scheduled), fmt(n.due)]).toEqual(['2026-09-27', '2026-09-29', '2026-10-02']);
  });

  it('uses scheduled, then start, when there is no due date', () => {
    expect(fmt(Recurrence.fromText('every day', occ({ scheduled: d('2026-09-25'), start: d('2026-09-20') }), { today })!.next().scheduled)).toBe('2026-09-26');
    expect(fmt(Recurrence.fromText('every day', occ({ start: d('2026-09-20') }), { today })!.next().start)).toBe('2026-09-21');
  });

  it('round-trips canonical text and accepts case/spacing variants', () => {
    expect(Recurrence.fromText('every week on monday when done', occ({}), { today })!.toText()).toBe('every week on Monday when done');
    expect(Recurrence.fromText('  Every 2 Weeks ', occ({}), { today })!.toText()).toBe('every 2 weeks');
  });

  it('rejects text rrule cannot parse', () => {
    for (const bad of ['', 'nonsense', 'every', 'every blah', 'every 0 days', 'weekly', 'every week on funday']) {
      expect(isValidRecurrenceText(bad), bad).toBe(false);
    }
    expect(isValidRecurrenceText('every week')).toBe(true);
  });
});
