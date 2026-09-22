import * as vscode from 'vscode';

export type FullScreenMode = 'maximize' | 'window';

/**
 * Turns an editor-area webview panel (calendar, kanban…) into a "full screen" view: both side
 * bars and the bottom panel are hidden and the panel's editor group is maximized. With mode
 * 'window' the OS window goes full screen as well.
 *
 * VS Code exposes no API to read the layout, so exit undoes what enter did (un-maximize the
 * group, show the side bar again) rather than restoring the exact previous state.
 */
export class PanelFullscreen implements vscode.Disposable {
  active = false;
  private maximized = false;
  private windowToggled = false;
  private disposed = false;

  constructor(
    private readonly panel: Pick<vscode.WebviewPanel, 'reveal'>,
    private readonly mode: () => FullScreenMode,
    private readonly log: (message: string) => void,
    private readonly run: (command: string) => Thenable<unknown> = (c) => vscode.commands.executeCommand(c),
    private readonly groupCount: () => number = () => vscode.window.tabGroups.all.length,
  ) {}

  async set(on: boolean): Promise<void> {
    if (on === this.active) return;
    if (on) await this.enter();
    else await this.exit();
  }

  async enter(): Promise<void> {
    this.active = true;
    this.panel.reveal(undefined, false); // the group to maximize is the active one
    this.maximized = this.groupCount() > 1;
    // Hides both side bars and maximizes the active group in one go (VS Code ≥ 1.85, Cursor).
    await this.tryRun('workbench.action.maximizeEditorHideSidebar');
    await this.tryRun('workbench.action.closeSidebar');
    await this.tryRun('workbench.action.closePanel');
    if (this.mode() === 'window') {
      this.windowToggled = true;
      await this.tryRun('workbench.action.toggleFullScreen');
    }
  }

  async exit(): Promise<void> {
    if (!this.active) return;
    this.active = false;
    if (this.windowToggled) {
      this.windowToggled = false;
      await this.tryRun('workbench.action.toggleFullScreen');
    }
    // A group that lost its last editor is gone already (and with it the maximized state).
    if (this.maximized && this.groupCount() > 1) await this.tryRun('workbench.action.toggleMaximizeEditorGroup');
    this.maximized = false;
    await this.tryRun('workbench.action.focusSideBar');
    if (!this.disposed) this.panel.reveal(undefined, false);
  }

  /** Restores the layout when the panel is closed while in full screen. */
  dispose(): void {
    this.disposed = true;
    void this.exit();
  }

  private async tryRun(command: string): Promise<void> {
    try {
      await this.run(command);
    } catch (err) {
      this.log(`fullscreen: ${command} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
