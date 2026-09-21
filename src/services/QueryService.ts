import * as vscode from 'vscode';
import { dayjs, type Clock, systemClock } from '../core/dates';
import type { TaskIndex } from '../core/index';
import { Query, type QueryResult, type QuerySource } from '../core/query';
import type { Settings } from '../settings/Settings';

const RERUN_DEBOUNCE_MS = 200;

/**
 * Runs query text against the index with a small result cache keyed on (text, source, index
 * version, day). `onDidChange` fires (debounced) whenever results may have changed so open
 * views re-run their queries (FR-7.16 / FR-7.17).
 */
export class QueryService implements vscode.Disposable {
  private readonly parsed = new Map<string, Query>();
  private readonly results = new Map<string, QueryResult>();
  private readonly emitter = new vscode.EventEmitter<void>();
  readonly onDidChange = this.emitter.event;
  private readonly disposables: vscode.Disposable[] = [];
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly index: TaskIndex,
    private readonly settings: Settings,
    private readonly clock: Clock = systemClock,
  ) {
    const sub = index.onDidChange(() => this.invalidate());
    this.disposables.push({ dispose: () => sub.dispose() }, this.emitter, settings.onDidChange(() => this.invalidate(), ['query.allowFunctions', 'globalFilter']));
    if ('onDidGrantWorkspaceTrust' in vscode.workspace) this.disposables.push(vscode.workspace.onDidGrantWorkspaceTrust(() => this.invalidate()));
  }

  get allowFunctions(): boolean {
    return this.settings.get('query.allowFunctions') && vscode.workspace.isTrusted;
  }

  parse(text: string, source?: QuerySource): Query {
    const key = `${source?.path ?? ''}\u0000${text}`;
    let q = this.parsed.get(key);
    if (!q) {
      q = Query.parse(text, source);
      if (this.parsed.size > 200) this.parsed.clear();
      this.parsed.set(key, q);
    }
    return q;
  }

  run(text: string, source?: QuerySource): QueryResult {
    const today = this.clock.now().startOf('day');
    const key = `${source?.path ?? ''}\u0000${text}\u0000${this.index.version}\u0000${today.valueOf()}\u0000${this.allowFunctions}`;
    const cached = this.results.get(key);
    if (cached) return cached;
    const result = this.parse(text, source).run({ index: this.index, today, allowFunctions: this.allowFunctions, source });
    if (this.results.size > 100) this.results.clear();
    this.results.set(key, result);
    return result;
  }

  explain(text: string, source?: QuerySource): string {
    return this.parse(text, source).explain();
  }

  private invalidate(): void {
    this.results.clear();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.emitter.fire(), RERUN_DEBOUNCE_MS);
  }

  dispose(): void {
    clearTimeout(this.timer);
    for (const d of this.disposables) d.dispose();
  }
}

export { dayjs };
