/** Smallest comfortable column width (px) and the gap between columns (M19). */
export const MIN_COLUMN_WIDTH = 280;
export const COLUMN_GAP = 10;

/**
 * Columns per row for `count` board columns in `width` px: as many as fit at MIN_COLUMN_WIDTH,
 * then balanced across the rows that needs — 4 columns become 2×2 rather than 3+1, 5 become 3+2.
 */
export function columnsPerRow(count: number, width: number, min = MIN_COLUMN_WIDTH, gap = COLUMN_GAP): number {
  if (count <= 0) return 1;
  const fit = Math.max(1, Math.floor((width + gap) / (min + gap)));
  const rows = Math.ceil(count / fit);
  return Math.ceil(count / rows);
}
