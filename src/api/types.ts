/**
 * Public API of Tasks for Markdown (v1). Other extensions get it with
 *
 *   const ext = vscode.extensions.getExtension('hastycapybara.tasks-for-markdown');
 *   const api = (await ext.activate()).getAPI(1, { extensionId: 'my.extension' });
 *
 * Everything here is plain JSON: dates are `YYYY-MM-DD` strings, a task is addressed by its
 * workspace-relative path and 0-based line. No `vscode` types leak through this file, so it can
 * be copied into another project as a `.d.ts`. Keep it that way: **no imports** in this file (a test
 * checks), and the data shapes below must match the internal DTOs exactly (a type test checks).
 */

// ---- data -----------------------------------------------------------------------------------

/** A task as JSON — what queries return and edits resolve to. Dates are `YYYY-MM-DD` or null. */
export interface TaskDto {
  /** Index key of the file (a URI string in the extension; the path in the CLI/MCP). With `line`, identifies the task for edits. */
  key: string;
  /** Workspace-relative path. */
  path: string;
  /** 0-based line number. */
  line: number;
  /** Nearest heading above the task (without `#`), or null. */
  heading: string | null;
  /** Line of the parent list item (task or bullet) in the same file, or null; see depth. */
  parentLine: number | null;
  /** Nesting depth: 0 = top-level list item. */
  depth: number;
  /** Notes: the task's direct child bullets without a checkbox, with their lines. */
  notes: { line: number; text: string }[];
  /** Task text without the field emojis (tags included). */
  description: string;
  /** `type` is TODO, IN_PROGRESS, ON_HOLD, DONE, CANCELLED or NON_TASK. */
  status: { symbol: string; name: string; type: string };
  /** '0' (highest) … '3' (none) … '5' (lowest). */
  priority: string;
  priorityName: string;
  created: string | null;
  start: string | null;
  scheduled: string | null;
  due: string | null;
  done: string | null;
  cancelled: string | null;
  /** Recurrence rule text such as `every week`, or null. */
  recurrence: string | null;
  onCompletion: string | null;
  /** 🆔 of this task, or null. */
  id: string | null;
  /** ⛔ ids this task waits for. */
  dependsOn: string[];
  tags: string[];
  /** Done or cancelled. */
  isCompleted: boolean;
  /** Done (not cancelled). */
  isDone: boolean;
  /** Waiting for an unfinished task it depends on (⛔). */
  isBlocked: boolean;
  /** Another unfinished task depends on this one — finishing it unblocks something. */
  isBlocking: boolean;
  /** Obsidian Tasks' urgency score. */
  urgency: number;
  /** The whole line as it is in the file — pass it back as `expectedText` to guard edits. */
  originalMarkdown: string;
}

/** A group of query results (`group by`). */
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
  /** False for a context row: shown with its parent although it did not match the query. */
  matched: boolean;
  children: TreeDto[];
}

export interface SavedQueryDto {
  id: string;
  name: string;
  query: string;
  source: 'settings' | 'file';
}

export type ApiErrorCode =
  | 'STALE_LINE' // the line changed since it was read (expectedText / index mismatch)
  | 'NOT_FOUND' // no task at that path/line
  | 'INVALID_QUERY' // the query text has errors (details.errors)
  | 'INVALID_ARGUMENT'
  | 'UNTRUSTED' // writes are disabled in untrusted workspaces
  | 'DENIED' // the user (or tasksmd.api.writePolicy) refused the write
  | 'IO'; // the file could not be read or written

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

/** Who is calling; shown in the write-confirmation dialog and in the log. */
export interface ApiCaller {
  /** `publisher.name` of the calling extension. */
  extensionId?: string;
}

/** A task's address. `expectedText` (the exact source line) makes writes fail with STALE_LINE if the line changed. */
export interface TaskRef {
  path: string;
  line: number;
  expectedText?: string;
}

