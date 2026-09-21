<script lang="ts">
  import { onMount } from 'svelte';
  import { setBundle, t } from '../shared/l10n';
  import type { InitState } from '../shared/protocol';
  import { nextRequestId, onMessage, post } from '../shared/vscode';
  import { DATE_FIELDS, DATE_OPS, FLAGS, GROUP_FIELDS, LAYOUTS, PRIORITIES, SORT_FIELDS, type Row, rowsToText, textToRows } from './rows';

  let init: InitState | null = $state(null);
  let rows: Row[] = $state([{ kind: 'status', value: 'not done' }]);
  let text = $state('not done');
  let mode: 'builder' | 'text' = $state('builder');
  let name = $state('');
  let targetId: string | null = $state(null);
  let destination: 'file' | 'settings' = $state('file');
  let explain = $state('');
  let errors: string[] = $state([]);
  let matched = $state(0);
  let request = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const filterRows = $derived(rows.filter((r) => !['sort', 'group', 'limit', 'layout'].includes(r.kind)));
  const otherRows = $derived(rows.filter((r) => ['sort', 'group', 'limit', 'layout'].includes(r.kind)));

  function syncFromRows() { text = rowsToText(rows); scheduleExplain(); }
  function syncFromText() { rows = textToRows(text); scheduleExplain(); }
  function scheduleExplain() {
    clearTimeout(timer);
    timer = setTimeout(() => { request = nextRequestId(); post({ type: 'query/explain', requestId: request, query: text }); }, 250);
  }
  function add(row: Row) { rows = [...rows, row]; syncFromRows(); }
  function remove(row: Row) { rows = rows.filter((r) => r !== row); syncFromRows(); }
  function update() { syncFromRows(); }

  function loadTarget(id: string | null) {
    targetId = id;
    const q = id ? init?.savedQueries.find((s) => s.id === id) : undefined;
    if (q) { name = q.name; text = q.query; destination = q.source; syncFromText(); }
    else scheduleExplain();
  }

  function save() {
    if (!name.trim()) { post({ type: 'ui/notify', level: 'warn', message: t('Give the query a name first.') }); return; }
    post({ type: 'query/save', id: targetId, name: name.trim(), query: text, destination });
  }

  onMount(() => {
    const off = onMessage((m) => {
      if (m.type === 'state/init') { init = m.state; setBundle(m.state.l10n); loadTarget((m.state.uiState['queryTarget'] as string | null) ?? null); }
      else if (m.type === 'state/patch') init = { ...(init as InitState), ...m.state };
      else if (m.type === 'query/target') loadTarget(m.id);
      else if (m.type === 'query/explained' && m.requestId === request) { explain = m.explain; errors = m.errors; matched = m.matched; }
      else if (m.type === 'index/changed') scheduleExplain();
    });
    post({ type: 'ui/ready' });
    return off;
  });
</script>

