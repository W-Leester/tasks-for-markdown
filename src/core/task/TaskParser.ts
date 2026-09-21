import { DateField } from './DateField';
import { Priority } from './Priority';
import type { StatusRegistry } from './Status';
import { Task, type DateFieldName } from './Task';
import { type TaskLocation, unknownLocation } from './TaskLocation';
import { dataviewMatchers } from './formats/dataview';
import { emojiMatchers } from './formats/emoji';
import type { ParsedFields } from './formats/types';

/**
 * `<indent><marker> [<one char>]<space or end><body>`
 * marker: `-`, `*`, `+`, `1.`, `1)`; the bracket must hold exactly one character.
 */
export const TASK_LINE_RE = /^([ \t]*)([-*+]|\d+[.)])[ \t]+\[(.)\](?:[ \t]+(.*))?$/u;

/** Trailing `^block-id` (Obsidian block reference). */
const BLOCK_LINK_RE = /\s+\^([a-zA-Z0-9-]+)$/u;
/** One or more tags at the very end of the body; they are moved back into the description. */
const TRAILING_TAGS_RE = /(?:\s+#[\p{L}\p{N}_\-/]+)+$/u;

const ALL_MATCHERS = [...emojiMatchers, ...dataviewMatchers];
const MAX_FIELDS = 20;

export interface ParseOptions {
  statusRegistry: StatusRegistry;
  /** If set, lines whose body does not contain this text are not tasks (FR-1.4). */
  globalFilter?: string;
  location?: TaskLocation;
}

export interface TaskLineParts {
  indentation: string;
  listMarker: string;
  statusSymbol: string;
  body: string;
}

export function splitTaskLine(line: string): TaskLineParts | null {
  // `.` never matches `\r`, so drop a CRLF remainder before matching.
  const m = TASK_LINE_RE.exec(line.endsWith('\r') ? line.slice(0, -1) : line);
  if (!m) return null;
  return { indentation: m[1]!, listMarker: m[2]!, statusSymbol: m[3]!, body: m[4] ?? '' };
}

export function isTaskLine(line: string): boolean {
  return splitTaskLine(line) !== null;
}

/**
 * Parse one markdown line into a Task, or null if it is not a checklist item (or fails the
 * global filter). Fields are peeled off the end of the body in any order; whatever remains is
 * the description. Invalid values (bad dates) are kept on the task rather than rejected.
 */
export function parseTaskLine(line: string, options: ParseOptions): Task | null {
  const parts = splitTaskLine(line);
  if (!parts) return null;

  let rest = parts.body.trimEnd();
  if (options.globalFilter && !rest.includes(options.globalFilter)) return null;

  let blockLink: string | null = null;
  const bl = BLOCK_LINK_RE.exec(rest);
  if (bl) {
    blockLink = bl[1]!;
    rest = rest.slice(0, bl.index).trimEnd();
  }

  let trailingTags = '';
  const tt = TRAILING_TAGS_RE.exec(rest);
  if (tt && tt.index > 0) {
    trailingTags = tt[0];
    rest = rest.slice(0, tt.index).trimEnd();
  }

  const fields: ParsedFields = { dates: {} };
  for (let i = 0; i < MAX_FIELDS; i++) {
    let matched = false;
    for (const matcher of ALL_MATCHERS) {
      const m = matcher.regex.exec(rest);
      if (!m) continue;
      matcher.apply(m, fields);
      rest = rest.slice(0, m.index).trimEnd();
      matched = true;
      break;
    }
    if (!matched) break;
  }

  const description = (rest.trim() + trailingTags).trim();
  const date = (name: DateFieldName): DateField | null => {
    const raw = fields.dates[name];
    return raw === undefined ? null : DateField.parse(raw);
  };

  return new Task({
    description,
    status: options.statusRegistry.bySymbol(parts.statusSymbol),
    priority: fields.priority ?? Priority.None,
    created: date('created'),
    start: date('start'),
    scheduled: date('scheduled'),
    due: date('due'),
    done: date('done'),
    cancelled: date('cancelled'),
    recurrenceText: fields.recurrenceText ?? null,
    onCompletion: fields.onCompletion ?? null,
    id: fields.id ?? null,
    dependsOn: fields.dependsOn ?? [],
    indentation: parts.indentation,
    listMarker: parts.listMarker,
    blockLink,
    originalMarkdown: line,
    location: options.location ?? unknownLocation(),
  });
}
