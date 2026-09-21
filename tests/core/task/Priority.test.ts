import { describe, expect, it } from 'vitest';
import { Priority, PRIORITY_EMOJI, priorityFromEmoji, priorityFromName, priorityNumber } from '../../../src/core/task';

describe('Priority', () => {
  it('maps emoji both ways', () => {
    for (const p of [Priority.Highest, Priority.High, Priority.Medium, Priority.Low, Priority.Lowest]) {
      expect(priorityFromEmoji(PRIORITY_EMOJI[p])).toBe(p);
    }
    expect(PRIORITY_EMOJI[Priority.None]).toBe('');
    expect(priorityFromEmoji('')).toBeUndefined();
  });

  it('maps dataview names case-insensitively', () => {
    expect(priorityFromName('High')).toBe(Priority.High);
    expect(priorityFromName(' lowest ')).toBe(Priority.Lowest);
    expect(priorityFromName('urgent')).toBeUndefined();
  });

  it('sorts highest first as numbers and as strings', () => {
    const all = [Priority.Low, Priority.Highest, Priority.None, Priority.Lowest, Priority.High, Priority.Medium];
    expect([...all].sort().map(priorityNumber)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
