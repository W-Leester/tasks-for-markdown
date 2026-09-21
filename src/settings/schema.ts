import type { TaskFormat } from '../core/task';

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
  setCancelledDate: true,
  'decorations.relativeDates': true,
  'decorations.overdueHighlight': true,
  'decorations.strikeDone': true,
  'decorations.dimFields': true,
  'decorations.gutterIcons': true,
  'codeLens.mode': 'cursorLine',
  'autoSuggest.enabled': true,
  'autoSuggest.minMatch': 0,
  'autoSuggest.maxItems': 8,
};

export type SettingsKey = keyof SettingsSchema;
export const SETTINGS_KEYS = Object.keys(SETTINGS_DEFAULTS) as SettingsKey[];
