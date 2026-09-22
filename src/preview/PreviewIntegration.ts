import * as path from 'node:path';
import * as vscode from 'vscode';
import type { MarkdownIt } from 'markdown-it';
import { systemClock, type Clock, type RelativeDate } from '../core/dates';
import type { TaskIndex } from '../core/index';
import type { QuerySource } from '../core/query';
import type { RenderOptions } from '../core/render';
import type { StatusRegistry, Task } from '../core/task';
import { overdueText, relativeText } from '../editor/relativeText';
import type { QueryService } from '../services/QueryService';
import type { Settings } from '../settings/Settings';
import { tasksMarkdownItPlugin } from './markdownItPlugin';
import { t } from '../l10n';

const REFRESH_DEBOUNCE_MS = 500;

export interface PreviewDeps {
  index: TaskIndex;
  queries: QueryService;
  settings: Settings;
  getStatusRegistry(): StatusRegistry;
  clock?: Clock;
  log?(m: string): void;
}

/**
 * Glue between the extension host and VS Code's built-in Markdown preview (D-1): provides the
 * markdown-it plugin and refreshes open previews when the index changes so ```tasks blocks stay
 * current. The preview cannot talk back, so everything here is render-only.
 */
export class PreviewIntegration implements vscode.Disposable {
  private readonly disposables: vscode.Disposable[] = [];
  private timer: NodeJS.Timeout | undefined;

  constructor(private readonly deps: PreviewDeps) {
    const sub = deps.index.onDidChange(() => this.scheduleRefresh());
    this.disposables.push({ dispose: () => sub.dispose() }, deps.settings.onDidChange(() => this.scheduleRefresh(), ['preview.enabled', 'preview.renderBadges', 'globalFilter']));
  }

  /** How many times VS Code asked for the plugin — 0 means the built-in preview never picked it up. */
  extendCalls = 0;

  /** Called by VS Code through `extendMarkdownIt` on the extension's exported API. */
  extendMarkdownIt(md: MarkdownIt): MarkdownIt {
    this.extendCalls++;
    this.deps.log?.(`extendMarkdownIt called (${this.extendCalls})`);
    tasksMarkdownItPlugin(md, {
      getStatusRegistry: () => this.deps.getStatusRegistry(),
      runQuery: (text, source) => this.deps.queries.run(text, source),
      parseQuery: (text, source) => this.deps.queries.parse(text, source),
      renderOptions: (source) => this.renderOptions(source),
      sourceFromEnv: (env) => {
        const doc = (env as { currentDocument?: vscode.Uri } | undefined)?.currentDocument;
        return doc ? { path: vscode.workspace.asRelativePath(doc, false) } : undefined;
      },
      globalFilter: () => this.deps.settings.get('globalFilter') || undefined,
      enabled: () => this.deps.settings.get('preview.enabled'),
      log: (m) => this.deps.log?.(m),
    });
    return md;
  }

  private renderOptions(source?: QuerySource): RenderOptions {
    const renderBadges = this.deps.settings.get('preview.renderBadges');
    const gf = this.deps.settings.get('globalFilter');
    return {
      today: (this.deps.clock ?? systemClock).now().startOf('day'),
      relative: (r: RelativeDate, overdue: boolean) => (overdue ? overdueText(r) : relativeText(r)),
      link: (task: Task) => {
        // Relative link from the previewed document's folder to the task's file; the preview
        // resolves it like any markdown link (and #L<n> jumps to the line when links open in the editor).
        const from = source?.path ? path.posix.dirname(source.path) : '.';
        const rel = path.posix.relative(from === '.' ? '' : from, task.location.path) || task.location.path;
        return `${rel}#L${task.location.line + 1}`;
      },
      globalFilter: gf && this.deps.settings.get('removeGlobalFilterFromDescription') ? gf : undefined,
      t: (s, ...args) => t(s, ...args),
      ...(renderBadges ? {} : { hideBadges: true }),
    };
  }

  private scheduleRefresh(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void vscode.commands.executeCommand('markdown.preview.refresh'), REFRESH_DEBOUNCE_MS);
  }

  dispose(): void {
    clearTimeout(this.timer);
    for (const d of this.disposables) d.dispose();
  }
}