/** Priority as in the query language: '0' highest … '3' none … '5' lowest. */
export type PriorityValue = '0' | '1' | '2' | '3' | '4' | '5';

export interface TaskFieldChanges {
  description?: string;
  priority?: PriorityValue;
  /** `YYYY-MM-DD`, or null to remove the date. */
  due?: string | null;
  scheduled?: string | null;
  start?: string | null;
  created?: string | null;
  done?: string | null;
  cancelled?: string | null;
  /** Recurrence text such as `every week on monday`, or null to remove. */
  recurrence?: string | null;
  /** `keep` | `delete`, or null. */
  onCompletion?: string | null;
  id?: string | null;
  /** Ids of tasks this one depends on. */
  dependsOn?: string[];
  /** Status symbol (the character inside `[ ]`); applied last, with done/cancelled dates and recurrence. */
  status?: string;
  /** Replace the task's notes (indented plain bullets under it), one entry per note; `[]` removes them. */
  notes?: string[];
}

export interface NewTask extends TaskFieldChanges {
  description: string;
  /** Tags to append to the description (with or without the leading `#`). */
  tags?: string[];
}

export interface CreateTarget {
  /** Workspace-relative Markdown file. Created if it does not exist. Defaults to `tasksmd.calendar.newTaskFile`. */
  path?: string;
  /** Insert after this 0-based line (a blank line is replaced). Omit to append at the end of the file. */
  line?: number;
}

export interface QueryRunOptions {
  /** Workspace-relative path of the "current file" for `{{query.file.*}}` placeholders. */
  source?: string;
  /** Cap on tasks returned (same as a `limit N` line). */
  limit?: number;
}

export interface QueryRunResult {
  /** Tasks after filtering, before limits. */
  matched: number;
  /** Tasks returned (after limits). */
  shown: number;
  /** All returned tasks in result order, flattened even when grouped. */
  tasks: TaskDto[];
  /** Group tree when the query has `group by`, else null. */
  groups: GroupDto | null;
  /** Errors raised by `by function` instructions at run time. */
  runtimeErrors: string[];
}

export interface QueryError {
  line: number;
  text: string;
  message: string;
}

export interface ExplainResult {
  explain: string;
  errors: QueryError[];
}

export type EditOp =
  | { op: 'create'; input: NewTask; target?: CreateTarget }
  | { op: 'update'; ref: TaskRef; changes: TaskFieldChanges }
  | { op: 'setStatus'; ref: TaskRef; symbol: string }
  | { op: 'toggle'; ref: TaskRef }
  | { op: 'postpone'; ref: TaskRef; to: string }
  | { op: 'addNote'; ref: TaskRef; text: string }
  | { op: 'remove'; ref: TaskRef };

export interface BatchResult {
  /** One entry per op, in order: the resulting task, or null for `remove`. */
  results: (TaskDto | null)[];
}

export interface TasksChangeEvent {
  /** Workspace-relative paths of files whose tasks changed or were removed. */
  paths: string[];
}

export interface TaskCompletedEvent {
  task: TaskDto;
  /** The next occurrence written for a recurring task, if any. */
  next?: TaskDto;
}

export interface TaskStatusChangeEvent {
  /** The task before the change. */
  before: TaskDto;
  /** The task after the change (its line as written; for 🏁 delete this is the removed task). */
  after: TaskDto;
  /** The next occurrence written for a recurring task, if any. */
  next?: TaskDto;
  /** True when the task line was deleted (🏁 delete on completion). */
  deleted: boolean;
}

/**
 * Names of optional capabilities, so a caller can check what the installed extension supports
 * (all within API version 1). See docs/api.md "Feature list" for the version each was added in.
 */
export type ApiFeature = 'tree' | 'notes' | 'notes.add' | 'info' | 'events.status' | 'isBlocking';

