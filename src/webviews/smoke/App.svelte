<script lang="ts">
  import { onMount } from 'svelte';
  import { t, setBundle } from '../shared/l10n';
  import type { InitState, TaskDto } from '../shared/protocol';
  import { nextRequestId, onMessage, post } from '../shared/vscode';

  let state: InitState | null = $state(null);
  let tasks: TaskDto[] = $state([]);
  let matched = $state(0);

  function run() {
    post({ type: 'query/run', requestId: nextRequestId(), query: 'not done\nlimit 5' });
  }

  onMount(() => {
    const off = onMessage((m) => {
      if (m.type === 'state/init') { state = m.state; setBundle(m.state.l10n); run(); }
      else if (m.type === 'query/result') { tasks = m.tasks; matched = m.matched; }
      else if (m.type === 'index/changed') run();
    });
    post({ type: 'ui/ready' });
    return off;
  });
</script>

<main>
  {#if state}
    <p class="tfm-muted">{t('Today')}: {state.today} · {t('Open')}: {matched}</p>
    <ul>
      {#each tasks as task (task.key + task.line)}
        <li>
          <input type="checkbox" checked={task.isCompleted} onchange={() => post({ type: 'task/toggle', key: task.key, line: task.line })} />
          <span>{task.description}</span>
          {#if task.due}<span class="tfm-chip">📅 {task.due}</span>{/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p>…</p>
  {/if}
</main>

<style>
  main { padding: 8px 12px; }
  li { list-style: none; padding: 2px 0; }
</style>
