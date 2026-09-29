<script lang="ts">
  import { PRIORITY_EMOJI, relativeLabel, shortDate } from '../format';
  import type { TaskDto } from '../protocol';
  import { post } from '../vscode.svelte';

  let { task, today, draggable = true, showFile = true }: { task: TaskDto; today: string; draggable?: boolean; showFile?: boolean } = $props();
  const overdue = $derived(!task.isCompleted && !!task.due && task.due < today);
  const isToday = $derived(!task.isCompleted && task.due === today);
  const parts = $derived(task.description.split(/(\s#[^\s#]+)/g));

  function onDragStart(e: DragEvent) {
    e.dataTransfer?.setData('application/x-tfm-task', JSON.stringify({ key: task.key, line: task.line }));
    e.dataTransfer!.effectAllowed = 'move';
  }
</script>

<div
  class="card"
  class:done={task.isCompleted}
  class:cancelled={task.status.type === 'CANCELLED'}
  class:overdue
  role="button"
  tabindex="0"
  data-key={task.key}
  data-line={task.line}
  aria-label={`${task.description}${task.due ? `, ${shortDate(task.due)}` : ''}`}
  {draggable}
  ondragstart={onDragStart}
  onclick={() => post({ type: 'task/edit', key: task.key, line: task.line })}
  ondblclick={(e) => { e.preventDefault(); post({ type: 'task/open', key: task.key, line: task.line }); }}
  onkeydown={(e) => { if (e.key === 'Enter') post({ type: 'task/edit', key: task.key, line: task.line }); if (e.key === ' ') { e.preventDefault(); post({ type: 'task/toggle', key: task.key, line: task.line }); } }}
  title={`${task.path}:${task.line + 1}`}
>
  <div class="row">
    <input type="checkbox" checked={task.isCompleted} onclick={(e) => { e.stopPropagation(); post({ type: 'task/toggle', key: task.key, line: task.line }); }} aria-label="toggle" />
    <span class="desc">{#each parts as part, i (i)}{#if part.trim().startsWith('#')}<span class="tag">{part}</span>{:else}{part}{/if}{/each}</span>
  </div>
  <div class="chips">
    {#if task.priority !== '3'}<span class="tfm-chip pri-{task.priority}">{PRIORITY_EMOJI[task.priority]} {task.priorityName}</span>{/if}
    {#if task.due}<span class="tfm-chip" class:overdue class:today={isToday}>📅 {shortDate(task.due)} · {relativeLabel(task.due, today)}</span>
    {:else if task.scheduled}<span class="tfm-chip">⏳ {shortDate(task.scheduled)}</span>{/if}
    {#if task.recurrence}<span class="tfm-chip" title={task.recurrence}>🔁</span>{/if}
    {#if task.isBlocked}<span class="tfm-chip today">⛔</span>{/if}
    {#if task.notes?.length}<span class="tfm-chip" title={task.notes.map((n) => n.text).join('\n')}>💬 {task.notes.length}</span>{/if}
    {#if showFile}<span class="tfm-chip file">{task.path.split('/').pop()?.replace(/\.md$/, '')}</span>{/if}
  </div>
</div>

<style>
  .card { background: var(--tfm-bg); border: 1px solid var(--tfm-border); border-radius: var(--tfm-radius); padding: 6px 8px; cursor: grab; user-select: none; }
  .card:hover { border-color: var(--tfm-accent); }
  .card.done .desc { color: var(--tfm-muted); }
  .card.cancelled .desc { text-decoration: line-through; }
  .card.overdue { border-left: 3px solid var(--tfm-error); }
  .row { display: flex; gap: 6px; align-items: flex-start; }
  .row input { margin: 3px 0 0; }
  .desc { flex: 1; line-height: 1.35; word-break: break-word; }
  .tag { color: var(--tfm-link); }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
  .file { opacity: 0.7; }
</style>
