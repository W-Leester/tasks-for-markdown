<script lang="ts">
  import { onMount } from 'svelte';
  import { serializeTask } from '../../core/task/TaskSerializer';
  import { Task } from '../../core/task/Task';
  import { Status } from '../../core/task/Status';
  import { StatusType } from '../../core/task/StatusType';
  import { DateField } from '../../core/task/DateField';
  import type { Priority } from '../../core/task/Priority';
  import DateInput from '../shared/components/DateInput.svelte';
  import { PRIORITY_EMOJI, PRIORITY_LABELS } from '../shared/format';
  import { setBundle, t } from '../l10n-bridge';
  import type { InitState, TaskDto, TaskFieldName } from '../shared/protocol';
  import { nextRequestId, onMessage, post } from '../shared/vscode.svelte';

  let init: InitState | null = $state(null);
  let target: { key: string | null; line: number | null } = $state({ key: null, line: null });
  let original: TaskDto | null = $state(null);
  let candidates: TaskDto[] = $state([]);
  let dependants: TaskDto[] = $state([]);
  let loading = $state(true);

  // Form model
  let description = $state('');
  let priority = $state('3');
  let recurrence = $state('');
  let recurrenceValid: boolean | null = $state(null);
  let recurrenceCanonical: string | null = $state(null);
  let start: string | null = $state(null);
  let scheduled: string | null = $state(null);
  let due: string | null = $state(null);
  let created: string | null = $state(null);
  let done: string | null = $state(null);
  let cancelled: string | null = $state(null);
  let statusSymbol = $state(' ');
  let dependsOn: string[] = $state([]); // ids or "@key#line" refs for tasks without ids
  let onCompletion = $state('');
  let depSearch = $state('');
  let showOtherDates = $state(false);
  let error = $state('');
  let recurrenceRequest = 0;

  const isEdit = $derived(original !== null);
  const hidden = (f: string) => init?.editModal.hiddenFields.includes(f) ?? false;
  const ak = (k: string) => (init?.editModal.accessKeys ? k : undefined);

  function load() {
    loading = true;
    post({ type: 'task/load', requestId: nextRequestId(), key: target.key, line: target.line });
  }

  function fill(task: TaskDto | null) {
    original = task;
    description = task?.description ?? '';
    priority = task?.priority ?? '3';
    recurrence = task?.recurrence ?? '';
    start = task?.start ?? null;
    scheduled = task?.scheduled ?? null;
    due = task?.due ?? null;
    created = task?.created ?? null;
    done = task?.done ?? null;
    cancelled = task?.cancelled ?? null;
    statusSymbol = task?.status.symbol ?? (init?.statuses.find((s) => s.type === 'TODO')?.symbol ?? ' ');
    dependsOn = task?.dependsOn ? [...task.dependsOn] : [];
    onCompletion = task?.onCompletion ?? '';
    showOtherDates = !!(task?.created || task?.done || task?.cancelled);
    if (!task && init?.globalFilter && !description.includes(init.globalFilter)) description = `${init.globalFilter} `;
    validateRecurrence();
    loading = false;
    queueMicrotask(() => document.getElementById('f-description')?.focus());
  }

  function validateRecurrence() {
    const text = recurrence.trim();
    if (!text) { recurrenceValid = null; recurrenceCanonical = null; return; }
    recurrenceRequest = nextRequestId();
    post({ type: 'recurrence/validate', requestId: recurrenceRequest, text });
  }

  const presets = ['every day', 'every weekday', 'every week', 'every 2 weeks', 'every month', 'every year'];
  const whenDone = $derived(/\bwhen done$/i.test(recurrence));
  function toggleWhenDone() {
    recurrence = whenDone ? recurrence.replace(/\s*when done$/i, '') : `${recurrence.trim()} when done`.trim();
    validateRecurrence();
  }

  const statuses = $derived(init?.statuses ?? []);
  const status = $derived(statuses.find((s) => s.symbol === statusSymbol));

  // Dependency helpers: a candidate is referenced by its id, or by "@key#line" when it has none.
  const refOf = (c: TaskDto) => c.id ?? `@${c.key}#${c.line}`;
  const filteredCandidates = $derived.by(() => {
    const q = depSearch.trim().toLowerCase();
    const list = q ? candidates.filter((c) => c.description.toLowerCase().includes(q) || c.path.toLowerCase().includes(q)) : [];
    return list.filter((c) => !dependsOn.includes(refOf(c))).slice(0, 12);
  });
  const selectedDeps = $derived(dependsOn.map((ref) => ({ ref, task: candidates.find((c) => refOf(c) === ref) ?? null })));

  const previewLine = $derived.by(() => {
    if (!init) return '';
    const st = status ? new Status({ symbol: status.symbol, name: status.name, nextSymbol: status.nextSymbol, type: status.type as StatusType }) : Status.unknown(statusSymbol);
    const task = Task.blank(description.trim(), st).with({
      priority: priority as Priority,
      recurrenceText: recurrence.trim() || null,
      onCompletion: onCompletion || null,
      id: original?.id ?? null,
      dependsOn: dependsOn.map((d) => (d.startsWith('@') ? '…' : d)),
      start: start ? DateField.parse(start) : null,
      scheduled: scheduled ? DateField.parse(scheduled) : null,
      due: due ? DateField.parse(due) : null,
      created: created ? DateField.parse(created) : null,
      done: done ? DateField.parse(done) : null,
      cancelled: cancelled ? DateField.parse(cancelled) : null,
    });
    return serializeTask(task, init.taskFormat);
  });

  function apply() {
    error = '';
    if (recurrence.trim() && recurrenceValid === false) { error = t('The recurrence rule is not valid.'); return; }
    if (recurrence.trim() && !due && !scheduled && !start) { error = t('A recurring task needs a due, scheduled or start date.'); return; }
    const fields: Partial<Record<TaskFieldName, string | string[] | null>> = {
      description: description.trim(), priority, recurrence: recurrence.trim() || null, onCompletion: onCompletion || null,
      start, scheduled, due, created, done, cancelled, dependsOn, status: statusSymbol,
    };
    if (original) post({ type: 'task/setFields', key: original.key, line: original.line, fields });
    else post({ type: 'task/create', key: target.key, line: target.line, fields });
    post({ type: 'ui/close' });
  }
  function cancel() { post({ type: 'ui/close' }); }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
    else if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement && e.shiftKey) && !(e.target instanceof HTMLButtonElement)) {
      if (e.target instanceof HTMLTextAreaElement && !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault(); apply();
    }
  }

  onMount(() => {
    const off = onMessage((m) => {
      if (m.type === 'state/init') { init = m.state; setBundle(m.state.l10n); const et = m.state.uiState['editTarget'] as { key: string | null; line: number | null } | undefined; if (et) target = et; load(); }
      else if (m.type === 'state/patch') { init = { ...(init as InitState), ...m.state }; }
      else if (m.type === 'edit/target') { target = { key: m.key, line: m.line }; load(); }
      else if (m.type === 'task/loaded') { candidates = m.candidates; dependants = m.dependants; fill(m.task); }
      else if (m.type === 'recurrence/validated') { if (m.requestId === recurrenceRequest) { recurrenceValid = m.valid; recurrenceCanonical = m.canonical; } }
      else if (m.type === 'error') { error = m.message; }
    });
    post({ type: 'ui/ready' });
    return off;
  });
