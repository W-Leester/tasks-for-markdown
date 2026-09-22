<script lang="ts">
  import { onMount } from 'svelte';
  import TaskCard from '../shared/components/TaskCard.svelte';
  import { daysBetween } from '../shared/format';
  import { setBundle, t } from '../shared/l10n';
  import type { InitState, StatusDto, TaskDto, TaskFieldName } from '../shared/protocol';
  import { nextRequestId, onMessage, post } from '../shared/vscode.svelte';

  type Mode = 'status' | 'due' | 'priority' | 'file';
  interface Column { id: string; label: string; tasks: TaskDto[]; drop: ((task: TaskDto) => { field: TaskFieldName; value: string | null } | null) | null }

  let init: InitState | null = $state(null);
  let tasks: TaskDto[] = $state([]);
  let errors: string[] = $state([]);
  let mode: Mode = $state('status');
  let source = $state('open'); // 'open' | 'all' | saved query id
  let search = $state('');
  let activeTab = $state(0);
  let narrow = $state(false);
  let dragOver: string | null = $state(null);
  let request = 0;

  const STATUS_ORDER = ['IN_PROGRESS', 'TODO', 'ON_HOLD', 'DONE', 'CANCELLED'];
  const DUE_ORDER = ['overdue', 'today', 'tomorrow', 'week', 'next', 'later', 'none'];
  const DUE_LABEL: Record<string, string> = { overdue: 'Overdue', today: 'Today', tomorrow: 'Tomorrow', week: 'This week', next: 'Next week', later: 'Later', none: 'No due date' };

  function queryText(): string {
    if (source === 'open') return 'not done';
    if (source === 'all') return '';
    const q = init?.savedQueries.find((s) => s.id === source)?.query ?? 'not done';
    // Columns need a flat list, so drop any group by lines.
    return q.split('\n').filter((l) => !/^\s*group by\b/i.test(l)).join('\n');
  }
  function run() {
    request = nextRequestId();
    post({ type: 'query/run', requestId: request, query: queryText() });
  }
  function saveUi() { post({ type: 'ui/state', state: { mode, source } }); }

  function isoAdd(iso: string, days: number): string {
    const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
  }
  function weekday(iso: string): number { return new Date(iso + 'T00:00:00Z').getUTCDay(); } // 0 = Sunday
  function dueBucket(task: TaskDto, today: string): string {
    if (!task.due) return 'none';
    const d = daysBetween(today, task.due);
    if (d < 0) return 'overdue';
    if (d === 0) return 'today';
    if (d === 1) return 'tomorrow';
    const dow = weekday(today); const toSunday = dow === 0 ? 0 : 7 - dow;
    if (d <= toSunday) return 'week';
    if (d <= toSunday + 7) return 'next';
    return 'later';
  }

  const filtered = $derived.by(() => {
    const q = search.trim().toLowerCase();
    return q ? tasks.filter((x) => x.description.toLowerCase().includes(q) || x.path.toLowerCase().includes(q)) : tasks;
  });

  const columns: Column[] = $derived.by(() => {
    if (!init) return [];
    const today = init.today;
    const list = filtered;
    if (mode === 'status') {
      const byType = new Map<string, StatusDto[]>();
      for (const s of init.statuses) byType.set(s.type, [...(byType.get(s.type) ?? []), s]);
      const types = [...STATUS_ORDER.filter((x) => byType.has(x)), ...[...byType.keys()].filter((x) => !STATUS_ORDER.includes(x) && x !== 'NON_TASK')];
      return types.map((type) => ({
        id: type,
        label: byType.get(type)!.map((s) => s.name).slice(0, 2).join(' / '),
        tasks: list.filter((x) => x.status.type === type),
        drop: (task) => (task.status.type === type ? null : { field: 'status', value: byType.get(type)![0]!.symbol }),
      }));
    }
    if (mode === 'due') {
      const dow = weekday(today); const sunday = isoAdd(today, dow === 0 ? 0 : 7 - dow); const nextMonday = isoAdd(sunday, 1);
      const target: Record<string, string | null | undefined> = { today, tomorrow: isoAdd(today, 1), week: sunday, next: nextMonday, later: isoAdd(today, 14), none: null, overdue: undefined };
      return DUE_ORDER.map((id) => ({
        id, label: t(DUE_LABEL[id]!),
        tasks: list.filter((x) => dueBucket(x, today) === id),
        drop: target[id] === undefined ? null : (task) => (dueBucket(task, today) === id ? null : { field: 'due', value: target[id] ?? null }),
      }));
    }
    if (mode === 'priority') {
      const labels: Record<string, string> = { '0': '🔺 Highest', '1': '⏫ High', '2': '🔼 Medium', '3': 'Normal', '4': '🔽 Low', '5': '⏬ Lowest' };
      return ['0', '1', '2', '3', '4', '5'].map((p) => ({ id: p, label: labels[p]!, tasks: list.filter((x) => x.priority === p), drop: (task) => (task.priority === p ? null : { field: 'priority', value: p }) }));
    }
    const files = [...new Set(list.map((x) => x.path))].sort();
    return files.map((f) => ({ id: f, label: f.split('/').pop()!.replace(/\.md$/, ''), tasks: list.filter((x) => x.path === f), drop: null }));
  });

  function onDrop(e: DragEvent, col: Column) {
    e.preventDefault(); dragOver = null;
    const raw = e.dataTransfer?.getData('application/x-tfm-task');
    if (!raw || !col.drop) return;
    const { key, line } = JSON.parse(raw) as { key: string; line: number };
    const task = tasks.find((x) => x.key === key && x.line === line);
    if (!task) return;
    const change = col.drop(task);
    if (change) post({ type: 'task/setField', key, line, field: change.field, value: change.value });
  }

  onMount(() => {
    const off = onMessage((m) => {
      if (m.type === 'state/init') {
        init = m.state; setBundle(m.state.l10n);
        const ui = m.state.uiState as { mode?: Mode; source?: string };
        if (ui.mode) mode = ui.mode; if (ui.source) source = ui.source;
        run();
      } else if (m.type === 'state/patch') { init = { ...(init as InitState), ...m.state }; run(); }
      else if (m.type === 'query/result') { if (m.requestId === request) { tasks = m.groups ? flatten(m.groups) : m.tasks; errors = m.errors; } }
      else if (m.type === 'index/changed') run();
    });
    const ro = new ResizeObserver(() => (narrow = window.innerWidth < 520));
    ro.observe(document.body);
    narrow = window.innerWidth < 520;
    post({ type: 'ui/ready' });
    return () => { off(); ro.disconnect(); };
  });
  function flatten(g: { tasks: TaskDto[]; children: { tasks: TaskDto[]; children: unknown[] }[] }): TaskDto[] {
    const out: TaskDto[] = [...g.tasks];
    for (const c of g.children as typeof g[]) out.push(...flatten(c));
    return out;
  }
