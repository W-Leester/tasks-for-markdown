import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({}));

import { PanelFullscreen } from '../src/webviewHost/PanelFullscreen';

function make(mode: 'maximize' | 'window' = 'maximize', groups = 2) {
  const ran: string[] = [];
  const panel = { reveal: vi.fn() };
  const fs = new PanelFullscreen(panel, () => mode, () => {}, async (c) => { ran.push(c); }, () => groups);
  return { fs, ran, panel };
}

describe('PanelFullscreen', () => {
  it('enter hides side bars + panel and maximizes the group; exit undoes it', async () => {
    const { fs, ran, panel } = make();
    await fs.set(true);
    expect(fs.active).toBe(true);
    expect(panel.reveal).toHaveBeenCalledWith(undefined, false);
    expect(ran).toEqual(['workbench.action.maximizeEditorHideSidebar', 'workbench.action.closeSidebar', 'workbench.action.closePanel']);
    ran.length = 0;
    await fs.set(false);
    expect(fs.active).toBe(false);
    expect(ran).toEqual(['workbench.action.toggleMaximizeEditorGroup', 'workbench.action.focusSideBar']);
  });

  it('does not un-maximize when the panel was the only group or the group is gone', async () => {
    const { fs, ran } = make('maximize', 1);
    await fs.set(true);
    ran.length = 0;
    await fs.set(false);
    expect(ran).toEqual(['workbench.action.focusSideBar']);
  });

  it('window mode also toggles the OS full screen, and toggles it back on exit', async () => {
    const { fs, ran } = make('window');
    await fs.set(true);
    expect(ran.at(-1)).toBe('workbench.action.toggleFullScreen');
    ran.length = 0;
    await fs.set(false);
    expect(ran[0]).toBe('workbench.action.toggleFullScreen');
  });

  it('is idempotent and survives a failing command', async () => {
    const log: string[] = [];
    const panel = { reveal: vi.fn() };
    const fs = new PanelFullscreen(panel, () => 'maximize', (m) => log.push(m), async (c) => { if (c.includes('closePanel')) throw new Error('nope'); }, () => 1);
    await fs.set(true);
    await fs.set(true);
    expect(fs.active).toBe(true);
    expect(log[0]).toMatch(/closePanel failed: nope/);
    fs.dispose();
    await Promise.resolve();
    expect(fs.active).toBe(false);
    expect(panel.reveal).toHaveBeenCalledTimes(1); // not revealed after dispose
  });
});