</script>

<svelte:window onkeydown={onKey} />

<main class="modal" aria-busy={loading}>
  <header>
    <h2>{isEdit ? t('Edit task') : t('New task')}</h2>
    {#if original}<span class="tfm-muted">{original.path}:{original.line + 1}</span>{/if}
  </header>

  {#if init && !loading}
    <div class="grid">
      <label for="f-description">{t('Description')} <kbd>D</kbd></label>
      <textarea id="f-description" class="tfm-input" rows="2" accesskey={ak('d')} bind:value={description}></textarea>

      {#if !hidden('priority')}
        <span class="lbl">{t('Priority')} <kbd>P</kbd></span>
        <div class="radios" role="radiogroup" aria-label={t('Priority')}>
          {#each ['0', '1', '2', '3', '4', '5'] as p, i (p)}
            <label class="radio"><input type="radio" name="priority" value={p} bind:group={priority} accesskey={i === 0 ? ak('p') : undefined} /> {PRIORITY_EMOJI[p]} {t(PRIORITY_LABELS[p]!)}</label>
          {/each}
        </div>
      {/if}

      {#if !hidden('recurrence')}
        <label for="f-recurrence">{t('Repeat')} <kbd>R</kbd></label>
        <div>
          <input id="f-recurrence" class="tfm-input wide" type="text" accesskey={ak('r')} placeholder="every week on monday" bind:value={recurrence} oninput={validateRecurrence} />
          <span class="hint" class:bad={recurrenceValid === false}>
            {#if recurrence.trim()}{#if recurrenceValid}✓ {recurrenceCanonical}{:else if recurrenceValid === false}⚠ {t('not a recognised rule')}{/if}{/if}
          </span>
          <div class="presets">
            {#each presets as p (p)}<button type="button" class="chip" onclick={() => { recurrence = whenDone ? `${p} when done` : p; validateRecurrence(); }}>{p}</button>{/each}
            <label class="radio"><input type="checkbox" checked={whenDone} onchange={toggleWhenDone} disabled={!recurrence.trim()} /> when done</label>
          </div>
        </div>
      {/if}

      {#if !hidden('start')}<label for="f-start">{t('Start')} <kbd>S</kbd></label><DateInput id="f-start" bind:value={start} today={init.today} label={t('Start')} accesskey={ak('s')} />{/if}
      {#if !hidden('scheduled')}<label for="f-scheduled">{t('Scheduled')} <kbd>C</kbd></label><DateInput id="f-scheduled" bind:value={scheduled} today={init.today} label={t('Scheduled')} accesskey={ak('c')} />{/if}
      {#if !hidden('due')}<label for="f-due">{t('Due')} <kbd>U</kbd></label><DateInput id="f-due" bind:value={due} today={init.today} label={t('Due')} accesskey={ak('u')} />{/if}

      {#if !hidden('otherDates')}
        <button type="button" class="link" onclick={() => (showOtherDates = !showOtherDates)}>{showOtherDates ? '▾' : '▸'} {t('Created / done / cancelled dates')}</button>
        <span></span>
        {#if showOtherDates}
          <label for="f-created">{t('Created')}</label><DateInput id="f-created" bind:value={created} today={init.today} label={t('Created')} />
          <label for="f-done">{t('Done')}</label><DateInput id="f-done" bind:value={done} today={init.today} label={t('Done')} />
          <label for="f-cancelled">{t('Cancelled')}</label><DateInput id="f-cancelled" bind:value={cancelled} today={init.today} label={t('Cancelled')} />
        {/if}
      {/if}

      {#if !hidden('status')}
        <label for="f-status">{t('Status')} <kbd>T</kbd></label>
        <select id="f-status" class="tfm-input" accesskey={ak('t')} bind:value={statusSymbol}>
          {#each statuses as s (s.symbol)}<option value={s.symbol}>[{s.symbol}] {s.name} · {s.type}</option>{/each}
          {#if !status}<option value={statusSymbol}>[{statusSymbol}] ?</option>{/if}
        </select>
      {/if}

      {#if !hidden('dependencies')}
        <span class="lbl">{t('Depends on')}</span>
        <div class="deps">
          <div class="chips">
            {#each selectedDeps as { ref, task } (ref)}
              <span class="tfm-chip">{task ? task.description.slice(0, 40) : ref} {#if task?.id}<span class="tfm-muted">({task.id})</span>{/if}
                <button type="button" class="x" aria-label={t('Remove')} onclick={() => (dependsOn = dependsOn.filter((d) => d !== ref))}>×</button></span>
            {/each}
          </div>
          <input class="tfm-input wide" type="text" placeholder={t('Search tasks that must finish first…')} bind:value={depSearch} />
          {#if filteredCandidates.length}
            <ul class="results" role="listbox">
              {#each filteredCandidates as c (c.key + c.line)}
                <li><button type="button" onclick={() => { dependsOn = [...dependsOn, refOf(c)]; depSearch = ''; }}>{c.description || '(empty)'} <span class="tfm-muted">{c.path}:{c.line + 1}{c.id ? ` · 🆔 ${c.id}` : ` · ${t('(an id will be generated)')}`}</span></button></li>
              {/each}
            </ul>
          {/if}
          {#if dependants.length}
            <div class="tfm-muted small">{t('Blocks')}: {dependants.map((d) => d.description.slice(0, 30)).join(', ')}</div>
          {/if}
        </div>
      {/if}

      {#if !hidden('onCompletion')}
        <span class="lbl">{t('On completion')}</span>
        <div class="radios">
          <label class="radio"><input type="radio" name="oc" value="" bind:group={onCompletion} /> {t('Keep')}</label>
          <label class="radio"><input type="radio" name="oc" value="delete" bind:group={onCompletion} /> {t('Delete')}</label>
        </div>
      {/if}
    </div>

    <footer>
      <div class="preview"><span class="tfm-muted">{t('Preview')}</span><code>{previewLine}</code></div>
      {#if error}<div class="error" role="alert">{error}</div>{/if}
      <div class="actions">
        <button type="button" class="tfm-btn secondary" onclick={cancel}>{t('Cancel')} <kbd>Esc</kbd></button>
        <button type="button" class="tfm-btn" onclick={apply}>{t('Apply')} <kbd>⏎</kbd></button>
      </div>
    </footer>
  {:else}
    <p class="tfm-muted">{t('Loading…')}</p>
  {/if}
</main>

<style>
  .modal { max-width: 760px; margin: 0 auto; padding: 12px 16px 20px; }
  header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 10px; }
  h2 { margin: 0; font-size: 1.15em; }
  .grid { display: grid; grid-template-columns: max-content 1fr; gap: 10px 14px; align-items: start; }
  label, .lbl { padding-top: 5px; white-space: nowrap; }
  kbd { font-size: 0.75em; opacity: 0.55; border: 1px solid var(--tfm-border); border-radius: 3px; padding: 0 3px; margin-left: 2px; }
  textarea.tfm-input, .wide { width: 100%; box-sizing: border-box; resize: vertical; }
  .radios { display: flex; flex-wrap: wrap; gap: 4px 14px; padding-top: 4px; }
  .radio { display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
  .hint { display: block; font-size: 0.9em; color: var(--tfm-ok); min-height: 1.2em; }
  .hint.bad { color: var(--tfm-warn); }
  .presets { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 4px; }
  .chip { background: var(--tfm-badge-bg); color: var(--tfm-badge-fg); border: none; border-radius: 1em; padding: 1px 10px; cursor: pointer; font-size: 0.9em; }
  .link { background: none; border: none; color: var(--tfm-link); cursor: pointer; padding: 4px 0; text-align: left; }
  .deps .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
  .deps .x { background: none; border: none; cursor: pointer; padding: 0 2px; color: inherit; }
  .results { list-style: none; margin: 4px 0 0; padding: 0; border: 1px solid var(--tfm-border); border-radius: 4px; max-height: 180px; overflow: auto; }
  .results button { display: block; width: 100%; text-align: left; background: none; border: none; padding: 4px 8px; cursor: pointer; color: inherit; }
  .results button:hover { background: var(--vscode-list-hoverBackground); }
  .small { font-size: 0.85em; margin-top: 4px; }
  footer { margin-top: 14px; border-top: 1px solid var(--tfm-border); padding-top: 10px; }
  .preview { display: flex; gap: 10px; align-items: baseline; font-size: 0.9em; }
  .preview code { background: var(--vscode-textCodeBlock-background); padding: 2px 6px; border-radius: 3px; word-break: break-all; }
  .error { color: var(--tfm-error); margin-top: 6px; }
  .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
</style>
