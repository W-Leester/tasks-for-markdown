import { render } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';

// The host puts the bundle in the page before the app script (src/webviewHost/l10nBlock.ts).
vi.hoisted(() => {
  document.body.insertAdjacentHTML('beforeend', '<script type="application/json" id="tfm-l10n">{"Columns":"열","Tasks":"태스크","Filter…":"필터…"}</script>');
});
import KanbanApp from '../../src/webviews/kanban/KanbanApp.svelte';

describe('kanban first paint', () => {
  it('toolbar is translated before state/init arrives', () => {
    const r = render(KanbanApp);
    const toolbar = r.container.querySelector('.toolbar')!;
    expect(toolbar.textContent).toContain('열');
    expect(toolbar.textContent).toContain('태스크');
    expect(toolbar.querySelector('input[type="search"]')!.getAttribute('placeholder')).toBe('필터…');
  });
});
