<script lang="ts">
  import { onMount } from 'svelte';
  import { setBundle, t } from '../shared/l10n';
  import type { InitState, StatsDto } from '../shared/protocol';
  import { nextRequestId, onMessage, post } from '../shared/vscode';

  let init: InitState | null = $state(null);
  let stats: StatsDto | null = $state(null);
  let weeks = $state(12);
  let tag: string | null = $state(null);
  let folder: string | null = $state(null);
  let request = 0;

  function load() {
    request = nextRequestId();
    post({ type: 'stats/request', requestId: request, weeks, tag, folder });
    post({ type: 'ui/state', state: { weeks, tag, folder } });
  }

  // Chart geometry
  const W = 880, H = 240, PAD = { l: 36, r: 40, t: 12, b: 28 };
  const inner = $derived({ w: W - PAD.l - PAD.r, h: H - PAD.t - PAD.b });
  const maxBar = $derived(Math.max(5, ...(stats?.weeks.flatMap((w) => [w.completed, w.created, w.overdue]) ?? [0])));
  const maxLine = $derived(Math.max(1, ...(stats?.weeks.map((w) => w.remaining) ?? [0])));
  const slot = $derived(stats ? inner.w / stats.weeks.length : 0);
  const y = (v: number) => PAD.t + inner.h - (v / maxBar) * inner.h;
  const yLine = (v: number) => PAD.t + inner.h - (v / maxLine) * inner.h;
  const ticks = $derived([0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxBar * f)));
  const linePath = $derived(stats ? stats.weeks.map((w, i) => `${i ? 'L' : 'M'}${(PAD.l + slot * i + slot / 2).toFixed(1)} ${yLine(w.remaining).toFixed(1)}`).join(' ') : '');
  const current = $derived(stats?.weeks.at(-1));
  const previous = $derived(stats?.weeks.at(-2));

  onMount(() => {
    const off = onMessage((m) => {
      if (m.type === 'state/init') {
        init = m.state; setBundle(m.state.l10n);
        const ui = m.state.uiState as { weeks?: number; tag?: string | null; folder?: string | null };
        if (ui.weeks) weeks = ui.weeks; if (ui.tag !== undefined) tag = ui.tag; if (ui.folder !== undefined) folder = ui.folder;
        load();
      } else if (m.type === 'stats/result' && m.requestId === request) stats = m.stats;
      else if (m.type === 'index/changed') load();
    });
    post({ type: 'ui/ready' });
    return off;
  });
</script>

