<script lang="ts">
  import { onMount } from 'svelte';
  import TaskCard from '../shared/components/TaskCard.svelte';
  import { setBundle, t } from '../shared/l10n';
  import type { GroupDto, InitState, QueryTargetDto, TaskDto } from '../shared/protocol';
  import { nextRequestId, onMessage, post } from '../shared/vscode.svelte';

  /**
   * Live results of one ```tasks block — the stand-in for the rendered preview in editors whose
   * preview cannot run our markdown-it plugin (Cursor's WYSIWYG mode). The host sends
   * `results/query` whenever the cursor enters another block (while "follow cursor" is on).
   */
  let init: InitState | null = $state(null);
  let query: QueryTargetDto | null = $state(null);
  let tasks: TaskDto[] = $state([]);
  let groups: GroupDto | null = $state(null);
  let matched = $state(0);
  let errors: string[] = $state([]);
  let follow = $state(true);
  let showQuery = $state(false);
  let request = 0;

  function run() {
    if (!query) return;
    request = nextRequestId();
    post({ type: 'query/run', requestId: request, query: query.text, source: query.source });
  }
  function saveUi() { post({ type: 'ui/state', state: { follow } }); }

  onMount(() => {
    const off = onMessage((m) => {
      if (m.type === 'state/init') {
        init = m.state; setBundle(m.state.l10n);
        const ui = m.state.uiState as { follow?: boolean; queryTarget?: QueryTargetDto };
        follow = ui.follow !== false;
        if (ui.queryTarget) { query = ui.queryTarget; run(); }
      } else if (m.type === 'state/patch') { init = { ...(init as InitState), ...m.state }; run(); }
      else if (m.type === 'results/query') { query = m.target; run(); }
      else if (m.type === 'query/result' && m.requestId === request) { tasks = m.tasks; groups = m.groups; matched = m.matched; errors = m.errors; }
      else if (m.type === 'index/changed') run();
    });
    post({ type: 'ui/ready' });
    return off;
  });
</script>

{#snippet group(node: GroupDto, depth: number)}
  {#if depth > 0}
    <h3 style:margin-left={`${(depth - 1) * 12}px`}>{node.name} <span class="n">{node.count}</span></h3>
  {/if}
  <div class="cards" style:margin-left={`${Math.max(0, depth - 1) * 12}px`}>
    {#each node.tasks as task (task.key + '#' + task.line)}
      <TaskCard {task} today={init?.today ?? ''} draggable={false} />
    {/each}
  </div>
  {#each node.children as child (child.name)}
    {@render group(child, depth + 1)}
  {/each}
{/snippet}

<main>
  <header>
    <div class="title">
      {#if query}
        <strong title={query.label}>{query.label}</strong>
        <span class="tfm-muted">{t('{0} tasks match', matched)}</span>
      {:else}
        <span class="tfm-muted">{t('Place the cursor inside a ```tasks block.')}</span>
      {/if}
    </div>
    <label class="follow"><input type="checkbox" bind:checked={follow} onchange={saveUi} /> {t('Follow cursor')}</label>
    <button class="tfm-btn secondary" onclick={() => (showQuery = !showQuery)} aria-pressed={showQuery}>{t('Query')}</button>
    <button class="tfm-btn secondary" onclick={run} title={t('Refresh')}>↻</button>
  </header>
  {#if showQuery && query}<pre class="query">{query.text.trimEnd()}</pre>{/if}
  {#if errors.length}<div class="error">{errors.join(' · ')}</div>{/if}

  {#if init && query}
    <div class="results">
      {#if groups}
        {@render group(groups, 0)}
      {:else}
        <div class="cards">
          {#each tasks as task (task.key + '#' + task.line)}
            <TaskCard {task} today={init.today} draggable={false} />
          {/each}
        </div>
      {/if}
      {#if !matched && !errors.length}<p class="tfm-muted">{t('No tasks match.')}</p>{/if}
    </div>
    <p class="tfm-muted small">{t('Click: edit · Double-click: open · Checkbox: toggle done')}</p>
  {/if}
</main>

<style>
  main { display: flex; flex-direction: column; height: 100vh; box-sizing: border-box; padding: 8px 10px; gap: 8px; }
  header { display: flex; flex-wrap: wrap; gap: 6px 12px; align-items: center; }
  .title { display: flex; gap: 8px; align-items: baseline; min-width: 0; flex: 1; }
  .title strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .follow { display: inline-flex; gap: 4px; align-items: center; white-space: nowrap; }
  .query { margin: 0; padding: 6px 8px; background: var(--tfm-panel); border: 1px solid var(--tfm-border); border-radius: 4px; font-size: 0.9em; white-space: pre-wrap; }
  .error { color: var(--tfm-error); font-size: 0.9em; }
  .results { flex: 1; min-height: 0; overflow: auto; }
  h3 { margin: 10px 0 4px; font-size: 0.95em; border-bottom: 1px solid var(--tfm-border); padding-bottom: 2px; }
  .n { font-weight: normal; opacity: 0.65; margin-left: 4px; font-size: 0.85em; }
  .cards { display: flex; flex-direction: column; gap: 4px; }
  .small { font-size: 0.85em; margin: 0; }
</style>
