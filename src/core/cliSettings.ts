/**
 * The `tasksmd.*` settings the CLI and its MCP server honour (packages/cli/src/config.ts reads exactly these; a test
 * keeps the two in step). The extension hands the editor's values for them to the MCP server it registers, so the
 * editor's AI follows the user's settings too, not only the folder's .vscode/settings.json (M33).
 */
export const CLI_SETTING_KEYS = [
  'include', 'exclude', 'globalFilter', 'taskFormat', 'setDoneDate', 'setCancelledDate', 'setCreatedDate', 'requireDueDate',
  'query.allowFunctions', 'query.showTree',
  'recurrence.insertPosition', 'recurrence.idHandling', 'recurrence.copyDependsOn', 'recurrence.removeScheduledDate',
  'savedQueries', 'statuses',
] as const;

/** Environment variable carrying them: JSON of `{ "tasksmd.<key>": value }`. */
export const SETTINGS_ENV = 'TASKSMD_SETTINGS';
