<script lang="ts">
  import { onMount } from 'svelte';
  import { daysBetween } from '../shared/format';
  import { setBundle, t } from '../shared/l10n';
  import type { InitState, TaskDto } from '../shared/protocol';
  import { nextRequestId, onMessage, post } from '../shared/vscode.svelte';

  type Field = 'due' | 'scheduled' | 'start';
  interface Item { task: TaskDto; field: Field; date: string }

  let init: InitState | null = $state(null);
  let tasks: TaskDto[] = $state([]);
  let view: 'month' | 'week' = $state('month');
  let cursor = $state(''); // ISO date inside the shown month/week
  let show: Record<Field, boolean> = $state({ due: true, scheduled: true, start: false });
  let source = $state('open');
  let creating: string | null = $state(null); // ISO date of the cell with the inline input
  let newText = $state('');
  let fullscreen = $state(false);
  let gridHeight = $state(0);
  let request = 0;

  const ICON: Record<Field, string> = { due: '📅', scheduled: '⏳', start: '🛫' };
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function iso(d: Date): string { return d.toISOString().slice(0, 10); }
  function parse(s: string): Date { return new Date(s + 'T00:00:00Z'); }
  function addDays(s: string, n: number): string { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  function isoWeekday(s: string): number { return (parse(s).getUTCDay() + 6) % 7; } // 0 = Monday
  function monthLabel(s: string): string { return parse(s).toLocaleDateString(init?.locale ?? 'en', { year: 'numeric', month: 'long', timeZone: 'UTC' }); }

  function queryText(): string {
    if (source === 'open') return 'not done';
    if (source === 'all') return '';
    const q = init?.savedQueries.find((s) => s.id === source)?.query ?? 'not done';
    return q.split('\n').filter((l) => !/^\s*group by\b/i.test(l)).join('\n');
  }
  function run() { request = nextRequestId(); post({ type: 'query/run', requestId: request, query: queryText() }); }
  function saveUi() { post({ type: 'ui/state', state: { view, show, source } }); }

  /** Days shown: 6 rows of 7 for the month grid, or 7 for the week. */
  const days = $derived.by(() => {
    if (!cursor) return [] as string[];
    if (view === 'week') { const mon = addDays(cursor, -isoWeekday(cursor)); return Array.from({ length: 7 }, (_, i) => addDays(mon, i)); }
    const first = cursor.slice(0, 8) + '01';
    const gridStart = addDays(first, -isoWeekday(first));
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  });
  const itemsByDay = $derived.by(() => {
    const map = new Map<string, Item[]>();
    for (const task of tasks) {
      for (const field of ['due', 'scheduled', 'start'] as Field[]) {
        const date = task[field];
        if (!date || !show[field]) continue;
        map.set(date, [...(map.get(date) ?? []), { task, field, date }]);
      }
    }
    for (const list of map.values()) list.sort((a, b) => a.task.urgency - b.task.urgency);
    return map;
  });
  const title = $derived(view === 'month' ? monthLabel(cursor) : `${days[0]} – ${days[6]}`);
  const fontSize = $derived(Math.min(24, Math.max(9, init?.calendarFontSize ?? 13)));
  /** Rendered height of one item row: font × line-height + padding + grid gap (keep in sync with .item CSS). */
  const itemHeight = $derived(fontSize * 1.35 + 2 + 2);
  /** How many items fit in a month cell: grows with the panel height (full screen shows more). */
  const maxItems = $derived(view === 'week' ? Infinity : Math.max(2, Math.floor(((gridHeight - 26) / 6 - 28) / itemHeight)));

  function move(n: number) {
    if (view === 'week') cursor = addDays(cursor, 7 * n);
    else { const d = parse(cursor.slice(0, 8) + '01'); d.setUTCMonth(d.getUTCMonth() + n); cursor = iso(d); }
  }
  function onDragStart(e: DragEvent, item: Item) {
    e.dataTransfer?.setData('application/x-tfm-cal', JSON.stringify({ key: item.task.key, line: item.task.line, field: item.field }));
    e.dataTransfer!.effectAllowed = 'move';
  }
  function onDrop(e: DragEvent, day: string) {
    e.preventDefault();
    const raw = e.dataTransfer?.getData('application/x-tfm-cal');
    if (!raw) return;
    const { key, line, field } = JSON.parse(raw) as { key: string; line: number; field: Field };
    post({ type: 'task/setField', key, line, field, value: day });
  }
  function startCreate(day: string) { creating = day; newText = ''; queueMicrotask(() => (document.getElementById('new-' + day) as HTMLInputElement | null)?.focus()); }
  function commitCreate() {
    if (creating && newText.trim()) post({ type: 'task/create', key: null, line: null, fields: { description: newText.trim(), due: creating } });
    creating = null;
  }

  onMount(() => {
    const off = onMessage((m) => {
      if (m.type === 'state/init') {
        init = m.state; setBundle(m.state.l10n); cursor = m.state.today;
        const ui = m.state.uiState as { view?: 'month' | 'week'; show?: Record<Field, boolean>; source?: string; fullscreen?: boolean };
        if (ui.view) view = ui.view; if (ui.show) show = ui.show; if (ui.source) source = ui.source;
        fullscreen = ui.fullscreen === true;
        run();
      } else if (m.type === 'state/patch') { init = { ...(init as InitState), ...m.state }; run(); }
      else if (m.type === 'query/result' && m.requestId === request) tasks = m.groups ? flatten(m.groups) : m.tasks;
      else if (m.type === 'index/changed') run();
      else if (m.type === 'ui/fullscreen') fullscreen = m.on;
    });
    post({ type: 'ui/ready' });
    return off;
  });
  function flatten(g: { tasks: TaskDto[]; children: unknown[] }): TaskDto[] {
    const out: TaskDto[] = [...g.tasks];
    for (const c of g.children as (typeof g)[]) out.push(...flatten(c));
    return out;
  }
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape' && fullscreen && !creating) { e.preventDefault(); post({ type: 'ui/fullscreen', on: false }); } }} />

<main>
  <header>
    <button class="nav" onclick={() => move(-1)} aria-label={t('Previous')}>◀</button>
    <h2>{title}</h2>
    <button class="nav" onclick={() => move(1)} aria-label={t('Next')}>▶</button>
    <button class="tfm-btn secondary" onclick={() => (cursor = init?.today ?? cursor)}>{t('Today')}</button>
    <div class="modes" role="tablist">
      <button role="tab" aria-selected={view === 'month'} class:active={view === 'month'} onclick={() => { view = 'month'; saveUi(); }}>{t('Month')}</button>
      <button role="tab" aria-selected={view === 'week'} class:active={view === 'week'} onclick={() => { view = 'week'; saveUi(); }}>{t('Week')}</button>
    </div>
    <span class="toggles">
      {#each ['due', 'scheduled', 'start'] as Field[] as f (f)}
        <label><input type="checkbox" bind:checked={show[f]} onchange={saveUi} /> {ICON[f]} {t(f)}</label>
      {/each}
    </span>
    <label>{t('Tasks')} <select class="tfm-input" bind:value={source} onchange={() => { saveUi(); run(); }}>
      <option value="open">{t('All open')}</option><option value="all">{t('All (incl. done)')}</option>
      {#each init?.savedQueries ?? [] as q (q.id)}<option value={q.id}>{q.name}</option>{/each}
    </select></label>
    <button class="nav fs" onclick={() => post({ type: 'ui/fullscreen', on: !fullscreen })} aria-pressed={fullscreen}
      title={fullscreen ? `${t('Exit full screen')} (${t('Esc')})` : t('Full screen')}>{fullscreen ? '⤡' : '⤢'} {fullscreen ? t('Exit full screen') : t('Full screen')}</button>
  </header>

  {#if init}
    <div class="grid" class:week={view === 'week'} bind:clientHeight={gridHeight} style:--tfm-cal-font={fontSize + 'px'}>
      {#each DOW as d, i (d)}<div class="dow" class:weekend={i >= 5}>{t(d)}</div>{/each}
      {#each days as day (day)}
        {@const inMonth = view === 'week' || day.slice(0, 7) === cursor.slice(0, 7)}
        {@const items = itemsByDay.get(day) ?? []}
        <div class="cell" class:today={day === init.today} class:muted={!inMonth} class:weekend={isoWeekday(day) >= 5} role="gridcell" tabindex="-1"
          ondragover={(e) => { e.preventDefault(); e.dataTransfer!.dropEffect = 'move'; }} ondrop={(e) => onDrop(e, day)}
          ondblclick={(e) => { if (e.target === e.currentTarget) startCreate(day); }}>
          <div class="day"><span class="num">{Number(day.slice(8))}</span>{#if items.length > maxItems}<span class="tfm-muted more">+{items.length - maxItems}</span>{/if}</div>
          {#each view === 'month' ? items.slice(0, maxItems) : items as item (item.task.key + item.task.line + item.field)}
            <div class="item {item.field}" class:done={item.task.isCompleted} class:overdue={!item.task.isCompleted && item.field === 'due' && daysBetween(init.today, item.date) < 0}
              draggable="true" role="button" tabindex="0" title={`${item.task.description}\n${item.task.path}:${item.task.line + 1}`}
              ondragstart={(e) => onDragStart(e, item)}
              onclick={() => post({ type: 'task/edit', key: item.task.key, line: item.task.line })}
              ondblclick={(e) => { e.stopPropagation(); post({ type: 'task/open', key: item.task.key, line: item.task.line }); }}
              onkeydown={(e) => { if (e.key === 'Enter') post({ type: 'task/edit', key: item.task.key, line: item.task.line }); }}>
              {ICON[item.field]} {item.task.description}
            </div>
          {/each}
          {#if creating === day}
            <input id={'new-' + day} class="tfm-input new" type="text" placeholder={t('New task…')} bind:value={newText}
              onkeydown={(e) => { if (e.key === 'Enter') commitCreate(); if (e.key === 'Escape') creating = null; }} onblur={commitCreate} />
          {/if}
        </div>
      {/each}
    </div>
    <p class="tfm-muted small">{t('Click: edit · Double-click: open · Drag to another day: move the date · Double-click an empty cell: new task')}</p>
  {/if}
</main>

<style>
  main { padding: 8px 12px 16px; display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; }
  header { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; margin-bottom: 8px; }
  h2 { margin: 0; font-size: 1.05em; min-width: 9em; }
  .nav { background: none; border: 1px solid var(--tfm-border); border-radius: 3px; cursor: pointer; color: inherit; padding: 2px 8px; }
  .modes button { background: var(--tfm-panel); color: inherit; border: 1px solid var(--tfm-border); padding: 3px 10px; cursor: pointer; }
  .modes button:first-child { border-radius: 4px 0 0 4px; } .modes button:last-child { border-radius: 0 4px 4px 0; }
  .modes button.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
  .toggles { display: inline-flex; gap: 10px; } .toggles label { display: inline-flex; gap: 4px; align-items: center; }
  .fs { margin-left: auto; }
  .grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); grid-template-rows: auto repeat(6, minmax(90px, 1fr)); gap: 2px; flex: 1; min-height: 0; }
  .grid.week { grid-template-rows: auto 1fr; }
  .grid.week .cell { overflow: auto; }
  .dow { text-align: center; font-size: 0.85em; padding: 4px 0; background: var(--tfm-panel); border-radius: 3px; }
  .dow.weekend { color: var(--tfm-muted); }
  .cell { border: 1px solid var(--tfm-border); border-radius: 4px; padding: 3px 4px; overflow: hidden; display: flex; flex-direction: column; gap: 2px; background: var(--tfm-bg); }
  .cell.muted { opacity: 0.55; } .cell.weekend { background: var(--tfm-panel); }
  .cell.today { border-color: var(--tfm-accent); box-shadow: inset 0 0 0 1px var(--tfm-accent); }
  .day { display: flex; justify-content: space-between; align-items: baseline; }
  .cell.today .num { background: var(--tfm-accent); color: var(--vscode-button-foreground); border-radius: 50%; width: 1.5em; height: 1.5em; display: inline-flex; align-items: center; justify-content: center; }
  .num { font-size: 0.85em; }
  .more { font-size: 0.75em; }
  .item { font-size: var(--tfm-cal-font, 13px); line-height: 1.35; padding: 1px 5px; border-radius: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: grab; }
  .item.due { background: color-mix(in srgb, var(--vscode-charts-blue, #3794ff) 22%, transparent); }
  .item.scheduled { background: color-mix(in srgb, var(--vscode-charts-yellow, #cca700) 25%, transparent); }
  .item.start { background: color-mix(in srgb, var(--vscode-charts-green, #89d185) 25%, transparent); }
  .item.overdue { background: var(--tfm-overdue-bg); color: var(--tfm-error); }
  .item.done { opacity: 0.55; text-decoration: line-through; }
  .item:focus-visible, .item:hover { outline: 1px solid var(--tfm-accent); }
  .new { font-size: 0.85em; width: 100%; box-sizing: border-box; }
  .small { font-size: 0.85em; margin: 6px 0 0; }
</style>
