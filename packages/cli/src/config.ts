import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_STATUSES, StatusRegistry, isStatusType, type StatusConfig, type TaskFormat } from '../../../src/core/task';

/** The subset of `tasksmd.*` settings the CLI honours, read from `<root>/.vscode/settings.json` when present. */
export interface CliConfig {
  root: string;
  include: string[];
  exclude: string[];
  globalFilter: string;
  taskFormat: TaskFormat;
  setDoneDate: boolean;
  setCancelledDate: boolean;
  setCreatedDate: boolean;
  requireDueDate: boolean;
  allowFunctions: boolean;
  showTree: boolean;
  recurrence: { insertPosition: 'above' | 'below'; idHandling: 'keep' | 'new' | 'remove'; copyDependsOn: boolean; removeScheduledDate: boolean };
  statuses: StatusConfig[];
  savedQueries: { name: string; query: string }[];
}

const DEFAULTS: Omit<CliConfig, 'root'> = {
  include: ['**/*.md', '**/*.markdown'],
  exclude: ['**/node_modules/**', '**/.git/**'],
  globalFilter: '',
  taskFormat: 'emoji',
  setDoneDate: true,
  setCancelledDate: true,
  setCreatedDate: false,
  requireDueDate: true,
  allowFunctions: false,
  showTree: true,
  recurrence: { insertPosition: 'above', idHandling: 'keep', copyDependsOn: true, removeScheduledDate: false },
  statuses: [...DEFAULT_STATUSES],
  savedQueries: [],
};

/** Tolerant JSONC: strips line and block comments outside strings, and trailing commas. */
export function parseJsonc(text: string): unknown {
  let out = '';
  let i = 0;
  let inString = false;
  while (i < text.length) {
    const ch = text[i]!;
    if (inString) {
      out += ch;
      if (ch === '\\') { out += text[i + 1] ?? ''; i += 2; continue; }
      if (ch === '"') inString = false;
      i++;
      continue;
    }
    if (ch === '"') { inString = true; out += ch; i++; continue; }
    if (ch === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; continue; }
    if (ch === '/' && text[i + 1] === '*') { const end = text.indexOf('*/', i + 2); i = end < 0 ? text.length : end + 2; continue; }
    out += ch;
    i++;
  }
  return JSON.parse(out.replace(/,\s*([}\]])/g, '$1'));
}

export function loadConfig(root: string): CliConfig {
  const cfg: CliConfig = { root, ...DEFAULTS, recurrence: { ...DEFAULTS.recurrence }, statuses: [...DEFAULTS.statuses], savedQueries: [] };
  const file = path.join(root, '.vscode', 'settings.json');
  if (!fs.existsSync(file)) return cfg;
  let raw: Record<string, unknown>;
  try {
    raw = parseJsonc(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    return cfg;
  }
  const get = <T>(key: string, check: (v: unknown) => v is T): T | undefined => {
    const v = raw[`tasksmd.${key}`];
    return check(v) ? v : undefined;
  };
  const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
  const isStr = (v: unknown): v is string => typeof v === 'string';
  const isStrArr = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
  cfg.include = get('include', isStrArr) ?? cfg.include;
  cfg.exclude = get('exclude', isStrArr) ?? cfg.exclude;
  cfg.globalFilter = get('globalFilter', isStr) ?? cfg.globalFilter;
  const fmt = get('taskFormat', isStr);
  if (fmt === 'emoji' || fmt === 'dataview') cfg.taskFormat = fmt;
  cfg.setDoneDate = get('setDoneDate', isBool) ?? cfg.setDoneDate;
  cfg.setCancelledDate = get('setCancelledDate', isBool) ?? cfg.setCancelledDate;
  cfg.setCreatedDate = get('setCreatedDate', isBool) ?? cfg.setCreatedDate;
  cfg.requireDueDate = get('requireDueDate', isBool) ?? cfg.requireDueDate;
  cfg.allowFunctions = get('query.allowFunctions', isBool) ?? cfg.allowFunctions;
  cfg.showTree = get('query.showTree', isBool) ?? cfg.showTree;
  const pos = get('recurrence.insertPosition', isStr);
  if (pos === 'above' || pos === 'below') cfg.recurrence.insertPosition = pos;
  const idh = get('recurrence.idHandling', isStr);
  if (idh === 'keep' || idh === 'new' || idh === 'remove') cfg.recurrence.idHandling = idh;
  cfg.recurrence.copyDependsOn = get('recurrence.copyDependsOn', isBool) ?? cfg.recurrence.copyDependsOn;
  cfg.recurrence.removeScheduledDate = get('recurrence.removeScheduledDate', isBool) ?? cfg.recurrence.removeScheduledDate;
  const saved = raw['tasksmd.savedQueries'];
  if (Array.isArray(saved)) cfg.savedQueries = saved.filter((q): q is { name: string; query: string } => !!q && typeof q === 'object' && typeof (q as { name?: unknown }).name === 'string' && typeof (q as { query?: unknown }).query === 'string');
  const statuses = raw['tasksmd.statuses'];
  if (Array.isArray(statuses)) {
    const valid = statuses.filter((e): e is StatusConfig => !!e && typeof e === 'object' && typeof (e as StatusConfig).symbol === 'string' && (e as StatusConfig).symbol.length === 1 && typeof (e as StatusConfig).name === 'string' && typeof (e as StatusConfig).nextSymbol === 'string' && isStatusType((e as StatusConfig).type));
    if (valid.length) cfg.statuses = valid;
  }
  return cfg;
}

export function registryFrom(cfg: CliConfig): StatusRegistry {
  return new StatusRegistry(cfg.statuses);
}
