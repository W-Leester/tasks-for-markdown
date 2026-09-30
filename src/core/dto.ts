import { type Dayjs } from './dates';
import { type TaskIndex, isBlocked, isBlocking } from './index';
import type { GroupNode } from './query';
import { PRIORITY_NAME, type Task, urgency } from './task';

/** JSON-friendly view of a task — what the webviews, the public API and the CLI return. */
export interface TaskDto {
  /** Index key + line identify the task for edits. */
  key: string;
  path: string;
  line: number;
  heading: string | null;
  /** Line of the parent list item (task or bullet) in the same file, or null; see depth. */
  parentLine: number | null;
  /** Nesting depth: 0 = top-level list item. */
  depth: number;
  /** Notes: the task's direct child bullets without a checkbox (line + text). */
  notes: { line: number; text: string }[];
  description: string;
  status: { symbol: string; name: string; type: string };
  /** '0' (highest) … '5' (lowest). */
  priority: string;
  priorityName: string;
  created: string | null;
  start: string | null;
  scheduled: string | null;
  due: string | null;
  done: string | null;
  cancelled: string | null;
  recurrence: string | null;
  onCompletion: string | null;
  id: string | null;
  dependsOn: string[];
  tags: string[];
  isCompleted: boolean;
  isDone: boolean;
  /** Waiting for an unfinished task it depends on (⛔). */
  isBlocked: boolean;
  /** Another unfinished task depends on this one (it waits for this, via ⛔ this task's 🆔). */
  isBlocking: boolean;
  urgency: number;
  originalMarkdown: string;
}

export interface GroupDto {
  name: string;
  count: number;
  children: GroupDto[];
  tasks: TaskDto[];
  /** Tree display (leaf groups only): `tasks` nested by parent task, with context children (`matched: false`). */
  tree?: TreeDto[];
}

export interface TreeDto {
  task: TaskDto;
  matched: boolean;
  children: TreeDto[];
}

export interface SavedQueryDto {
  id: string;
  name: string;
  query: string;
  source: 'settings' | 'file';
}

export function toTaskDto(task: Task, index: TaskIndex, today: Dayjs): TaskDto {
  const d = (f: Task['due']) => (f ? f.format() : null);
  return {
    key: task.location.key,
    path: task.location.path,
    line: task.location.line,
    heading: task.location.heading,
    parentLine: task.location.parentLine,
    depth: task.location.depth,
    notes: (task.location.notes ?? []).map((n) => ({ line: n.line, text: n.text })),
    description: task.description,
    status: { symbol: task.status.symbol, name: task.status.name, type: task.status.type },
    priority: task.priority,
    priorityName: PRIORITY_NAME[task.priority],
    created: d(task.created),
    start: d(task.start),
    scheduled: d(task.scheduled),
    due: d(task.due),
    done: d(task.done),
    cancelled: d(task.cancelled),
    recurrence: task.recurrenceText,
    onCompletion: task.onCompletion,
    id: task.id,
    dependsOn: [...task.dependsOn],
    tags: [...task.tags],
    isCompleted: task.isCompleted,
    isDone: task.isDone,
    isBlocked: !task.isCompleted && isBlocked(task, index),
    isBlocking: isBlocking(task, index),
    urgency: Math.round(urgency(task, today) * 100) / 100,
    originalMarkdown: task.originalMarkdown,
  };
}

export function toGroupDto(node: GroupNode, index: TaskIndex, today: Dayjs): GroupDto {
  return {
    name: node.name,
    count: node.count,
    children: node.children.map((c) => toGroupDto(c, index, today)),
    tasks: node.tasks.map((t) => toTaskDto(t, index, today)),
    ...(node.tree ? { tree: node.tree.map(function toTree(n): TreeDto { return { task: toTaskDto(n.task, index, today), matched: n.matched, children: n.children.map(toTree) }; }) } : {}),
  };
}
