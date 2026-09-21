import { dayjs, type Dayjs } from './dayjs';

/** Injectable "now" so every date rule is testable with a fixed day. */
export interface Clock {
  now(): Dayjs;
}

export const systemClock: Clock = { now: () => dayjs() };

export function fixedClock(date: string | Dayjs): Clock {
  const d = dayjs(date);
  return { now: () => d };
}

/** Start of today according to the clock. */
export function today(clock: Clock): Dayjs {
  return clock.now().startOf('day');
}
