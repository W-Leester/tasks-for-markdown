import { describe, expect, it } from 'vitest';
import { dayjs, describeRelative, inRange, parseDateRange, relativeToEnglish } from '../../../src/core/dates';

const today = dayjs('2026-09-21'); // Monday
const r = (s: string) => {
  const x = parseDateRange(s, today);
  return x ? [x.start.format('YYYY-MM-DD'), x.end.format('YYYY-MM-DD')] : null;
};

describe('parseDateRange', () => {
  it.each([
    ['this week', ['2026-09-21', '2026-09-27']],
    ['next week', ['2026-09-28', '2026-10-04']],
    ['last week', ['2026-09-14', '2026-09-20']],
    ['this month', ['2026-09-01', '2026-09-30']],
    ['next month', ['2026-10-01', '2026-10-31']],
    ['last month', ['2026-08-01', '2026-08-31']],
    ['this quarter', ['2026-07-01', '2026-09-30']],
    ['next quarter', ['2026-10-01', '2026-12-31']],
    ['last quarter', ['2026-04-01', '2026-06-30']],
    ['this year', ['2026-01-01', '2026-12-31']],
    ['next year', ['2027-01-01', '2027-12-31']],
    ['2026-W38', ['2026-09-14', '2026-09-20']],
    ['2026-w39', ['2026-09-21', '2026-09-27']],
    ['2026-09', ['2026-09-01', '2026-09-30']],
    ['2026-Q1', ['2026-01-01', '2026-03-31']],
    ['2026', ['2026-01-01', '2026-12-31']],
    ['2026-09-01 2026-09-30', ['2026-09-01', '2026-09-30']],
    ['2026-09-30 2026-09-01', ['2026-09-01', '2026-09-30']],
    ['today next friday', ['2026-09-21', '2026-09-25']],
    ['next monday next friday', ['2026-09-25', '2026-09-28']], // "next friday" = the coming Friday; ends are sorted
    ['2026-13', null],
    ['whenever', null],
  ])('%j -> %j', (input, expected) => {
    expect(r(input)).toEqual(expected);
  });

  it('inRange is inclusive on both ends', () => {
    const range = parseDateRange('this week', today)!;
    expect(inRange(dayjs('2026-09-21'), range)).toBe(true);
    expect(inRange(dayjs('2026-09-27'), range)).toBe(true);
    expect(inRange(dayjs('2026-09-28'), range)).toBe(false);
    expect(inRange(dayjs('2026-09-20'), range)).toBe(false);
  });
});

describe('describeRelative', () => {
  it.each([
    ['2026-09-21', 'today'],
    ['2026-09-22', 'tomorrow'],
    ['2026-09-20', 'yesterday'],
    ['2026-09-24', 'in 3 days'],
    ['2026-09-18', '3 days ago'],
    ['2026-10-05', 'in 2 weeks'],
    ['2026-09-07', '2 weeks ago'],
    ['2026-10-06', 'in 15 days'],
    ['2027-01-01', '2027-01-01'],
  ])('%s -> %s', (date, expected) => {
    expect(relativeToEnglish(describeRelative(dayjs(date), today))).toBe(expected);
  });
});
