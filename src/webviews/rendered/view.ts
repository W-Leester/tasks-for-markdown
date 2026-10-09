/**
 * View-only sort and scope for the rendered view: reorders and hides task list items in the DOM
 * without touching the file. Pure DOM helpers so they can be unit tested in jsdom.
 */
export type SortMode = 'document' | 'due' | 'created' | 'priority' | 'urgency';
export type ScopeMode = 'all' | 'today' | 'week' | 'nextWeek' | 'overdue' | 'open';
export interface ViewState { sort: SortMode; scope: ScopeMode }

export const SORT_MODES: SortMode[] = ['document', 'due', 'created', 'priority', 'urgency'];
export const SCOPE_MODES: ScopeMode[] = ['all', 'today', 'week', 'nextWeek', 'overdue', 'open'];

interface TaskData { due: string | null; created: string | null; happens: string | null; priority: number; urgency: number; done: boolean; line: number }

function dataOf(li: HTMLElement): TaskData {
  const d = li.dataset;
  return {
    due: d.tfmDue || null,
    created: d.tfmCreated || null,
    happens: d.tfmHappens || null,
    priority: d.tfmPriority !== undefined ? Number(d.tfmPriority) : 3,
    urgency: d.tfmUrgency !== undefined ? Number(d.tfmUrgency) : 0,
    done: d.tfmDone === '1',
    line: Number(d.tfmLine ?? 0),
  };
}

/** Compare for a sort mode; missing dates sort last; ties keep document order. */
export function compare(a: TaskData, b: TaskData, mode: SortMode): number {
  const byDate = (x: string | null, y: string | null) => (x === y ? 0 : x === null ? 1 : y === null ? -1 : x < y ? -1 : 1);
  let c = 0;
  if (mode === 'due') c = byDate(a.due, b.due);
  else if (mode === 'created') c = byDate(a.created, b.created);
  else if (mode === 'priority') c = a.priority - b.priority;
  else if (mode === 'urgency') c = b.urgency - a.urgency;
  return c !== 0 ? c : a.line - b.line;
}

/** Add days to an ISO date (UTC arithmetic keeps it timezone-free). */
function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Monday of the ISO week containing `iso`. */
function mondayOf(iso: string): string {
  const dow = (new Date(iso + 'T00:00:00Z').getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(iso, -dow);
}

export function matchesScope(t: TaskData, scope: ScopeMode, today: string): boolean {
  if (scope === 'all') return true;
  if (t.done) return false; // every other scope is about open work
  if (scope === 'open') return true;
  if (scope === 'overdue') return t.due !== null && t.due < today;
  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);
  const when = t.due ?? t.happens; // prefer the due date, else the earliest date the task "happens"
  if (scope === 'today') return when !== null && when <= today;
  if (scope === 'week') return when !== null && when <= sunday; // this week incl. overdue
  if (scope === 'nextWeek') return when !== null && when <= addDays(sunday, 7);
  return true;
}

/** Task list items that are direct children of the list (via <p> for loose lists they are still li children). */
function taskItems(list: Element): HTMLElement[] {
  return Array.from(list.children).filter((el): el is HTMLElement => el.tagName === 'LI' && el.classList.contains('tfm-task') && (el as HTMLElement).dataset.tfmLine !== undefined);
}

/**
 * Apply sort and scope to every list under `root`. Sorting reorders only the task items of each
 * list and leaves non-task items where they were; nested lists travel with their parent.
 * Returns how many task items are hidden.
 */
export function applyView(root: ParentNode, view: ViewState, today: string): number {
  // Reset from a previous pass.
  for (const li of Array.from(root.querySelectorAll<HTMLElement>('li.tfm-task'))) {
    li.classList.remove('rv-hidden', 'rv-dim');
    if (li.dataset.rvOrder !== undefined) li.style.order = '';
  }
  const lists = Array.from(root.querySelectorAll('ul, ol')).filter((l) => taskItems(l).length > 0);
  for (const list of lists) {
    const items = taskItems(list);
    if (view.sort !== 'document') {
      const sorted = [...items].sort((a, b) => compare(dataOf(a), dataOf(b), view.sort));
      // Rebuild the child order: task slots get the sorted items, everything else stays put.
      const taskSet = new Set<Element>(items);
      let k = 0;
      const order = Array.from(list.children).map((el) => (taskSet.has(el) ? sorted[k++]! : el));
      for (const el of order) list.appendChild(el);
    }
  }
  let hidden = 0;
  if (view.scope !== 'all') {
    const all = Array.from(root.querySelectorAll<HTMLElement>('li.tfm-task')).filter((li) => li.dataset.tfmLine !== undefined);
    // Decide bottom-up so a parent stays visible (dimmed) when a descendant matches.
    const matches = new Map<HTMLElement, boolean>();
    for (const li of all) matches.set(li, matchesScope(dataOf(li), view.scope, today));
    for (const li of all) {
      const own = matches.get(li)!;
      const descendantMatch = Array.from(li.querySelectorAll<HTMLElement>('li.tfm-task')).some((d) => matches.get(d));
      if (!own && !descendantMatch) { li.classList.add('rv-hidden'); hidden++; }
      else if (!own) li.classList.add('rv-dim');
    }
  }
  return hidden;
}

/** Columns the toolbar menu can hide (M14); status and description always stay. */
export const HIDEABLE_COLUMNS = ['due', 'created', 'more'] as const;
export type HideableColumn = (typeof HIDEABLE_COLUMNS)[number];
/** Default column widths in em (M16); "more" is a maximum and may shrink in narrow windows. */
export const DEFAULT_WIDTHS: Record<HideableColumn, number> = { due: 8.6, created: 8.6, more: 18 };
export const MIN_WIDTH = 3;
export const MAX_WIDTH = 40;
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
 * Only that boundary moves: a column on the left trades width with `c` (their sum stays, both within 3–40em);
 * with the description on the left, only `c` changes and the description absorbs it. The table is anchored
 * at the right, so changing `c` alone would shift every boundary between the description and `c` (incident #34).
 */
export function moveBoundary(c: HideableColumn, hidden: readonly string[], start: ColumnWidths, d: number): ColumnWidths {
  const w = widthOf(c, start);
  const left = leftNeighbour(c, hidden);
  if (left === 'desc') return { ...start, [c]: clampWidth(w - d) };
  const lw = widthOf(left, start);
  const lo = Math.max(MIN_WIDTH - lw, w - MAX_WIDTH);
  const hi = Math.min(w - MIN_WIDTH, MAX_WIDTH - lw);
  // Round the step first so the two rounded widths still add up to the same total.
  const step = Math.round(Math.min(hi, Math.max(lo, d)) * 10) / 10;
  return { ...start, [left]: clampWidth(lw + step), [c]: clampWidth(w - step) };
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
