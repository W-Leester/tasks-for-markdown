import { priorityFromName } from '../Priority';
import type { DateFieldName } from '../Task';
import { type FieldMatcher, splitDependsOn } from './types';

/** Dataview inline-field keys. `completion` (not `done`) matches Obsidian Tasks. */
export const DATAVIEW_DATE_KEY: Readonly<Record<DateFieldName, string>> = {
  created: 'created',
  start: 'start',
  scheduled: 'scheduled',
  due: 'due',
  done: 'completion',
  cancelled: 'cancelled',
};

const keyToDateField = new Map<string, DateFieldName>(
  (Object.entries(DATAVIEW_DATE_KEY) as [DateFieldName, string][]).map(([f, k]) => [k, f]),
);

const ISO = String.raw`\d{4}-\d{2}-\d{2}`;
const IDENT = String.raw`[a-zA-Z0-9\-_]+`;

/**
 * `[key:: value]` or `(key:: value)` at the end of the line — the brackets must be a matching
 * pair. Whitespace is allowed inside the brackets and after `::`. Groups: `k1`/`v1` for square
 * brackets, `k2`/`v2` for parentheses.
 */
function dv(key: string, value: string, flags = 'u'): RegExp {
  const sq = String.raw`\[\s*(?<k1>${key})::\s*(?<v1>${value})\s*\]`;
  const pa = String.raw`\(\s*(?<k2>${key})::\s*(?<v2>${value})\s*\)`;
  return new RegExp(String.raw`(?:${sq}|${pa})$`, flags);
}

function kv(m: RegExpMatchArray): { key: string; value: string } {
  const g = m.groups!;
  return { key: (g['k1'] ?? g['k2'])!, value: (g['v1'] ?? g['v2'])! };
}

export const dataviewMatchers: readonly FieldMatcher[] = [
  {
    name: 'dv-date',
    regex: dv('created|start|scheduled|due|completion|cancelled', ISO),
    consumeTrailingComma: true,
    apply: (m, out) => {
      const { key, value } = kv(m);
      out.dates[keyToDateField.get(key)!] = value;
    },
  },
  {
    name: 'dv-priority',
    regex: dv('priority', 'highest|high|medium|none|low|lowest', 'iu'),
    consumeTrailingComma: true,
    apply: (m, out) => {
      out.priority = priorityFromName(kv(m).value);
    },
  },
  {
    name: 'dv-repeat',
    regex: dv('repeat', String.raw`[^\])]+?`),
    consumeTrailingComma: true,
    apply: (m, out) => {
      out.recurrenceText = kv(m).value.trim();
    },
  },
  {
    name: 'dv-onCompletion',
    regex: dv('onCompletion', '[a-zA-Z]+'),
    consumeTrailingComma: true,
    apply: (m, out) => {
      out.onCompletion = kv(m).value.toLowerCase();
    },
  },
  {
    name: 'dv-id',
    regex: dv('id', IDENT),
    consumeTrailingComma: true,
    apply: (m, out) => {
      out.id = kv(m).value;
    },
  },
  {
    name: 'dv-dependsOn',
    regex: dv('dependsOn', String.raw`${IDENT}(?:\s*,\s*${IDENT})*`),
    consumeTrailingComma: true,
    apply: (m, out) => {
      out.dependsOn = splitDependsOn(kv(m).value);
    },
  },
];
