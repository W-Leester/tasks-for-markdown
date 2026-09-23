import { type Dayjs, describeRelative, relativeToEnglish, type RelativeDate } from '../dates';
import type { GroupNode, Layout, QueryResult } from '../query';
import { PRIORITY_EMOJI, PRIORITY_NAME, Priority, StatusType, type Task } from '../task';

export interface RenderOptions {
  today: Dayjs;
  /** Translate a relative date; defaults to English. */
  relative?: (r: RelativeDate, overdue: boolean) => string;
  /** href for a task's source line (relative to the rendering document), or null for no link. */
  link?: (task: Task) => string | null;
  /** Strip the global filter from displayed descriptions. */
  globalFilter?: string;
  /** Translate fixed UI strings. */
  t?: (s: string, ...args: (string | number)[]) => string;
  /** Show raw fields instead of badges (setting preview.renderBadges = false). */
  hideBadges?: boolean;
  /**
   * 'badges' (default): pill chips with relative dates. 'plain': the fields as they appear in the
   * source line (emoji + value, no chips) — what Cursor's rich editor shows — with the relative
   * date in a tooltip and overdue dates still highlighted.
   */
  fieldStyle?: 'badges' | 'plain';
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (s: string, ...args: (string | number)[]) => s.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''));

function opts(o: RenderOptions) {
  return {
    ...o,
    relative: o.relative ?? ((r: RelativeDate, overdue: boolean) => (overdue ? `overdue ${relativeToEnglish(r).replace(' ago', '')}` : relativeToEnglish(r))),
    t: o.t ?? fmt,
  };
}

const PRIORITY_CLASS: Record<Priority, string> = {
  [Priority.Highest]: 'highest', [Priority.High]: 'high', [Priority.Medium]: 'medium', [Priority.None]: 'none', [Priority.Low]: 'low', [Priority.Lowest]: 'lowest',
};

function statusClass(t: Task): string {
  switch (t.status.type) {
    case StatusType.DONE: return 'done';
    case StatusType.CANCELLED: return 'cancelled';
    case StatusType.IN_PROGRESS: return 'in-progress';
    case StatusType.ON_HOLD: return 'on-hold';
    case StatusType.NON_TASK: return 'non-task';
    default: return 'todo';
  }
}

/** Metadata badges for one task, honouring the layout's hidden elements and short mode. */
export function renderBadges(task: Task, layout: Layout | null, o: RenderOptions): string {
  const { today, relative, t } = opts(o);
  if (o.hideBadges) {
    const raw = task.originalMarkdown ? task.originalMarkdown.slice(task.originalMarkdown.indexOf(task.description) + task.description.length).trim() : '';
    return raw ? `<span class="tfm-raw">${esc(raw)}</span>` : '';
  }
  const hidden = layout?.hidden ?? new Set();
  const short = layout?.shortMode ?? false;
  const plain = o.fieldStyle === 'plain';
  const badges: string[] = [];
  const badge = (cls: string, icon: string, text: string, title = '') =>
    badges.push(plain
      ? `<span class="tfm-field tfm-${cls}"${title ? ` title="${esc(title)}"` : ''}>${icon}${text ? ` ${esc(text)}` : ''}</span>`
      : `<span class="tfm-badge tfm-${cls}"${title ? ` title="${esc(title)}"` : ''}>${icon}${short ? '' : ` ${esc(text)}`}</span>`);

  if (!hidden.has('priority') && task.priority !== Priority.None) badge(`pri-${PRIORITY_CLASS[task.priority]}`, PRIORITY_EMOJI[task.priority], plain ? '' : PRIORITY_NAME[task.priority], plain ? PRIORITY_NAME[task.priority] : '');
  if (!hidden.has('recurrence rule') && task.recurrenceText) badge('recur', '🔁', task.recurrenceText);
  if (!hidden.has('on completion') && task.onCompletion) badge('oncompletion', '🏁', task.onCompletion);
  if (!hidden.has('id') && task.id) badge('id', '🆔', task.id);
  if (!hidden.has('depends on') && task.dependsOn.length) badge('dependson', '⛔', task.dependsOn.join(','));
  const date = (name: 'created' | 'start' | 'scheduled' | 'due' | 'done' | 'cancelled', icon: string, el: Layout['hidden'] extends Set<infer E> ? E : never) => {
    const f = task[name];
    if (!f || hidden.has(el)) return;
    if (!f.valid) return badge(`${name} tfm-invalid`, icon, `${f.raw} (${t('invalid date')})`);
    const overdue = name === 'due' && !task.isCompleted && f.date!.isBefore(today, 'day');
    const rel = relative(describeRelative(f.date!, today), overdue);
    badge(`${name}${overdue ? ' tfm-overdue' : ''}`, icon, short ? '' : plain ? f.format() : `${f.format()} · ${rel}`, `${name}: ${f.format()} (${rel})`);
  };
  date('created', '➕', 'created date');
  date('start', '🛫', 'start date');
  date('scheduled', '⏳', 'scheduled date');
  date('due', '📅', 'due date');
  date('done', '✅', 'done date');
  date('cancelled', '❌', 'cancelled date');
  if (!badges.length) return '';
  return plain ? `<span class="tfm-fields">${badges.join(' ')}</span>` : `<span class="tfm-badges">${badges.join('')}</span>`;
}

