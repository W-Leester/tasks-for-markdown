/**
 * The column header over query results in the live view (M40, A): titles, ✕ to hide a column, ＋ to show it again,
 * a grip on each column's left edge to drag its width (←/→ keys, Home resets, double-click fits the content). The same
 * choice as the rendered view (the host keeps one for both). Ported from the rendered view (M14–M16, M24) — to be
 * shared when the trial is merged.
 */
import { clampWidth, type ColumnWidths, columnTracks, fitWidth, HIDEABLE_COLUMNS, type HideableColumn, MAX_WIDTH, moveBoundary, widthOf } from '../rendered/columns';

import type { ColumnLabels, ColumnState } from './sync';

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => `&#${ch.charCodeAt(0)};`);

export class QueryColumns {
  private hidden: string[] = [];
  private widths: ColumnWidths = {};
  private labels: ColumnLabels = { desc: 'Description', due: 'Due date', created: 'Created date', done: 'Done date', more: 'Other fields', hide: 'Hide column', show: 'Show column', width: 'Column width', widthHint: 'Drag to resize, double-click to fit the content' };

  /** `root`: where the result boxes are; `save`: tell the host about a change. */
  constructor(private readonly root: HTMLElement, private readonly save: (change: { hidden?: string[]; widths?: Record<string, number> }) => void, private readonly onHidden: (hidden: readonly string[]) => void = () => undefined) {
    root.addEventListener('click', (e) => this.onClick(e));
    root.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    root.addEventListener('keydown', (e) => this.onKeyDown(e), true);
    root.addEventListener('dblclick', (e) => this.onDoubleClick(e));
  }

  set(state: ColumnState): void {
    this.labels = state.labels;
    this.widths = { ...state.widths };
    this.applyHidden(state.hidden);
  }

  /** A header row on its own (over a task list in the note, M40 C). */
  headerElement(): HTMLElement {
    const head = document.createElement('div');
    head.className = 'rv-colhead cm-lv-bodyhead';
    head.innerHTML = this.headerHtml();
    return head;
  }

  /** A new result box: its header (only where there are task rows). */
  addHeader(box: HTMLElement): void {
    const query = box.querySelector<HTMLElement>('.tfm-query');
    if (!query?.querySelector('li.tfm-task') || document.body.classList.contains('fields-plain')) return;
    const head = document.createElement('div');
    head.className = 'rv-colhead';
    head.title = document.body.dataset.lQueryEdit ?? 'Double-click to edit the query';
    head.innerHTML = this.headerHtml();
    query.insertBefore(head, query.firstChild);
  }

  private label(c: string): string {
    return (this.labels as unknown as Record<string, string>)[c] ?? c;
  }

  private headerHtml(): string {
    const chips = this.hidden.length ? `<span class="rv-colhead-chips">${this.hidden.map((c) => `<button type="button" data-show="${c}" title="${esc(this.labels.show)}">+ ${esc(this.label(c))}</button>`).join('')}</span>` : '';
    return `<span></span><span class="rv-colhead-cell rv-colhead-desc"><span class="rv-colhead-text">${esc(this.labels.desc)}</span>${chips}</span>` +
      HIDEABLE_COLUMNS.filter((c) => !this.hidden.includes(c)).map((c) =>
        `<span class="rv-colhead-cell"><span class="rv-colgrip" role="separator" aria-orientation="vertical" tabindex="0" data-col="${c}" aria-valuenow="${widthOf(c, this.widths)}" aria-valuemin="3" aria-valuemax="${MAX_WIDTH}" aria-label="${esc(`${this.labels.width}: ${this.label(c)}`)}" title="${esc(this.labels.widthHint)}"></span>` +
        `<span class="rv-colhead-text">${esc(this.label(c))}</span><button type="button" data-hide="${c}" title="${esc(this.labels.hide)}" aria-label="${esc(`${this.labels.hide}: ${this.label(c)}`)}">✕</button></span>`).join('');
  }

  private applyWidths(): void {
    const tracks = columnTracks(this.hidden, this.widths);
    document.body.style.setProperty('--rv-cols', tracks);
    // Note task lines (M40 C): the checkbox is outside the row's grid.
    document.body.style.setProperty('--rv-cols-body', tracks.replace(/^\S+\s+/, ''));
  }

  /** From the toolbar's column menu. */
  setHidden(hidden: readonly string[]): void {
    this.applyHidden(hidden);
    this.save({ hidden: this.hidden });
  }

  private applyHidden(hidden: readonly string[]): void {
    this.hidden = HIDEABLE_COLUMNS.filter((c) => hidden.includes(c));
    this.onHidden(this.hidden);
    for (const c of HIDEABLE_COLUMNS) document.body.classList.toggle(`hide-col-${c}`, this.hidden.includes(c));
    this.applyWidths();
    for (const head of Array.from(this.root.querySelectorAll<HTMLElement>('.rv-colhead'))) head.innerHTML = this.headerHtml();
  }

