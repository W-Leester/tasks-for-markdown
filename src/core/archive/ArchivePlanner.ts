import type { Dayjs } from '../dates/dayjs';
import type { Task } from '../task';

export interface ArchiveFileInput {
  path: string;
  /** Full file text (to carry sub-items and exact lines over). */
  lines: readonly string[];
  tasks: readonly Task[];
}

export interface ArchiveEntry {
  path: string;
  /** Root tasks selected for archiving (completed, old enough). */
  tasks: Task[];
  /** Every line (root + descendants) that will be removed, ascending. */
  lines: number[];
}

export interface ArchivePlan {
  entries: ArchiveEntry[];
  totalTasks: number;
}

export interface ArchiveOptions {
  today: Dayjs;
  /** Completed at least this many days ago; 0 = every completed task (undated ones too). */
  afterDays: number;
  /** Optional extra filter on candidate roots (the preview lets users deselect tasks). */
  select?: (task: Task) => boolean;
}

/**
 * Decide what to archive (FR-10.5, FR-10.7): DONE/CANCELLED tasks whose completion date is old
 * enough. Sub-items under an archived task move with it; a completed sub-item of an open parent
 * is archived on its own.
 */
export function planArchive(files: readonly ArchiveFileInput[], opts: ArchiveOptions): ArchivePlan {
  const cutoff = opts.today.startOf('day').subtract(opts.afterDays, 'day');
  const entries: ArchiveEntry[] = [];
  for (const file of files) {
    const roots = file.tasks.filter((t) => {
      if (!t.isCompleted) return false;
      const when = t.done?.date ?? t.cancelled?.date ?? null;
      if (opts.select && !opts.select(t)) return false;
      if (!when) return opts.afterDays === 0;
      return !when.isAfter(cutoff, 'day');
    });
    if (!roots.length) continue;
    const rootLines = new Set(roots.map((t) => t.location.line));
    // Descendants: any list item whose parent chain reaches an archived line.
    const parentOf = new Map<number, number | null>();
    for (const t of file.tasks) parentOf.set(t.location.line, t.location.parentLine);
    const removed = new Set<number>(rootLines);
    for (const t of file.tasks) {
      let p = t.location.parentLine;
      while (p !== null && p !== undefined) {
        if (removed.has(p)) { removed.add(t.location.line); break; }
        p = parentOf.get(p) ?? null;
      }
    }
    // Non-task child lines (plain sub-bullets / continuation lines) directly under archived items.
    for (const line of [...removed]) {
      const indent = indentOf(file.lines[line] ?? '');
      for (let l = line + 1; l < file.lines.length; l++) {
        const text = file.lines[l]!;
        if (text.trim() === '') break;
        if (indentOf(text) <= indent) break;
        removed.add(l);
      }
    }
    const topLevel = roots.filter((t) => !(t.location.parentLine !== null && removed.has(t.location.parentLine)));
    entries.push({ path: file.path, tasks: topLevel, lines: [...removed].sort((a, b) => a - b) });
  }
  return { entries, totalTasks: entries.reduce((n, e) => n + e.tasks.length, 0) };
}

function indentOf(line: string): number {
  let w = 0;
  for (const ch of line) {
    if (ch === ' ') w++;
    else if (ch === '\t') w += 4;
    else break;
  }
  return w;
}

export interface ArchiveTextOptions {
  today: Dayjs;
  linkStyle: 'wiki' | 'markdown';
  /** Relative path from the archive file to the workspace root (for markdown links). */
  linkPrefix?: string;
}

/**
 * Text appended to the archive file (FR-10.6):
 *   ## 2026-09-21
 *   [[notes/week-38#Work]]
 *   - [x] task line …
 */
export function renderArchiveBlock(plan: ArchivePlan, files: readonly ArchiveFileInput[], opts: ArchiveTextOptions): string {
  const out: string[] = [`## ${opts.today.format('YYYY-MM-DD')}`, ''];
  for (const entry of plan.entries) {
    const file = files.find((f) => f.path === entry.path)!;
    const byHeading = new Map<string | null, number[]>();
    for (const line of entry.lines) {
      const task = file.tasks.find((t) => t.location.line === line);
      const heading = task ? task.location.heading : nearestHeading(file, line);
      byHeading.set(heading, [...(byHeading.get(heading) ?? []), line]);
    }
    for (const [heading, lines] of byHeading) {
      const noExt = entry.path.replace(/\.md$/, '');
      const link = opts.linkStyle === 'wiki'
        ? `[[${noExt}${heading ? `#${heading}` : ''}]]`
        : `[${entry.path}${heading ? ` › ${heading}` : ''}](${opts.linkPrefix ?? ''}${entry.path.replace(/ /g, '%20')}${heading ? `#${slug(heading)}` : ''})`;
      out.push(link);
      // Each archived root becomes top-level; its descendants keep their relative indentation.
      const rootLines = new Set(entry.tasks.map((t) => t.location.line));
      let width = 0;
      for (const l of lines) {
        const text = file.lines[l] ?? '';
        if (rootLines.has(l)) width = indentOf(text);
        out.push(dedent(text, width));
      }
      out.push('');
    }
  }
  return out.join('\n').trimEnd() + '\n';
}

function nearestHeading(file: ArchiveFileInput, line: number): string | null {
  for (let l = line; l >= 0; l--) {
    const m = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(file.lines[l] ?? '');
    if (m) return m[1]!;
  }
  return null;
}

function dedent(line: string, width: number): string {
  let removed = 0, i = 0;
  while (i < line.length && removed < width) {
    if (line[i] === ' ') removed++;
    else if (line[i] === '\t') removed += 4;
    else break;
    i++;
  }
  return line.slice(i);
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
}
