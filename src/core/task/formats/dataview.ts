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

const ISO = String.raw`(\d{4}-\d{2}-\d{2})`;
const IDENT = String.raw`[a-zA-Z0-9\-_]+`;
// Fields may be wrapped in [] or (); we accept both but always write [].
const open = String.raw`[[(]`;
const close = String.raw`[\])]`;

export const dataviewMatchers: readonly FieldMatcher[] = [
  {
    name: 'dv-date',
    regex: new RegExp(String.raw`${open}(created|start|scheduled|due|completion|cancelled)::\s*${ISO}\s*${close}$`, 'u'),
    apply: (m, out) => {
      out.dates[keyToDateField.get(m[1]!)!] = m[2]!;
    },
  },
  {
    name: 'dv-priority',
    regex: new RegExp(String.raw`${open}priority::\s*(highest|high|medium|none|low|lowest)\s*${close}$`, 'iu'),
    apply: (m, out) => {
      out.priority = priorityFromName(m[1]!);
    },
  },
  {
    name: 'dv-repeat',
    regex: new RegExp(String.raw`${open}repeat::\s*([^\])]+?)\s*${close}$`, 'u'),
    apply: (m, out) => {
      out.recurrenceText = m[1]!.trim();
    },
  },
  {
    name: 'dv-onCompletion',
    regex: new RegExp(String.raw`${open}onCompletion::\s*([a-zA-Z]+)\s*${close}$`, 'u'),
    apply: (m, out) => {
      out.onCompletion = m[1]!.toLowerCase();
    },
  },
  {
    name: 'dv-id',
    regex: new RegExp(String.raw`${open}id::\s*(${IDENT})\s*${close}$`, 'u'),
    apply: (m, out) => {
      out.id = m[1]!;
    },
  },
  {
    name: 'dv-dependsOn',
    regex: new RegExp(String.raw`${open}dependsOn::\s*(${IDENT}(?:\s*,\s*${IDENT})*)\s*${close}$`, 'u'),
    apply: (m, out) => {
      out.dependsOn = splitDependsOn(m[1]!);
    },
  },
];
