import { type Dayjs } from '../core/dates';
import { type TaskIndex, isBlocked } from '../core/index';
import type { GroupNode } from '../core/query';
import { PRIORITY_NAME, type Task, urgency } from '../core/task';
import type { GroupDto, TaskDto } from '../webviews/shared/protocol';

export function toTaskDto(task: Task, index: TaskIndex, today: Dayjs): TaskDto {
  const d = (f: Task['due']) => (f ? f.format() : null);
  return {
    key: task.location.key,
    path: task.location.path,
    line: task.location.line,
    heading: task.location.heading,
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
  };
}
