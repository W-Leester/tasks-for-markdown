import type { StatusConfig, TaskFormat } from '../core/task';
import { DEFAULT_STATUSES } from '../core/task';

/**
 * Typed mirror of `contributes.configuration` in package.json (namespace `tasksmd`).
 * Keep the two in sync: every key here must exist there with the same default.
 */
export interface SettingsSchema {
  taskFormat: TaskFormat;
  globalFilter: string;
  removeGlobalFilterFromDescription: boolean;
  include: string[];
  exclude: string[];
  respectGitignore: boolean;
  maxFileSizeKB: number;
  setCreatedDate: boolean;
  setDoneDate: boolean;
  /** Refuse to create a task without a due date (dialog, API, CLI, MCP) and warn in the editor. */
  requireDueDate: boolean;
  setCancelledDate: boolean;
  'decorations.relativeDates': boolean;
  'decorations.overdueHighlight': boolean;
  'decorations.strikeDone': boolean;
  'decorations.dimFields': boolean;
  'decorations.gutterIcons': boolean;
  'codeLens.mode': 'off' | 'cursorLine' | 'all';
  'autoSuggest.enabled': boolean;
  'autoSuggest.minMatch': number;
  'autoSuggest.maxItems': number;
  'recurrence.insertPosition': 'above' | 'below';
  'recurrence.idHandling': 'keep' | 'new' | 'remove';
  'recurrence.copyDependsOn': boolean;
  'recurrence.removeScheduledDate': boolean;
  statuses: StatusConfig[];
  'query.allowFunctions': boolean;
  savedQueries: { name: string; query: string }[];
  'preview.enabled': boolean;
  'preview.renderBadges': boolean;
  'editModal.accessKeys': boolean;
  'editModal.hiddenFields': string[];
  'notifications.enabled': boolean;
  'notifications.os': boolean;
  'notifications.dailyTime': string;
  'notifications.dueWithinDays': number;
  'archive.file': string;
  'archive.afterDays': number;
  'archive.linkStyle': 'wiki' | 'markdown';
  'calendar.newTaskFile': string;
  'calendar.fullScreen': 'maximize' | 'window';
  'calendar.fontSize': number;
  'rendered.fieldStyle': 'plain' | 'badges';
  'rendered.fontSize': number;
  'api.writePolicy': 'confirm' | 'allow' | 'deny';
  'api.allowedWriters': string[];
  'api.batchLimit': number;
  'rendered.lineHeight': number;
  'rendered.fieldsAlign': 'right' | 'inline';
  /** When the rendered view is the default editor, notes without tasks open in the text editor. */
  'rendered.sourceWhenNoTasks': boolean;
  /** Max width of the rendered column in px; 0 = use the full editor width. */
  'rendered.maxWidth': number;
  updateCheckUrl: string;
  language: 'auto' | 'en' | 'ko';
}

export const SETTINGS_SECTION = 'tasksmd';

export const SETTINGS_DEFAULTS: Readonly<SettingsSchema> = {
  taskFormat: 'emoji',
  globalFilter: '',
  removeGlobalFilterFromDescription: true,
  include: ['**/*.md', '**/*.markdown'],
  exclude: ['**/node_modules/**', '**/.git/**'],
  respectGitignore: true,
  maxFileSizeKB: 1024,
  setCreatedDate: false,
  setDoneDate: true,
  requireDueDate: false,
  setCancelledDate: true,
  'decorations.relativeDates': true,
  'decorations.overdueHighlight': true,
  'decorations.strikeDone': false,
  'decorations.dimFields': true,
  'decorations.gutterIcons': true,
  'codeLens.mode': 'cursorLine',
  'autoSuggest.enabled': true,
  'autoSuggest.minMatch': 0,
  'autoSuggest.maxItems': 8,
  'recurrence.insertPosition': 'above',
  'recurrence.idHandling': 'keep',
  'recurrence.copyDependsOn': true,
  'recurrence.removeScheduledDate': false,
  statuses: [...DEFAULT_STATUSES],
  'query.allowFunctions': false,
  savedQueries: [],
  'preview.enabled': true,
  'preview.renderBadges': true,
  'editModal.accessKeys': true,
  'editModal.hiddenFields': [],
  'notifications.enabled': true,
  'notifications.os': true,
  'notifications.dailyTime': '09:00',
  'notifications.dueWithinDays': 1,
  'archive.file': 'Archive.md',
  'archive.afterDays': 30,
  'archive.linkStyle': 'wiki',
  'calendar.newTaskFile': '',
  'calendar.fullScreen': 'maximize',
  'calendar.fontSize': 13,
  'rendered.fieldStyle': 'plain',
  'rendered.fontSize': 14.5,
  'api.writePolicy': 'confirm',
  'api.allowedWriters': [],
  'api.batchLimit': 200,
  'rendered.lineHeight': 1.6,
  'rendered.fieldsAlign': 'right',
  'rendered.sourceWhenNoTasks': true,
  'rendered.maxWidth': 800,
  updateCheckUrl: '',
  language: 'auto',
};

export type SettingsKey = keyof SettingsSchema;
export const SETTINGS_KEYS = Object.keys(SETTINGS_DEFAULTS) as SettingsKey[];
