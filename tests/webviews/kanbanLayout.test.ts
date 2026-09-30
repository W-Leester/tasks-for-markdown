import { describe, expect, it } from 'vitest';
import { columnsPerRow } from '../../src/webviews/kanban/layout';

describe('kanban balanced grid (M19)', () => {
  it('4 columns: one row when wide, 2×2 at normal widths, stacked when narrow', () => {
    expect(columnsPerRow(4, 1400)).toBe(4); // 4 × 280 + gaps fits
    expect(columnsPerRow(4, 1100)).toBe(2); // 3 fit → 2 rows → 2 per row (not 3+1)
    expect(columnsPerRow(4, 700)).toBe(2);
    expect(columnsPerRow(4, 500)).toBe(1);
  });
  it('balances other counts: 5 → 3+2, 6 → 3+3, 7 due buckets → 4+3', () => {
    expect(columnsPerRow(5, 1000)).toBe(3);
    expect(columnsPerRow(6, 1000)).toBe(3);
    expect(columnsPerRow(7, 1200)).toBe(4);
    expect(columnsPerRow(0, 1000)).toBe(1);
  });
});