<main>
  <header>
    <input class="tfm-input name" type="text" placeholder={t('Query name')} bind:value={name} />
    <label>{t('Save to')} <select class="tfm-input" bind:value={destination} disabled={targetId !== null}>
      <option value="file">.tasks/queries/*.md</option><option value="settings">settings.json</option></select></label>
    <button class="tfm-btn" onclick={save}>{targetId ? t('Update') : t('Save')}</button>
    <button class="tfm-btn secondary" onclick={() => post({ type: 'query/insert', query: text })}>{t('Insert into note')}</button>
    <span class="spacer"></span>
    <div class="modes" role="tablist">
      <button role="tab" aria-selected={mode === 'builder'} class:active={mode === 'builder'} onclick={() => (mode = 'builder')}>{t('Builder')}</button>
      <button role="tab" aria-selected={mode === 'text'} class:active={mode === 'text'} onclick={() => (mode = 'text')}>{t('Text')}</button>
    </div>
  </header>

  <div class="body">
    {#if mode === 'builder'}
      <section class="rows">
        <h3>{t('Filters')} <span class="tfm-muted">({t('all must match')})</span></h3>
        {#each filterRows as row (row)}
          <div class="row">
            {#if row.kind === 'status'}
              <span class="k">{t('Status')}</span>
              <select class="tfm-input" bind:value={row.value} onchange={update}>
                <option value="not done">not done</option><option value="done">done</option>
                {#each ['TODO', 'IN_PROGRESS', 'ON_HOLD', 'DONE', 'CANCELLED'] as v (v)}<option value={v}>status.type is {v}</option>{/each}
              </select>
            {:else if row.kind === 'date'}
              <select class="tfm-input" bind:value={row.field} onchange={update}>{#each DATE_FIELDS as f (f)}<option value={f}>{f}</option>{/each}</select>
              <select class="tfm-input" bind:value={row.op} onchange={update}>{#each DATE_OPS as o (o)}<option value={o}>{o}</option>{/each}</select>
              <input class="tfm-input" type="text" placeholder="today · next week · 2026-09-25 · this month" bind:value={row.value} oninput={update} />
            {:else if row.kind === 'hasDate'}
              <select class="tfm-input" bind:value={row.has} onchange={update}><option value={true}>has</option><option value={false}>no</option></select>
              <select class="tfm-input" bind:value={row.field} onchange={update}>{#each DATE_FIELDS as f (f)}<option value={f}>{f} date</option>{/each}</select>
            {:else if row.kind === 'priority'}
              <span class="k">priority</span>
              <select class="tfm-input" bind:value={row.op} onchange={update}>{#each ['is', 'is above', 'is below', 'is not'] as o (o)}<option value={o}>{o}</option>{/each}</select>
              <select class="tfm-input" bind:value={row.value} onchange={update}>{#each PRIORITIES as p (p)}<option value={p}>{p}</option>{/each}</select>
            {:else if row.kind === 'tags'}
              <span class="k">tags</span>
              <select class="tfm-input" bind:value={row.include} onchange={update}><option value={true}>include</option><option value={false}>do not include</option></select>
              <input class="tfm-input" type="text" placeholder="#work" bind:value={row.value} oninput={update} />
            {:else if row.kind === 'text'}
              <select class="tfm-input" bind:value={row.field} onchange={update}>{#each ['description', 'heading', 'path', 'folder', 'filename'] as f (f)}<option value={f}>{f}</option>{/each}</select>
              <select class="tfm-input" bind:value={row.op} onchange={update}>{#each ['includes', 'does not include', 'regex matches', 'regex does not match'] as o (o)}<option value={o}>{o}</option>{/each}</select>
              <input class="tfm-input" type="text" bind:value={row.value} oninput={update} />
            {:else if row.kind === 'flag'}
              <select class="tfm-input" bind:value={row.value} onchange={update}>{#each FLAGS as f (f)}<option value={f}>{f}</option>{/each}</select>
            {:else if row.kind === 'raw'}
              <span class="k tfm-muted">{t('raw')}</span><input class="tfm-input grow" type="text" bind:value={row.value} oninput={update} />
            {/if}
            <button class="x" title={t('Remove')} onclick={() => remove(row)}>×</button>
          </div>
        {/each}
        <div class="adders">
          <span class="tfm-muted">{t('Add filter')}:</span>
          <button class="chip" onclick={() => add({ kind: 'status', value: 'not done' })}>status</button>
          <button class="chip" onclick={() => add({ kind: 'date', field: 'due', op: 'before', value: 'next week' })}>date</button>
          <button class="chip" onclick={() => add({ kind: 'hasDate', field: 'due', has: true })}>has date</button>
          <button class="chip" onclick={() => add({ kind: 'priority', op: 'is above', value: 'none' })}>priority</button>
          <button class="chip" onclick={() => add({ kind: 'tags', include: true, value: '#' })}>tags</button>
          <button class="chip" onclick={() => add({ kind: 'text', field: 'description', op: 'includes', value: '' })}>text</button>
          <button class="chip" onclick={() => add({ kind: 'flag', value: 'is recurring' })}>flag</button>
          <button class="chip" onclick={() => add({ kind: 'raw', value: '(done) OR (priority is high)' })}>raw / boolean</button>
        </div>

        <h3>{t('Sort, group, layout')}</h3>
        {#each otherRows as row (row)}
          <div class="row">
            {#if row.kind === 'sort' || row.kind === 'group'}
              <span class="k">{row.kind === 'sort' ? 'sort by' : 'group by'}</span>
              <select class="tfm-input" bind:value={row.field} onchange={update}>{#each row.kind === 'sort' ? SORT_FIELDS : GROUP_FIELDS as f (f)}<option value={f}>{f}</option>{/each}</select>
              <label class="inline"><input type="checkbox" bind:checked={row.reverse} onchange={update} /> reverse</label>
            {:else if row.kind === 'limit'}
              <span class="k">limit</span><input class="tfm-input num" type="number" min="1" bind:value={row.value} oninput={update} />
            {:else if row.kind === 'layout'}
              <select class="tfm-input" bind:value={row.value} onchange={update}>{#each LAYOUTS as l (l)}<option value={l}>{l}</option>{/each}</select>
            {/if}
            <button class="x" title={t('Remove')} onclick={() => remove(row)}>×</button>
          </div>
        {/each}
        <div class="adders">
          <span class="tfm-muted">{t('Add')}:</span>
          <button class="chip" onclick={() => add({ kind: 'sort', field: 'urgency', reverse: false })}>sort by</button>
          <button class="chip" onclick={() => add({ kind: 'group', field: 'filename', reverse: false })}>group by</button>
          <button class="chip" onclick={() => add({ kind: 'limit', value: 50 })}>limit</button>
          <button class="chip" onclick={() => add({ kind: 'layout', value: 'short mode' })}>layout</button>
        </div>
      </section>
    {:else}
      <textarea class="tfm-input editor" spellcheck="false" bind:value={text} oninput={syncFromText}></textarea>
    {/if}

    <aside>
      <div class="status" class:bad={errors.length > 0}>
        {#if errors.length}{errors.join(' · ')}{:else}{t('{0} tasks match', matched)}{/if}
      </div>
      <pre class="query">{text}</pre>
      <h4>{t('Explanation')}</h4>
      <pre class="explain">{explain}</pre>
    </aside>
  </div>
</main>

<style>
  main { padding: 10px 12px; display: flex; flex-direction: column; gap: 10px; height: 100vh; box-sizing: border-box; }
  header { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .name { min-width: 180px; }
  .spacer { flex: 1; }
  .modes button { background: var(--tfm-panel); color: inherit; border: 1px solid var(--tfm-border); padding: 3px 10px; cursor: pointer; }
  .modes button:first-child { border-radius: 4px 0 0 4px; } .modes button:last-child { border-radius: 0 4px 4px 0; }
  .modes button.active { background: var(--vscode-list-activeSelectionBackground); color: var(--vscode-list-activeSelectionForeground); }
  .body { display: grid; grid-template-columns: minmax(0, 3fr) minmax(220px, 2fr); gap: 14px; flex: 1; min-height: 0; }
  @media (max-width: 700px) { .body { grid-template-columns: 1fr; } }
  .rows { overflow: auto; }
  h3 { font-size: 0.95em; margin: 8px 0 6px; } h4 { font-size: 0.9em; margin: 8px 0 4px; }
  .row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 4px 6px; border: 1px solid var(--tfm-border); border-radius: 4px; margin-bottom: 6px; }
  .k { font-family: var(--vscode-editor-font-family); font-size: 0.9em; }
  .grow { flex: 1; min-width: 120px; } .num { width: 5em; }
  .inline { display: inline-flex; gap: 4px; align-items: center; }
  .x { margin-left: auto; background: none; border: none; cursor: pointer; color: var(--tfm-muted); font-size: 1.1em; }
  .adders { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 4px 0 10px; }
  .chip { background: var(--tfm-badge-bg); color: var(--tfm-badge-fg); border: none; border-radius: 1em; padding: 1px 10px; cursor: pointer; font-size: 0.9em; }
  .editor { width: 100%; height: 100%; min-height: 200px; box-sizing: border-box; font-family: var(--vscode-editor-font-family); resize: none; }
  aside { overflow: auto; min-width: 0; }
  .status { padding: 4px 8px; border-radius: 4px; background: var(--tfm-panel); border: 1px solid var(--tfm-border); }
  .status.bad { color: var(--tfm-error); }
  pre { font-family: var(--vscode-editor-font-family); font-size: 0.9em; white-space: pre-wrap; background: var(--vscode-textCodeBlock-background); padding: 6px 8px; border-radius: 4px; margin: 6px 0; }
</style>
