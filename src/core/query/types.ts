import type { Dayjs } from '../dates/dayjs';
import type { TaskIndex } from '../index';
import type { Task } from '../task';

/** Information about where the query lives (for `{{query.file.*}}` placeholders). */
export interface QuerySource {
  path?: string; // e.g. notes/week-38.md
}

export interface QueryContext {
  index: TaskIndex;
  today: Dayjs;
  /** `filter/sort/group by function` are compiled only when true (setting + workspace trust). */
  allowFunctions: boolean;
  source?: QuerySource;
}

export interface Filter {
  instruction: string;
  explain: string;
  test(task: Task, ctx: QueryContext): boolean;
}

export interface Sorter {
  instruction: string;
  reverse: boolean;
  compare(a: Task, b: Task, ctx: QueryContext): number;
}

export interface Grouper {
  instruction: string;
  reverse: boolean;
  /** Group names for a task; several for tags, none means "(no …)" handled by the grouper. */
  groups(task: Task, ctx: QueryContext): string[];
}

export interface QueryError {
  line: number; // 1-based line in the query text
  text: string;
  message: string;
}

export type LayoutElement =
  | 'priority' | 'due date' | 'scheduled date' | 'start date' | 'created date' | 'done date' | 'cancelled date'
  | 'recurrence rule' | 'on completion' | 'id' | 'depends on' | 'tags' | 'backlink' | 'edit button' | 'postpone button'
  | 'urgency' | 'task count' | 'tree';

export interface Layout {
  hidden: Set<LayoutElement>;
  shortMode: boolean;
  explain: boolean;
  hideNestedBacklink: boolean;
}

export interface GroupNode {
  /** Heading text; the root node has an empty name. */
  name: string;
  children: GroupNode[];
  tasks: Task[];
  /** Tasks in this node and all descendants. */
  count: number;
}

export interface QueryResult {
  root: GroupNode;
  /** Tasks after filtering, before limits. */
  matched: number;
  /** Tasks actually shown (after limits). */
  shown: number;
  explain: string;
  errors: QueryError[];
  /** Errors raised while evaluating `by function` instructions at run time. */
  runtimeErrors: string[];
}
