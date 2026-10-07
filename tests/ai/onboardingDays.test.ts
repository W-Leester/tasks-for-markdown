import { describe, expect, it } from 'vitest';
import { onboardingDay, shouldPromptInstall } from '../../src/ai/onboardingDays';

describe('onboarding counts distinct days', () => {
  it('counts a new day once, however many windows open that day', () => {
    let s = { days: 0 } as { days: number; lastDay?: string };
    const first = onboardingDay(s, '2026-10-07');
    expect(first.day).toBe(1);
    s = first.next;
    expect(onboardingDay(s, '2026-10-07').day).toBeNull(); // a reload, another window
    expect(onboardingDay(s, '2026-10-07').next).toEqual({ days: 1, lastDay: '2026-10-07' });
    const second = onboardingDay(s, '2026-10-09'); // days need not be consecutive
    expect(second).toEqual({ day: 2, next: { days: 2, lastDay: '2026-10-09' } });
  });

  it('asks to install tasksmd once a day until installed or never', () => {
    expect(shouldPromptInstall({}, '2026-10-07', false)).toBe(true);
    expect(shouldPromptInstall({ lastDay: '2026-10-07' }, '2026-10-07', false)).toBe(false); // same day
    expect(shouldPromptInstall({ lastDay: '2026-10-07' }, '2026-10-30', false)).toBe(true); // no 3-day limit
    expect(shouldPromptInstall({}, '2026-10-07', true)).toBe(false);
    expect(shouldPromptInstall({ never: true }, '2026-10-08', false)).toBe(false);
  });
});
