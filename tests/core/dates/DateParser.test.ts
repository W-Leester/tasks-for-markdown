import { describe, expect, it } from 'vitest';
import { dayjs, parseNaturalDate } from '../../../src/core/dates';

// 2026-09-21 is a Monday.
const today = dayjs('2026-09-21');
const p = (s: string) => parseNaturalDate(s, today)?.format('YYYY-MM-DD') ?? null;

describe('parseNaturalDate', () => {
  it.each([
    ['2026-09-25', '2026-09-25'],
    ['2026/9/5', '2026-09-05'],
    ['2026.09.05', '2026-09-05'],
    ['2026-13-40', null],
    ['today', '2026-09-21'],
    ['Tomorrow', '2026-09-22'],
    ['yesterday', '2026-09-20'],
    ['tod', '2026-09-21'],
    ['monday', '2026-09-21'],
    ['this monday', '2026-09-21'],
    ['next monday', '2026-09-28'],
    ['last monday', '2026-09-14'],
    ['friday', '2026-09-25'],
    ['fri', '2026-09-25'],
    ['next friday', '2026-09-25'],
    ['last friday', '2026-09-18'],
    ['sunday', '2026-09-27'],
    ['in 3 days', '2026-09-24'],
    ['3 days', '2026-09-24'],
    ['1 day', '2026-09-22'],
    ['2 weeks', '2026-10-05'],
    ['in 1 month', '2026-10-21'],
    ['in 2 years', '2028-09-21'],
    ['3 days ago', '2026-09-18'],
    ['next week', '2026-09-28'],
    ['last week', '2026-09-14'],
    ['next month', '2026-10-21'],
    ['next year', '2027-09-21'],
    ['6 oct', '2026-10-06'],
    ['6th october', '2026-10-06'],
    ['oct 6', '2026-10-06'],
    ['October 6th, 2027', '2027-10-06'],
    ['feb 30', null],
    ['nonsense', null],
    ['', null],
    ['  in  3   days ', '2026-09-24'],
  ])('%j -> %j', (input, expected) => {
    expect(p(input)).toBe(expected);
  });

  it.each([
    ['오늘', '2026-09-21'],
    ['내일', '2026-09-22'],
    ['모레', '2026-09-23'],
    ['어제', '2026-09-20'],
    ['3일 후', '2026-09-24'],
    ['3일후', '2026-09-24'],
    ['2주 뒤', '2026-10-05'],
    ['1달 후', '2026-10-21'],
    ['2일 전', '2026-09-19'],
    ['다음주', '2026-09-28'],
    ['다음 주', '2026-09-28'],
    ['지난달', '2026-08-21'],
    ['내년', '2027-09-21'],
    ['금요일', '2026-09-25'],
    ['금', '2026-09-25'],
    ['다음 월요일', '2026-09-28'],
    ['지난 금요일', '2026-09-18'],
    ['10월 6일', '2026-10-06'],
    ['2027년 10월 6일', '2027-10-06'],
  ])('korean %j -> %j', (input, expected) => {
    expect(p(input)).toBe(expected);
  });

  it('returns start of day', () => {
    const d = parseNaturalDate('tomorrow', dayjs('2026-09-21T15:45:00'))!;
    expect(d.hour()).toBe(0);
    expect(d.format('YYYY-MM-DD')).toBe('2026-09-22');
  });
});