</script>

<main class:narrow>
  <div class="toolbar">
    <label>{t('Columns')} <select class="tfm-input" bind:value={mode} onchange={saveUi}>
      <option value="status">{t('Status')}</option><option value="due">{t('Due date')}</option><option value="priority">{t('Priority')}</option><option value="file">{t('File')}</option>
    </select></label>
    <label>{t('Tasks')} <select class="tfm-input" bind:value={source} onchange={() => { saveUi(); run(); }}>
      <option value="open">{t('All open')}</option><option value="all">{t('All (incl. done)')}</option>
      {#each init?.savedQueries ?? [] as q (q.id)}<option value={q.id}>{q.name}</option>{/each}
    </select></label>
    <input class="tfm-input search" type="search" placeholder={t('Filter…')} bind:value={search} />
    <span class="tfm-muted count">{filtered.length}</span>
  </div>
  {#if errors.length}<div class="error">{errors.join(' · ')}</div>{/if}

  {#if narrow}
    <div class="tabs" role="tablist">
      {#each columns as col, i (col.id)}
        <button role="tab" aria-selected={i === activeTab} class:active={i === activeTab} onclick={() => (activeTab = i)}
          ondragover={(e) => { if (col.drop) { e.preventDefault(); activeTab = i; } }}>{col.label} <span class="n">{col.tasks.length}</span></button>
      {/each}
    </div>
  {/if}

  <div class="board" class:tabs-mode={narrow}>
    {#each columns as col, i (col.id)}
      {#if !narrow || i === activeTab}
        <section class="column" role="list" aria-label={col.label} class:over={dragOver === col.id} class:readonly={!col.drop}
          ondragover={(e) => { if (col.drop) { e.preventDefault(); e.dataTransfer!.dropEffect = 'move'; dragOver = col.id; } }}
          ondragleave={() => (dragOver === col.id ? (dragOver = null) : null)}
          ondrop={(e) => onDrop(e, col)}>
          {#if !narrow}<h3>{col.label} <span class="n">{col.tasks.length}</span></h3>{/if}
          <div class="cards">
            {#each col.tasks as task (task.key + '#' + task.line)}
              <TaskCard {task} today={init?.today ?? ''} showFile={mode !== 'file'} />
            {/each}
            {#if !col.tasks.length}<div class="empty tfm-muted">{col.drop ? t('Drop tasks here') : '—'}</div>{/if}
          </div>
        </section>
      {/if}
    {/each}
  </div>
</main>

<style>
  main { display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; padding: 8px 10px; gap: 8px; }
  .toolbar { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
  .toolbar label { display: inline-flex; gap: 6px; align-items: center; white-space: nowrap; }
  .search { min-width: 140px; flex: 1; }
  .count { font-size: 0.9em; }
  .error { color: var(--tfm-error); font-size: 0.9em; }
  .board { display: flex; gap: 10px; flex: 1; min-height: 0; overflow-x: auto; }
  .board.tabs-mode { overflow-x: hidden; }
  .column { flex: 0 0 240px; display: flex; flex-direction: column; background: var(--tfm-panel); border: 1px solid var(--tfm-border); border-radius: var(--tfm-radius); min-height: 0; }
  .tabs-mode .column { flex: 1; }
  .column.over { border-color: var(--tfm-accent); box-shadow: inset 0 0 0 1px var(--tfm-accent); }
  .column.readonly { opacity: 0.9; }
  h3 { margin: 0; padding: 8px 10px; font-size: 0.95em; border-bottom: 1px solid var(--tfm-border); }
  .n { font-weight: normal; opacity: 0.65; margin-left: 4px; font-size: 0.85em; }
  .cards { display: flex; flex-direction: column; gap: 6px; padding: 8px; overflow-y: auto; flex: 1; }
  .empty { text-align: center; padding: 16px 0; font-style: italic; }
  .tabs { display: flex; flex-wrap: wrap; gap: 4px; }
  .tabs button { background: var(--tfm-panel); color: inherit; border: 1px solid var(--tfm-border); border-radius: 12px; padding: 2px 10px; cursor: pointer; }
  .tabs button.active { border-color: var(--tfm-accent); background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
</style>
