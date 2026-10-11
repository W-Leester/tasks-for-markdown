/**
 * Rendered-view columns (M14–M16, M24): which columns exist, their widths and how a grip moves them.
 * No DOM here — the extension host uses the same list and limits (`RenderedView.ts`).
 */
/** Columns the toolbar menu can hide (M14); status and description always stay. */
export const HIDEABLE_COLUMNS = ['due', 'created', 'done', 'more'] as const;
export type HideableColumn = (typeof HIDEABLE_COLUMNS)[number];
/** Default column widths in em (M16); "more" is a maximum and may shrink in narrow windows. */
export const DEFAULT_WIDTHS: Record<HideableColumn, number> = { due: 8.6, created: 8.6, done: 8.6, more: 18 };
export const MIN_WIDTH = 3;
// 80em (M24, was 40): the last column has nothing on its right to widen, so its own limit is the drag's end.
export const MAX_WIDTH = 80;
export type ColumnWidths = Partial<Record<HideableColumn, number>>;

/** Clamp to the allowed range, rounded to 0.1em. */
export function clampWidth(em: number): number {
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, em)) * 10) / 10;
}

/** The width in effect for a column: a valid saved value, else the default. */
export function widthOf(c: HideableColumn, widths: ColumnWidths = {}): number {
  const w = widths[c];
  return typeof w === 'number' && Number.isFinite(w) ? clampWidth(w) : DEFAULT_WIDTHS[c];
}

/** What sits left of a column's grip: the previous visible column, or the description. */
export function leftNeighbour(c: HideableColumn, hidden: readonly string[]): HideableColumn | 'desc' {
  const visible = HIDEABLE_COLUMNS.filter((x) => !hidden.includes(x));
  return visible[visible.indexOf(c) - 1] ?? 'desc';
}

/**
 * Move the boundary on `c`'s left edge by `d` em (positive = to the right) from the widths `start` (M24).
 * The boundary follows the pointer until there is nothing left to narrow; the table's right edge stays put.
 * - To the right: the columns right of the boundary narrow, nearest first (`c`, then the next ones), each to 3em;
 *   the column on the left widens to 80em and the description takes the rest.
 * - To the left: the columns right of the boundary widen, nearest first, each to 80em (incident #34: stopping when
 *   `c` reached its maximum blocked the drag); the columns on the left narrow, nearest first, each to 3em, and last the
 *   description, but only its `descRoom` em above its 8em minimum (a full description would otherwise push every
 *   column to the right).
 */
export function moveBoundary(c: HideableColumn, hidden: readonly string[], start: ColumnWidths, d: number, descRoom = Infinity): ColumnWidths {
  // Work in tenths of an em so the widths taken and given always add up.
  const tenth = (x: number) => Math.round(x * 10);
  const visible = HIDEABLE_COLUMNS.filter((x) => !hidden.includes(x));
  const at = visible.indexOf(c);
  const rights = visible.slice(at); // c first
  const lefts = visible.slice(0, at).reverse(); // nearest first
  const w: Partial<Record<HideableColumn, number>> = {};
  for (const x of visible) w[x] = tenth(widthOf(x, start));
  const min = tenth(MIN_WIDTH), max = tenth(MAX_WIDTH);
  const step = tenth(d);
  const out: ColumnWidths = { ...start };
  const changed = new Set<HideableColumn>();
  /** Move up to `amount` tenths into (+) or out of (−) the columns, nearest first, within min/max; returns what moved. */
  const spread = (cols: HideableColumn[], amount: number, sign: 1 | -1, limit: number): number => {
    let left = amount;
    for (const x of cols) {
      const room = sign > 0 ? limit - w[x]! : w[x]! - limit;
      const moved = Math.min(left, Math.max(0, room));
      if (moved > 0) { w[x]! += sign * moved; left -= moved; changed.add(x); }
    }
    return amount - left;
  };
  const capacity = (cols: HideableColumn[], sign: 1 | -1, limit: number) => cols.reduce((n, x) => n + Math.max(0, sign > 0 ? limit - w[x]! : w[x]! - limit), 0);
  if (step > 0) {
    const k = Math.min(step, capacity(rights, -1, min));
    if (k <= 0) return out;
    spread(rights, k, -1, min);
    if (lefts[0]) spread([lefts[0]], k, 1, max); // the rest goes to the description
  } else if (step < 0) {
    const room = capacity(lefts, -1, min) + Math.max(0, Math.floor(descRoom * 10));
    const k = Math.min(-step, capacity(rights, 1, max), room);
    if (k <= 0) return out;
    spread(rights, k, 1, max);
    spread(lefts, k, -1, min); // what the columns cannot give comes from the description
  } else return out;
  for (const x of changed) out[x] = w[x]! / 10;
  return out;
}

/** Double-click autofit (M24): the widest content in px, in em of the row font, plus a little air. */
export function fitWidth(contentPx: number, fontPx: number): number {
  return clampWidth((contentPx > 0 && fontPx > 0 ? contentPx / fontPx : 0) + 0.4);
}

/** grid-template-columns for the column layout without the hidden columns (the rest close up), with custom widths. */
export function columnTracks(hidden: readonly string[], widths: ColumnWidths = {}): string {
  const track = (c: HideableColumn) => (c === 'more' ? `minmax(0, ${widthOf(c, widths)}em)` : `${widthOf(c, widths)}em`);
  return ['1.4em', 'minmax(8em, 1fr)', ...HIDEABLE_COLUMNS.filter((c) => !hidden.includes(c)).map(track)].join(' ');
}