export interface ApiInfo {
  /** Version of the installed extension, e.g. `1.0.0`. */
  extensionVersion: string;
  apiVersion: 1;
  features: ApiFeature[];
  /** Settings that change what edits are accepted or how lines are written. */
  settings: {
    /** `tasksmd.requireDueDate` (default true): `edit.create` rejects a task without `due`. */
    requireDueDate: boolean;
    /** `tasksmd.taskFormat`: how fields are written. */
    taskFormat: 'emoji' | 'dataview';
    /** `tasksmd.globalFilter`: only lines containing it are tasks ('' = off). */
    globalFilter: string;
  };
}

export interface ApiDisposable {
  dispose(): void;
}

export interface TasksApi {
  readonly version: 1;
  /** Version of the installed extension, e.g. `1.0.0`. */
  readonly extensionVersion: string;
  /** Optional capabilities this build supports — check before using a newer field or method. */
  readonly features: readonly ApiFeature[];
  /** Version, features and the settings that affect edits (e.g. whether a due date is required). */
  info(): Promise<ApiInfo>;

  query: {
    /** Run query text (the same language as ```tasks blocks). Rejects with INVALID_QUERY on parse errors. */
    run(query: string, options?: QueryRunOptions): Promise<QueryRunResult>;
    /** Parse only: the human-readable explanation and any errors. */
    explain(query: string, source?: string): Promise<ExplainResult>;
    /** One task, or null when nothing is at that line. */
    get(ref: TaskRef): Promise<TaskDto | null>;
    /** Every indexed task (optionally only from these files), in file order. */
    list(options?: { paths?: string[] }): Promise<TaskDto[]>;
    /** Saved queries (settings + `.tasks/queries/*.md`). */
    saved(): Promise<SavedQueryDto[]>;
  };

  edit: {
    create(input: NewTask, target?: CreateTarget): Promise<TaskDto>;
    update(ref: TaskRef, changes: TaskFieldChanges): Promise<TaskDto>;
    /** Set the status symbol; done/cancelled dates and the next recurrence are handled like a click in the UI. */
    setStatus(ref: TaskRef, symbol: string): Promise<TaskDto>;
    /** Move to the status' configured next symbol. */
    toggle(ref: TaskRef): Promise<TaskDto>;
    /** Move the due date (or scheduled date if there is no due date) to `YYYY-MM-DD` or natural language ("tomorrow", "next monday", "in 2 weeks"). */
    postpone(ref: TaskRef, to: string): Promise<TaskDto>;
    /** Delete the task line. */
    remove(ref: TaskRef): Promise<void>;
    /** Add one note (an indented bullet) under the task, after its existing notes. Returns the task with its notes. */
    addNote(ref: TaskRef, text: string): Promise<TaskDto>;
    /** Run several edits in order. Stops at the first failure; the error's `details` says how many completed. */
    batch(ops: EditOp[]): Promise<BatchResult>;
  };

  events: {
    onDidChangeTasks(listener: (e: TasksChangeEvent) => void): ApiDisposable;
    onDidCompleteTask(listener: (e: TaskCompletedEvent) => void): ApiDisposable;
    /** Every status change (done, cancelled, in progress, reopened…) from the editor, sidebar, views or the API. */
    onDidChangeStatus(listener: (e: TaskStatusChangeEvent) => void): ApiDisposable;
  };

  ui: {
    /** The create/edit dialog; without a ref it creates a new task. */
    openEdit(ref?: TaskRef): Promise<void>;
    openKanban(options?: { savedQueryId?: string; mode?: 'status' | 'due' | 'priority' | 'file' }): Promise<void>;
    openCalendar(options?: { fullScreen?: boolean }): Promise<void>;
    /** The query results panel beside the editor, showing this query. */
    openQueryResults(query: string, source?: string): Promise<void>;
    /** Open the task's file in the text editor at its line. */
    reveal(ref: TaskRef): Promise<void>;
  };
}

/** What `vscode.extensions.getExtension(...).exports` resolves to. */
export interface TasksExtensionExports {
  getAPI(version: 1, caller?: ApiCaller): TasksApi;
}
