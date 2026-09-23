/**
 * Messages exchanged between the extension host and every Svelte webview (D§5.6). Both sides
 * import this file, so it is the single source of truth. No vscode or core imports here — the
 * webview bundle must stay small and browser-only.
 */

export interface TaskDto {
  /** Index key + line identify the task for edits. */
  key: string;
  path: string;
  line: number;
  heading: string | null;
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
  isBlocked: boolean;
  urgency: number;
  originalMarkdown: string;
}

/** A ```tasks block whose results a panel shows: its text, the note it lives in, and a label. */
export interface QueryTargetDto {
  text: string;
  /** Workspace-relative path of the note (for {{query.file.*}} placeholders). */
  source: string;
  /** e.g. "notes/todo.md:12" */
  label: string;
}

export interface StatusDto {
  symbol: string;
  name: string;
  type: string;
  nextSymbol: string;
}

export interface SavedQueryDto {
  id: string;
  name: string;
  query: string;
  source: 'settings' | 'file';
}

export interface InitState {
  locale: string;
  /** l10n bundle: english string -> translated string. */
  l10n: Record<string, string>;
  today: string;
  statuses: StatusDto[];
  taskFormat: 'emoji' | 'dataview';
  savedQueries: SavedQueryDto[];
  /** Per-app state restored from workspaceState. */
  uiState: Record<string, unknown>;
  editModal: { accessKeys: boolean; hiddenFields: string[] };
  globalFilter: string;
  /** Pixel font size of calendar items (tasksmd.calendar.fontSize). */
  calendarFontSize: number;
}

export type TaskFieldName = 'status' | 'priority' | 'due' | 'scheduled' | 'start' | 'created' | 'done' | 'cancelled' | 'description' | 'recurrence' | 'onCompletion' | 'id' | 'dependsOn';

export type ToWebview =
  | { type: 'state/init'; state: InitState }
  | { type: 'state/patch'; state: Partial<InitState> }
  | { type: 'query/result'; requestId: number; tasks: TaskDto[]; groups: GroupDto | null; matched: number; errors: string[] }
  | { type: 'index/changed' }
  | { type: 'task/loaded'; requestId: number; task: TaskDto | null; candidates: TaskDto[]; dependants: TaskDto[] }
  | { type: 'edit/target'; key: string | null; line: number | null }
  | { type: 'recurrence/validated'; requestId: number; valid: boolean; canonical: string | null }
  | { type: 'query/explained'; requestId: number; explain: string; errors: string[]; matched: number }
  | { type: 'query/target'; id: string | null }
  | { type: 'results/query'; target: QueryTargetDto }
  /** Rendered view: the whole note as HTML. */
  | { type: 'doc/html'; html: string }
  | { type: 'stats/result'; requestId: number; stats: StatsDto }
  /** Host-confirmed full-screen state of the panel (also sent after a command toggled it). */
  | { type: 'ui/fullscreen'; on: boolean }
  | { type: 'error'; message: string };

export interface GroupDto {
  name: string;
  count: number;
  children: GroupDto[];
  tasks: TaskDto[];
}

export type FromWebview =
  | { type: 'ui/ready' }
  | { type: 'ui/state'; state: Record<string, unknown> }
  | { type: 'query/run'; requestId: number; query: string; source?: string | null }
  | { type: 'task/toggle'; key: string; line: number }
  | { type: 'task/setField'; key: string; line: number; field: TaskFieldName; value: string | string[] | null }
  | { type: 'task/setFields'; key: string; line: number; fields: Partial<Record<TaskFieldName, string | string[] | null>> }
  | { type: 'task/create'; key: string | null; line: number | null; fields: Partial<Record<TaskFieldName, string | string[] | null>> }
  | { type: 'task/open'; key: string; line: number }
  | { type: 'task/edit'; key: string; line: number }
  | { type: 'task/load'; requestId: number; key: string | null; line: number | null }
  | { type: 'recurrence/validate'; requestId: number; text: string }
  | { type: 'query/explain'; requestId: number; query: string }
  | { type: 'query/save'; id: string | null; name: string; query: string; destination: 'file' | 'settings' }
  | { type: 'query/insert'; query: string }
  | { type: 'stats/request'; requestId: number; weeks: number; tag: string | null; folder: string | null }
  | { type: 'ui/close' }
  /** Ask the host to maximize the panel (hide side bars/panel) or restore the layout. */
  | { type: 'ui/fullscreen'; on: boolean }
  // Rendered view. `path` is the task's workspace path for query-result rows, null for the note itself.
  | { type: 'doc/toggle'; path: string | null; line: number }
  | { type: 'doc/edit'; path: string | null; line: number }
  | { type: 'doc/postpone'; path: string | null; line: number }
  | { type: 'doc/link'; href: string }
  | { type: 'doc/openSource' }
  | { type: 'ui/notify'; level: 'info' | 'warn' | 'error'; message: string };

/** Minimal typed wrapper around acquireVsCodeApi() for the webview side. */
export interface WebviewApi {
  postMessage(msg: FromWebview): void;
  getState(): unknown;
  setState(s: unknown): void;
}

export interface StatsDto {
  weeks: { start: string; end: string; label: string; completed: number; created: number; overdue: number; remaining: number; current: boolean }[];
  excluded: number;
  totalOpen: number;
  tags: string[];
  folders: string[];
}
