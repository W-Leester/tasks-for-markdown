import { priorityFromEmoji } from '../Priority';
import type { DateFieldName } from '../Task';
import { type FieldMatcher, splitDependsOn } from './types';

/** Emoji → date field. Several emoji are accepted for the same field (variation selectors, ⌛/⏳). */
export const DATE_EMOJI: Readonly<Record<DateFieldName, readonly string[]>> = {
  created: ['➕'],
  start: ['🛫'],
  scheduled: ['⏳', '⌛'],
  due: ['📅', '📆', '🗓'],
  done: ['✅'],
  cancelled: ['❌'],
};

/** Canonical emoji used when writing. */
export const WRITE_EMOJI: Readonly<Record<DateFieldName, string>> = {
  created: '➕',
  start: '🛫',
  scheduled: '⏳',
  due: '📅',
  done: '✅',
  cancelled: '❌',
};

export const RECURRENCE_EMOJI = '🔁';
export const ON_COMPLETION_EMOJI = '🏁';
export const ID_EMOJI = '🆔';
export const DEPENDS_ON_EMOJI = '⛔';

const emojiToDateField = new Map<string, DateFieldName>();
for (const [field, emojis] of Object.entries(DATE_EMOJI) as [DateFieldName, readonly string[]][]) {
  for (const e of emojis) emojiToDateField.set(e, field);
}
const allDateEmoji = [...emojiToDateField.keys()].join('');

const ISO = String.raw`(\d{4}-\d{2}-\d{2})`;
const IDENT = String.raw`[a-zA-Z0-9\-_]+`;

export const emojiMatchers: readonly FieldMatcher[] = [
  {
    name: 'emoji-date',
    // Optional U+FE0F variation selector after the emoji, then the date.
    regex: new RegExp(String.raw`([${allDateEmoji}])️?\s*${ISO}$`, 'u'),
    apply: (m, out) => {
      const field = emojiToDateField.get(m[1]!)!;
      out.dates[field] = m[2]!;
    },
  },
  {
    name: 'emoji-priority',
    regex: /([🔺⏫🔼🔽⏬])️?$/u,
    apply: (m, out) => {
      out.priority = priorityFromEmoji(m[1]!);
    },
  },
  {
    name: 'emoji-recurrence',
    regex: new RegExp(String.raw`${RECURRENCE_EMOJI}️?\s*([a-zA-Z0-9, !]+)$`, 'u'),
    apply: (m, out) => {
      out.recurrenceText = m[1]!.trim();
    },
  },
  {
    name: 'emoji-onCompletion',
    regex: new RegExp(String.raw`${ON_COMPLETION_EMOJI}️?\s*([a-zA-Z]+)$`, 'u'),
    apply: (m, out) => {
      out.onCompletion = m[1]!.toLowerCase();
    },
  },
  {
    name: 'emoji-id',
    regex: new RegExp(String.raw`${ID_EMOJI}️?\s*(${IDENT})$`, 'u'),
    apply: (m, out) => {
      out.id = m[1]!;
    },
  },
  {
    name: 'emoji-dependsOn',
    regex: new RegExp(String.raw`${DEPENDS_ON_EMOJI}️?\s*(${IDENT}(?:\s*,\s*${IDENT})*)$`, 'u'),
    apply: (m, out) => {
      out.dependsOn = splitDependsOn(m[1]!);
    },
  },
];