  private onClick(e: MouseEvent): void {
    const b = (e.target as Element).closest<HTMLButtonElement>('.rv-colhead button');
    if (!b) return;
    e.preventDefault();
    const hidden = b.dataset.hide ? [...this.hidden, b.dataset.hide] : this.hidden.filter((c) => c !== b.dataset.show);
    this.applyHidden(hidden);
    this.save({ hidden: this.hidden });
  }

  private saveWidths(): void {
    this.save({ widths: { ...this.widths } as Record<string, number> });
    for (const g of Array.from(this.root.querySelectorAll<HTMLElement>('.rv-colgrip'))) g.setAttribute('aria-valuenow', String(widthOf(g.dataset.col as HideableColumn, this.widths)));
  }

  /** Widths as drawn, in em (the "more" track may be narrower than its setting; the description gives only above 8em). */
  private drawn(grip: HTMLElement): { widths: ColumnWidths; descRoom: number; px: number } {
    const head = grip.closest<HTMLElement>('.rv-colhead')!;
    const px = parseFloat(getComputedStyle(head).fontSize) || 14;
    const em = (el: Element | null | undefined) => (el ? el.getBoundingClientRect().width / px : 0);
    const widths: ColumnWidths = { ...this.widths };
    for (const c of HIDEABLE_COLUMNS) {
      const w = em(head.querySelector(`.rv-colgrip[data-col="${c}"]`)?.parentElement);
      if (w > 0 && w < widthOf(c, this.widths) - 0.1) widths[c] = clampWidth(w);
    }
    const desc = em(head.querySelector('.rv-colhead-desc'));
    return { widths, descRoom: desc > 0 ? Math.max(0, desc - 8) : Infinity, px };
  }

  private onPointerDown(e: PointerEvent): void {
    const grip = (e.target as Element).closest<HTMLElement>('.rv-colgrip');
    if (!grip || e.button !== 0) return;
    e.preventDefault();
    const c = grip.dataset.col as HideableColumn;
    const startX = e.clientX;
    const { widths: start, descRoom, px } = this.drawn(grip);
    document.body.classList.add('rv-resizing');
    grip.classList.add('rv-active');
    try { grip.setPointerCapture(e.pointerId); } catch { /* not supported */ }
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (ev.clientX === startX && !moved) return;
      moved = true;
      this.widths = moveBoundary(c, this.hidden, start, (ev.clientX - startX) / px, descRoom);
      this.applyWidths();
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      document.body.classList.remove('rv-resizing');
      grip.classList.remove('rv-active');
      if (moved) this.saveWidths(); // a plain click (or half a double-click) changes nothing
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  }

  private onKeyDown(e: KeyboardEvent): void {
    const grip = (e.target as Element).closest<HTMLElement>('.rv-colgrip');
    if (!grip) return;
    const c = grip.dataset.col as HideableColumn;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const { widths, descRoom } = this.drawn(grip);
      this.widths = moveBoundary(c, this.hidden, widths, e.key === 'ArrowLeft' ? -0.5 : 0.5, descRoom);
    } else if (e.key === 'Home') {
      delete this.widths[c];
    } else return;
    e.preventDefault();
    e.stopPropagation(); // not the editor's keys
    this.applyWidths();
    this.saveWidths();
  }

  /** Double-click a grip: the widest visible cell or the title, whichever is wider. */
  private onDoubleClick(e: MouseEvent): void {
    const grip = (e.target as Element).closest<HTMLElement>('.rv-colgrip');
    if (!grip) return;
    e.preventDefault();
    const c = grip.dataset.col as HideableColumn;
    const px = parseFloat(getComputedStyle(grip.closest('.rv-colhead')!).fontSize) || 14;
    let widest = natural(grip.parentElement!);
    for (const cell of Array.from(this.root.querySelectorAll<HTMLElement>(`.cm-lv-query li.tfm-task > .tfm-col-${c}, .cm-lv-query li.tfm-task > p > .tfm-col-${c}, .cm-lv-row > .tfm-col-${c}`))) {
      if (cell.getClientRects().length) widest = Math.max(widest, natural(cell));
    }
    this.widths[c] = clampWidth(fitWidth(widest, px));
    this.applyWidths();
    this.saveWidths();
  }
}

/** Natural one-line width of a cell: a hidden max-content copy next to it, so it gets the same fonts. */
function natural(el: HTMLElement): number {
  const probe = el.cloneNode(true) as HTMLElement;
  probe.classList.add('rv-measure');
  for (const g of Array.from(probe.querySelectorAll('.rv-colgrip'))) g.remove();
  el.parentElement!.appendChild(probe);
  const w = probe.getBoundingClientRect().width;
  probe.remove();
  return w;
}
