<script lang="ts">
  import { dayjs } from '../../../core/dates/dayjs';
  import { parseNaturalDate } from '../../../core/dates/DateParser';
  import { t } from '../l10n';
  import { relativeLabel } from '../format';

  let {
    value = $bindable<string | null>(null),
    today,
    label,
    accesskey = undefined as string | undefined,
    id,
  }: { value: string | null; today: string; label: string; accesskey?: string; id: string } = $props();

  // The text the user types; the bound `value` is the resolved ISO date (or null).
  let text = $state(value ?? '');
  let touched = $state(false);
  const parsed = $derived.by(() => {
    const s = text.trim();
    if (!s) return null;
    const d = parseNaturalDate(s, dayjs(today));
    return d ? d.format('YYYY-MM-DD') : undefined; // undefined = unrecognised
  });
  $effect(() => {
    if (!touched) return;
    value = parsed ?? null;
  });
  // Keep the text in sync when the value changes from outside (task loaded).
  $effect(() => {
    if (!touched) text = value ?? '';
  });
</script>

<div class="date-input">
  <input
    {id}
    class="tfm-input"
    type="text"
    {accesskey}
    aria-label={label}
    placeholder={t('e.g. 2026-09-25, tomorrow, next fri, in 3 days')}
    bind:value={text}
    oninput={() => (touched = true)}
  />
  <input
    class="picker"
    type="date"
    aria-label={t('{0} picker', label)}
    value={parsed ?? ''}
    onchange={(e) => { touched = true; text = (e.currentTarget as HTMLInputElement).value; }}
  />
  <span class="hint" class:bad={parsed === undefined}>
    {#if parsed}→ {parsed} ({dayjs(parsed).format('ddd')}) · {relativeLabel(parsed, today)}{:else if parsed === undefined}⚠ {t('not a recognised date')}{/if}
  </span>
</div>

<style>
  .date-input { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .date-input input.tfm-input { width: 12em; }
  .picker { width: 1.6em; height: 1.9em; padding: 0; border: 1px solid var(--tfm-input-border); background: var(--tfm-input-bg); color: var(--tfm-input-fg); border-radius: 3px; cursor: pointer; }
  .hint { font-size: 0.9em; color: var(--tfm-ok); }
  .hint.bad { color: var(--tfm-warn); }
</style>