<main>
  <header>
    <h2>{t('Weekly statistics')}</h2>
    <label>{t('Weeks')} <select class="tfm-input" bind:value={weeks} onchange={load}>{#each [8, 12, 26, 52] as n (n)}<option value={n}>{n}</option>{/each}</select></label>
    <label>{t('Tag')} <select class="tfm-input" bind:value={tag} onchange={load}><option value={null}>{t('All')}</option>{#each stats?.tags ?? [] as x (x)}<option value={x}>{x}</option>{/each}</select></label>
    <label>{t('Folder')} <select class="tfm-input" bind:value={folder} onchange={load}><option value={null}>{t('All')}</option>{#each stats?.folders ?? [] as x (x)}<option value={x}>{x}</option>{/each}</select></label>
  </header>

  {#if stats && init}
    <div class="tiles">
      <div class="tile"><span class="lbl">{t('Completed this week')}</span><span class="val ok">{current?.completed ?? 0}</span><span class="sub">{current?.label} · {t('in progress')}</span></div>
      <div class="tile"><span class="lbl">{t('Created this week')}</span><span class="val">{current?.created ?? 0}</span><span class="sub">➕</span></div>
      <div class="tile"><span class="lbl">{t('Overdue now')}</span><span class="val err">{stats.weeks.reduce((s, w) => s + w.overdue, 0)}</span><span class="sub">{t('across shown weeks')}</span></div>
      <div class="tile"><span class="lbl">{t('Open tasks')}</span><span class="val">{stats.totalOpen}</span><span class="sub">{previous ? t('vs last week {0}', (current!.remaining - previous.remaining >= 0 ? '+' : '') + (current!.remaining - previous.remaining)) : ''}</span></div>
    </div>

    <svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label={t('Weekly statistics')}>
      {#each ticks as tick (tick)}
        <line x1={PAD.l} x2={W - PAD.r} y1={y(tick)} y2={y(tick)} class="grid" />
        <text x={PAD.l - 6} y={y(tick) + 4} class="axis" text-anchor="end">{tick}</text>
      {/each}
      {#each stats.weeks as w, i (w.start)}
        {@const x0 = PAD.l + slot * i}
        <g opacity={w.current ? 0.75 : 1}>
          <rect x={x0 + slot * 0.12} width={slot * 0.22} y={y(w.completed)} height={inner.h + PAD.t - y(w.completed)} class="bar completed" rx="2"><title>{w.label} {t('completed')}: {w.completed}</title></rect>
          <rect x={x0 + slot * 0.39} width={slot * 0.22} y={y(w.created)} height={inner.h + PAD.t - y(w.created)} class="bar created" rx="2"><title>{w.label} {t('created')}: {w.created}</title></rect>
          <rect x={x0 + slot * 0.66} width={slot * 0.22} y={y(w.overdue)} height={inner.h + PAD.t - y(w.overdue)} class="bar overdue" rx="2"><title>{w.label} {t('overdue')}: {w.overdue}</title></rect>
        </g>
        <text x={x0 + slot / 2} y={H - 8} class="axis" text-anchor="middle">{w.label}</text>
      {/each}
      <path d={linePath} class="line" />
      {#each stats.weeks as w, i (w.start + 'p')}
        <circle cx={PAD.l + slot * i + slot / 2} cy={yLine(w.remaining)} r="3" class="dot"><title>{w.label} {t('remaining')}: {w.remaining}</title></circle>
      {/each}
      <text x={W - PAD.r + 6} y={yLine(maxLine) + 4} class="axis line-axis">{maxLine}</text>
      <text x={W - PAD.r + 6} y={yLine(0) + 4} class="axis line-axis">0</text>
    </svg>
    <div class="legend">
      <span><i class="sw completed"></i>{t('Completed')}</span><span><i class="sw created"></i>{t('Created (➕)')}</span><span><i class="sw overdue"></i>{t('Overdue')}</span><span><i class="sw line"></i>{t('Remaining at week end (right axis)')}</span>
    </div>
    <table class="data">
      <thead><tr><th></th>{#each stats.weeks as w (w.start)}<th>{w.label}</th>{/each}</tr></thead>
      <tbody>
        <tr><th>{t('Completed')}</th>{#each stats.weeks as w (w.start)}<td>{w.completed}</td>{/each}</tr>
        <tr><th>{t('Created')}</th>{#each stats.weeks as w (w.start)}<td>{w.created}</td>{/each}</tr>
        <tr><th>{t('Overdue')}</th>{#each stats.weeks as w (w.start)}<td>{w.overdue}</td>{/each}</tr>
        <tr><th>{t('Remaining')}</th>{#each stats.weeks as w (w.start)}<td>{w.remaining}</td>{/each}</tr>
      </tbody>
    </table>
    {#if stats.excluded}<p class="tfm-muted small">ⓘ {t('{0} tasks without ✅/➕ dates are excluded from completed/created counts.', stats.excluded)}</p>{/if}
  {:else}
    <p class="tfm-muted">{t('Loading…')}</p>
  {/if}
</main>

<style>
  main { padding: 10px 14px 20px; max-width: 1000px; margin: 0 auto; }
  header { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; margin-bottom: 10px; }
  h2 { margin: 0; font-size: 1.1em; flex: 1; }
  header label { display: inline-flex; gap: 6px; align-items: center; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; margin-bottom: 12px; }
  .tile { background: var(--tfm-panel); border: 1px solid var(--tfm-border); border-radius: var(--tfm-radius); padding: 8px 12px; display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; }
  .tile .lbl { grid-column: 1 / -1; color: var(--tfm-muted); font-size: 0.85em; }
  .tile .val { font-size: 1.6em; font-weight: 600; }
  .tile .val.ok { color: var(--tfm-ok); } .tile .val.err { color: var(--tfm-error); }
  .tile .sub { align-self: end; color: var(--tfm-muted); font-size: 0.85em; }
  .chart { width: 100%; height: auto; background: var(--tfm-bg); border: 1px solid var(--tfm-border); border-radius: var(--tfm-radius); }
  .grid { stroke: var(--tfm-border); stroke-width: 1; opacity: 0.6; }
  .axis { fill: var(--tfm-muted); font-size: 11px; }
  .line-axis { fill: var(--vscode-charts-purple, #7c4dff); }
  .bar.completed { fill: var(--vscode-charts-blue, #3794ff); }
  .bar.created { fill: var(--vscode-charts-blue, #3794ff); opacity: 0.45; }
  .bar.overdue { fill: var(--vscode-charts-red, #f14c4c); }
  .line { fill: none; stroke: var(--vscode-charts-purple, #7c4dff); stroke-width: 2; }
  .dot { fill: var(--vscode-charts-purple, #7c4dff); }
  .legend { display: flex; flex-wrap: wrap; gap: 14px; margin: 8px 0 14px; font-size: 0.9em; }
  .sw { display: inline-block; width: 12px; height: 12px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
  .sw.completed { background: var(--vscode-charts-blue, #3794ff); } .sw.created { background: var(--vscode-charts-blue, #3794ff); opacity: 0.45; } .sw.overdue { background: var(--vscode-charts-red, #f14c4c); } .sw.line { background: var(--vscode-charts-purple, #7c4dff); height: 3px; vertical-align: 3px; }
  table.data { border-collapse: collapse; font-size: 0.85em; width: 100%; overflow-x: auto; display: block; }
  .data th, .data td { padding: 2px 8px; text-align: right; border-bottom: 1px solid var(--tfm-border); }
  .data th:first-child { text-align: left; }
  .small { font-size: 0.85em; }
</style>
