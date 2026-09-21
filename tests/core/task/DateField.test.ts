import { describe, expect, it } from 'vitest';
import { DateField } from '../../../src/core/task';
import { dayjs } from '../../../src/core/dates/dayjs';

describe('DateField', () => {
  it('parses a strict ISO date', () => {
    const f = DateField.parse('2026-09-25');
    expect(f.valid).toBe(true);
    expect(f.format()).toBe('2026-09-25');
    expect(f.date!.hour()).toBe(0);
  });

  it('keeps invalid input verbatim', () => {
    for (const raw of ['2026-13-40', '2026-9-5', '25/09/2026', 'tomorrow', '']) {
      const f = DateField.parse(raw);
      expect(f.valid, raw).toBe(false);
      expect(f.date).toBeNull();
      expect(f.format()).toBe(raw.trim());
    }
  });

  it('trims surrounding whitespace', () => {
    expect(DateField.parse(' 2026-01-01 ').valid).toBe(true);
  });

  it('builds from a dayjs value and compares by day', () => {
    const a = DateField.fromDate(dayjs('2026-09-25T15:30:00'));
    expect(a.format()).toBe('2026-09-25');
    expect(a.isSame(DateField.parse('2026-09-25'))).toBe(true);
    expect(a.isSame(DateField.parse('2026-09-26'))).toBe(false);
    expect(DateField.parse('bad').isSame(DateField.parse('bad'))).toBe(true);
  });
});
