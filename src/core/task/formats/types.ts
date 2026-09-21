import type { DateFieldName } from '../Task';
import type { Priority } from '../Priority';

/** Everything a field matcher may set while the parser peels fields off the end of a line. */
export interface ParsedFields {
  priority?: Priority;
  dates: Partial<Record<DateFieldName, string>>;
  recurrenceText?: string;
  onCompletion?: string;
  id?: string;
  dependsOn?: string[];
}

/**
 * One field syntax. `regex` must be anchored at `$`; when it matches, `apply` records the value
 * and the parser strips the match and tries again from the new end of the line.
 */
export interface FieldMatcher {
  name: string;
  regex: RegExp;
  apply(match: RegExpMatchArray, out: ParsedFields): void;
}

export type TaskFormat = 'emoji' | 'dataview';

export function splitDependsOn(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
