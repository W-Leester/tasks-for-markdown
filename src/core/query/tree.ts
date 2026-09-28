import type { TaskIndex } from '../index';
import type { Task } from '../task';

/** One row of a tree-shaped query result. */
export interface TreeNode {
  task: Task;
  /** False for a child shown only as context (it did not match the query's filters). */
  matched: boolean;
  children: TreeNode[];
}

const keyOf = (t: Task) => `${t.location.key}\u0000${t.location.line}`;

/**
 * Nest a flat, already sorted result list (M11 / Obsidian `show tree`):
 * - a task whose parent task (same file, `parentLine` is a task line) is in the list is shown under it;
 * - roots keep the list's order, children keep file order;
 * - with `includeContext`, every child of a shown task is included even if it did not match
 *   (flagged `matched: false`), so a matched task always appears with its sub-tasks.
 * A parent that is a plain bullet (not a task) ends the chain — the index keeps task lines only.
 */
export function buildTaskTree(tasks: readonly Task[], index: TaskIndex, opts: { includeContext: boolean }): TreeNode[] {
  const inList = new Set(tasks.map(keyOf));
  const childrenCache = new Map<string, Task[]>();
  const parentOf = (t: Task): Task | undefined => (t.location.parentLine === null ? undefined : index.taskAt(t.location.key, t.location.parentLine));
  const childrenOf = (t: Task): Task[] => {
    const k = keyOf(t);
    let c = childrenCache.get(k);
    if (!c) {
      c = (index.file(t.location.key)?.tasks ?? []).filter((x) => x.location.parentLine === t.location.line).sort((a, b) => a.location.line - b.location.line);
      childrenCache.set(k, c);
    }
    return c;
  };
  const hasAncestorInList = (t: Task): boolean => {
    for (let p = parentOf(t), guard = 0; p && guard < 64; p = parentOf(p), guard++) if (inList.has(keyOf(p))) return true;
    return false;
  };
  const build = (t: Task, matched: boolean, depth: number): TreeNode => {
    const children: TreeNode[] = [];
    if (depth < 32) {
      for (const c of childrenOf(t)) {
        const m = inList.has(keyOf(c));
        if (m || opts.includeContext) children.push(build(c, m, depth + 1));
        else children.push(...liftMatched(c, depth + 1)); // skip the unmatched level, keep matched descendants
      }
    }
    return { task: t, matched, children };
  };
  const liftMatched = (t: Task, depth: number): TreeNode[] => {
    if (depth >= 32) return [];
    return childrenOf(t).flatMap((c) => (inList.has(keyOf(c)) ? [build(c, true, depth + 1)] : liftMatched(c, depth + 1)));
  };
  return tasks.filter((t) => !hasAncestorInList(t)).map((t) => build(t, true, 0));
}
