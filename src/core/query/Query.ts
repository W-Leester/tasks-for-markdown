import type { Task } from '../task';
import { tokenize } from './tokenizer';
import type { Filter, Grouper, GroupNode, Layout, QueryContext, QueryError, QueryResult, QuerySource, Sorter } from './types';

/** A parser for one kind of instruction; return null when the line is not yours. */
export interface InstructionParser {
  (line: string, query: Query): 'handled' | null;
}

export class Query {
  readonly filters: Filter[] = [];
  readonly sorters: Sorter[] = [];
  readonly groupers: Grouper[] = [];
  readonly errors: QueryError[] = [];
  limit: number | null = null;
  groupLimit: number | null = null;
  readonly layout: Layout = { hidden: new Set(), shortMode: false, explain: false, hideNestedBacklink: false };
  /** Instruction lines in order, for explain output. */
  readonly instructions: string[] = [];

  static parsers: InstructionParser[] = [];
  /** Sorters appended after the user's own (Obsidian default order). */
  static defaultSorters: () => Sorter[] = () => [];

  static parse(text: string, source?: QuerySource): Query {
    const q = new Query();
    for (const { line, text: instruction } of tokenize(text, source)) {
      q.instructions.push(instruction);
      let handled = false;
      for (const p of Query.parsers) {
        try {
          if (p(instruction, q) === 'handled') {
            handled = true;
            break;
          }
        } catch (err) {
          q.errors.push({ line, text: instruction, message: err instanceof Error ? err.message : String(err) });
          handled = true;
          break;
        }
      }
      if (!handled) q.errors.push({ line, text: instruction, message: 'Unknown instruction' });
    }
    return q;
  }

  run(ctx: QueryContext): QueryResult {
    const runtimeErrors: string[] = [];
    const safe = <T>(fn: () => T, fallback: T): T => {
      try {
        return fn();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (runtimeErrors.length < 20 && !runtimeErrors.includes(msg)) runtimeErrors.push(msg);
        return fallback;
      }
    };

    let tasks: Task[] = [];
    if (this.errors.length === 0) {
      tasks = ctx.index.all().filter((t) => this.filters.every((f) => safe(() => f.test(t, ctx), false)));
    }
    const matched = tasks.length;

    const sorters = [...this.sorters, ...Query.defaultSorters()];
    tasks.sort((a, b) => {
      for (const s of sorters) {
        const c = safe(() => s.compare(a, b, ctx), 0);
        if (c !== 0) return s.reverse ? -c : c;
      }
      return 0;
    });
    if (this.limit !== null) tasks = tasks.slice(0, this.limit);

    const root = this.groupTasks(tasks, ctx, safe);
    return { root, matched, shown: root.count, explain: this.explain(), errors: this.errors, runtimeErrors };
  }

  private groupTasks(tasks: Task[], ctx: QueryContext, safe: <T>(fn: () => T, fallback: T) => T): GroupNode {
    const build = (list: Task[], depth: number): GroupNode => {
      if (depth >= this.groupers.length) return { name: '', children: [], tasks: list, count: list.length };
      const grouper = this.groupers[depth]!;
      const buckets = new Map<string, Task[]>();
      for (const t of list) {
        for (const name of safe(() => grouper.groups(t, ctx), ['(error)'])) {
          const b = buckets.get(name);
          if (b) b.push(t);
          else buckets.set(name, [t]);
        }
      }
      // Natural order, with "(No tags)" / "No due date" style fallback groups last.
      const isFallback = (n: string) => n.startsWith('(') || /^No /.test(n);
      let names = [...buckets.keys()].sort((a, b) => Number(isFallback(a)) - Number(isFallback(b)) || a.localeCompare(b, undefined, { numeric: true }));
      if (grouper.reverse) names.reverse();
      if (this.groupLimit !== null) names = names.slice(0, this.groupLimit);
      const children = names.map((n) => ({ ...build(buckets.get(n)!, depth + 1), name: n }));
      return { name: '', children, tasks: [], count: children.reduce((s, c) => s + c.count, 0) };
    };
    return build(tasks, 0);
  }

  explain(): string {
    const lines: string[] = [];
    if (this.errors.length) {
      for (const e of this.errors) lines.push(`Error on line ${e.line}: ${e.message}\n  ${e.text}`);
      return lines.join('\n');
    }
    if (this.filters.length === 0) lines.push('No filters supplied. All tasks will match the query.');
    for (const f of this.filters) lines.push(f.explain === f.instruction ? f.instruction : `${f.instruction} =>\n  ${f.explain.split('\n').join('\n  ')}`);
    lines.push('');
    const sorters = [...this.sorters, ...Query.defaultSorters()];
    lines.push(this.sorters.length ? 'Sort order:' : 'Default sort order:');
    for (const s of sorters) lines.push(`  ${s.instruction}${s.reverse ? ' reverse' : ''}`);
    if (this.groupers.length) {
      lines.push('Group by:');
      for (const g of this.groupers) lines.push(`  ${g.instruction}${g.reverse ? ' reverse' : ''}`);
    }
    if (this.limit !== null) lines.push(`At most ${this.limit} task${this.limit === 1 ? '' : 's'}.`);
    if (this.groupLimit !== null) lines.push(`At most ${this.groupLimit} group${this.groupLimit === 1 ? '' : 's'}.`);
    return lines.join('\n').trimEnd();
  }
}
