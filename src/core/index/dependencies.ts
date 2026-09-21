import type { Task } from '../task';
import type { TaskIndex } from './TaskIndex';

/** Tasks this task waits for (resolved through 🆔), whether finished or not. */
export function dependencies(task: Task, index: TaskIndex): Task[] {
  return task.dependsOn.flatMap((id) => [...index.byId(id)]);
}

/** Tasks that list this task's 🆔 in their ⛔. */
export function dependants(task: Task, index: TaskIndex): Task[] {
  if (!task.id) return [];
  return index.all().filter((t) => t.dependsOn.includes(task.id!));
}

/** Blocked = at least one dependency is not completed (FR-1.20). */
export function isBlocked(task: Task, index: TaskIndex): boolean {
  return dependencies(task, index).some((t) => !t.isCompleted);
}

/** Blocking = some other, unfinished task depends on this one (FR-1.21). */
export function isBlocking(task: Task, index: TaskIndex): boolean {
  return !task.isCompleted && dependants(task, index).some((t) => !t.isCompleted);
}

/**
 * Find a dependency cycle that includes `task`, as the list of ids along the cycle
 * (starting and ending with the task's own id), or null (FR-1.22).
 */
export function findDependencyCycle(task: Task, index: TaskIndex): string[] | null {
  if (!task.id) return null;
  const target = task.id;
  const visited = new Set<string>();
  const dfs = (current: Task, path: string[]): string[] | null => {
    for (const id of current.dependsOn) {
      if (id === target) return [...path, id];
      if (visited.has(id)) continue;
      visited.add(id);
      for (const next of index.byId(id)) {
        const found = dfs(next, [...path, id]);
        if (found) return found;
      }
    }
    return null;
  };
  return dfs(task, [target]);
}