/** Description with tags wrapped, global filter removed; plain text (no inline markdown) — used for query results. */
export function renderDescriptionText(task: Task, o: RenderOptions): string {
  let d = task.description;
  if (o.globalFilter) d = d.replace(o.globalFilter, '').replace(/\s{2,}/g, ' ').trim();
  const html = esc(d).replace(/(^|\s)(#[^\s#]+)/g, (_, sp, tag) => `${sp}<span class="tfm-tag">${tag}</span>`);
  return html || `<em class="tfm-empty">${esc((o.t ?? fmt)('(empty task)'))}</em>`;
}

export function renderCheckbox(task: Task): string {
  const checked = task.isCompleted ? ' checked' : '';
  return `<input type="checkbox" class="tfm-check" disabled${checked} data-symbol="${esc(task.status.symbol)}" title="[${esc(task.status.symbol)}] ${esc(task.status.name)}">`;
}

/** One result row in a query block. */
export function renderTaskRow(task: Task, layout: Layout | null, o: RenderOptions): string {
  const href = o.link?.(task);
  const where = `${task.location.path}:${task.location.line + 1}`;
  const backlink = layout?.hidden.has('backlink') ? '' : `<span class="tfm-backlink">${href ? `<a href="${esc(href)}" title="${esc(where)}">${esc(task.location.path.split('/').pop()!.replace(/\.md$/, ''))}${task.location.heading ? ` › ${esc(task.location.heading)}` : ''}</a>` : esc(where)}</span>`;
  return `<li class="tfm-task tfm-status-${statusClass(task)}" data-tfm-path="${esc(task.location.path)}" data-tfm-line="${task.location.line}">${renderCheckbox(task)}<span class="tfm-desc">${renderDescriptionText(task, o)}</span>${renderBadges(task, layout, o)}${backlink}</li>`;
}

function renderGroup(node: GroupNode, depth: number, layout: Layout, o: RenderOptions, out: string[]): void {
  if (node.children.length) {
    for (const c of node.children) {
      const level = Math.min(6, 4 + depth);
      out.push(`<h${level} class="tfm-group tfm-group-${depth}">${esc(c.name)}<span class="tfm-count">${c.count}</span></h${level}>`);
      renderGroup(c, depth + 1, layout, o, out);
    }
    return;
  }
  out.push(`<ul class="tfm-list${layout.hidden.has('tree') ? '' : ' tfm-tree'}">`);
  for (const task of node.tasks) out.push(renderTaskRow(task, layout, o));
  out.push('</ul>');
}

/** Full HTML for a ```tasks block (FR-4.4 / FR-4.5). */
export function renderQueryResult(result: QueryResult, layout: Layout, queryText: string, o: RenderOptions): string {
  const t = o.t ?? fmt;
  const out: string[] = ['<div class="tfm-query">'];
  if (result.errors.length) {
    out.push('<div class="tfm-error"><strong>' + esc(t('Tasks query error')) + '</strong>');
    for (const e of result.errors) out.push(`<div>${esc(t('Line {0}: {1}', e.line, e.message))}<br><code>${esc(e.text)}</code></div>`);
    out.push('</div></div>');
    return out.join('');
  }
  if (layout.explain) out.push(`<details class="tfm-explain" open><summary>${esc(t('Explanation'))}</summary><pre>${esc(result.explain)}</pre></details>`);
  for (const e of result.runtimeErrors) out.push(`<div class="tfm-error">${esc(e)}</div>`);
  if (result.root.count === 0) out.push(`<div class="tfm-empty-result">${esc(t('No tasks match this query.'))}</div>`);
  else renderGroup(result.root, 0, layout, o, out);
  if (!layout.hidden.has('task count')) out.push(`<div class="tfm-task-count">${esc(t('{0} of {1} tasks', result.shown, result.matched))}</div>`);
  out.push('</div>');
  return out.join('');
}

export { esc as escapeHtml };
