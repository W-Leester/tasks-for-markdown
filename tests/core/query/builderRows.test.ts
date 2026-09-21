import { describe, expect, it } from 'vitest';
import { rowsToText, textToRows } from '../../../src/webviews/query-builder/rows';

describe('query builder rows', () => {
  it('round-trips the supported grammar and keeps unknown lines raw', () => {
    const text = [
      'not done', 'status.type is IN_PROGRESS', 'due before next week', 'has scheduled date', 'no start date', 'priority is above none',
      'tags include #work', 'tags do not include #later', 'description includes report', 'path regex matches /^work\\//', 'is recurring',
      'is blocked', 'exclude sub-items', 'sort by urgency', 'sort by due reverse', 'group by filename', 'group by status.type reverse',
      'limit 20', 'short mode', 'hide backlink', '(done) OR (priority is high)', 'filter by function task.urgency > 5',
    ].join('\n');
    const rows = textToRows(text);
    expect(rows.filter((r) => r.kind === 'raw').map((r) => (r as { value: string }).value)).toEqual(['(done) OR (priority is high)', 'filter by function task.urgency > 5']);
    expect(rowsToText(rows)).toBe(text);
  });
  it('wraps regex values written without slashes', () => {
    expect(rowsToText([{ kind: 'text', field: 'description', op: 'regex matches', value: 'a|b' }])).toBe('description regex matches /a|b/i');
  });
});
