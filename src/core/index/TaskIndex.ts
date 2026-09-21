import type { Heading } from '../file';
import type { Task } from '../task';
import { Emitter, type Subscription } from '../util/Emitter';

/** One indexed file. Replaced wholesale whenever the file changes. */
export interface FileEntry {
  /** Stable key — the extension uses `Uri.toString()`. */
  key: string;
  /** Human-readable, workspace-relative path used for display and queries. */
  path: string;
  tasks: readonly Task[];
  headings: readonly Heading[];
  frontmatterTags: readonly string[];
  /** Monotonic per-index version at which this entry was written. */
  version: number;
}

export interface SkippedFile {
  key: string;
  path: string;
  reason: 'too-large';
  sizeKB: number;
}

export interface IndexChange {
  changed: string[];
  removed: string[];
}

export type IndexState = 'idle' | 'scanning' | 'ready' | 'updating';

export interface IndexProgress {
  state: IndexState;
  done: number;
  total: number;
}

/**
 * In-memory table of every task in the workspace, keyed by file. Pure data structure: the
 * IndexService (extension side) feeds it parsed files; views subscribe to `onDidChange`.
 */
export class TaskIndex {
  private readonly files = new Map<string, FileEntry>();
  private readonly skipped = new Map<string, SkippedFile>();
  private readonly changeEmitter = new Emitter<IndexChange>();
  private readonly progressEmitter = new Emitter<IndexProgress>();
  private allCache: Task[] | null = null;
  private idCache: Map<string, Task[]> | null = null;
  private _version = 0;
  private _progress: IndexProgress = { state: 'idle', done: 0, total: 0 };

  /** Increments on every mutation; query caches key off it. */
  get version(): number {
    return this._version;
  }

  get progress(): IndexProgress {
    return this._progress;
  }

  get state(): IndexState {
    return this._progress.state;
  }

  onDidChange(listener: (change: IndexChange) => void): Subscription {
    return this.changeEmitter.on(listener);
  }

  onDidChangeProgress(listener: (p: IndexProgress) => void): Subscription {
    return this.progressEmitter.on(listener);
  }

  setProgress(p: IndexProgress): void {
    this._progress = p;
    this.progressEmitter.fire(p);
  }

  /** Replace (or add) one file's entry. Emits a change unless `silent` (used during bulk scans). */
  setFile(entry: Omit<FileEntry, 'version'>, silent = false): void {
    this._version++;
    this.files.set(entry.key, { ...entry, version: this._version });
    this.skipped.delete(entry.key);
    this.invalidate();
    if (!silent) this.changeEmitter.fire({ changed: [entry.key], removed: [] });
  }

  removeFile(key: string, silent = false): boolean {
    const had = this.files.delete(key) || this.skipped.delete(key);
    if (!had) return false;
    this._version++;
    this.invalidate();
    if (!silent) this.changeEmitter.fire({ changed: [], removed: [key] });
    return true;
  }

  markSkipped(file: SkippedFile): void {
    this.files.delete(file.key);
    this.skipped.set(file.key, file);
    this._version++;
    this.invalidate();
  }

  /** Drop every file whose key is not in `keep` (after a full rescan). Returns removed keys. */
  retainOnly(keep: ReadonlySet<string>): string[] {
    const removed: string[] = [];
    for (const key of [...this.files.keys(), ...this.skipped.keys()]) {
      if (!keep.has(key)) {
        this.files.delete(key);
        this.skipped.delete(key);
        removed.push(key);
      }
    }
    if (removed.length) {
      this._version++;
      this.invalidate();
    }
    return removed;
  }

  /** Emit one change event covering many files (end of a bulk scan). */
  emitBulkChange(change: IndexChange): void {
    this.changeEmitter.fire(change);
  }

  clear(): void {
    const removed = [...this.files.keys(), ...this.skipped.keys()];
    this.files.clear();
    this.skipped.clear();
    this._version++;
    this.invalidate();
    if (removed.length) this.changeEmitter.fire({ changed: [], removed });
  }

  file(key: string): FileEntry | undefined {
    return this.files.get(key);
  }

  fileKeys(): string[] {
    return [...this.files.keys()];
  }

  fileCount(): number {
    return this.files.size;
  }

  skippedFiles(): SkippedFile[] {
    return [...this.skipped.values()];
  }

  /** Every task in the index, in file order then line order. Cached until the next mutation. */
  all(): readonly Task[] {
    if (!this.allCache) {
      const out: Task[] = [];
      for (const f of this.files.values()) out.push(...f.tasks);
      this.allCache = out;
    }
    return this.allCache;
  }

  taskCount(): number {
    return this.all().length;
  }

  /** Tasks carrying the given 🆔 (duplicates are possible, e.g. recurring copies). */
  byId(id: string): readonly Task[] {
    if (!this.idCache) {
      this.idCache = new Map();
      for (const t of this.all()) {
        if (!t.id) continue;
        const list = this.idCache.get(t.id);
        if (list) list.push(t);
        else this.idCache.set(t.id, [t]);
      }
    }
    return this.idCache.get(id) ?? [];
  }

  /** The indexed task at a file/line, if any. */
  taskAt(key: string, line: number): Task | undefined {
    return this.files.get(key)?.tasks.find((t) => t.location.line === line);
  }

  private invalidate(): void {
    this.allCache = null;
    this.idCache = null;
  }

  dispose(): void {
    this.changeEmitter.dispose();
    this.progressEmitter.dispose();
  }
}
