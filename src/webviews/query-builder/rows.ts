/** Builder rows <-> query lines. Only the grammar subset the UI offers is parsed back; other lines stay raw. */

export type Row =
  | { kind: 'status'; value: 'done' | 'not done' | 'TODO' | 'IN_PROGRESS' | 'ON_HOLD' | 'DONE' | 'CANCELLED' }
  | { kind: 'date'; field: DateFieldSel; op: DateOp; value: string }
  | { kind: 'hasDate'; field: DateFieldSel; has: boolean }
  | { kind: 'priority'; op: 'is' | 'is above' | 'is below' | 'is not'; value: PriorityName }
  | { kind: 'tags'; include: boolean; value: string }
  | { kind: 'text'; field: 'description' | 'heading' | 'path' | 'folder' | 'filename'; op: 'includes' | 'does not include' | 'regex matches' | 'regex does not match'; value: string }
  | { kind: 'flag'; value: 'is recurring' | 'is not recurring' | 'is blocked' | 'is not blocked' | 'is blocking' | 'has id' | 'no id' | 'has depends on' | 'no depends on' | 'exclude sub-items' | 'has tags' | 'no tags' }
  | { kind: 'sort'; field: string; reverse: boolean }
  | { kind: 'group'; field: string; reverse: boolean }
  | { kind: 'limit'; value: number }
  | { kind: 'layout'; value: 'short mode' | 'explain' | 'hide priority' | 'hide due date' | 'hide backlink' | 'hide task count' | 'hide tags' | 'hide recurrence rule' }
  | { kind: 'raw'; value: string };

export type DateFieldSel = 'due' | 'scheduled' | 'start' | 'happens' | 'done' | 'created' | 'cancelled';
export type DateOp = 'on' | 'before' | 'after' | 'on or before' | 'on or after' | 'in';
export type PriorityName = 'highest' | 'high' | 'medium' | 'none' | 'low' | 'lowest';

export const DATE_FIELDS: DateFieldSel[] = ['due', 'scheduled', 'start', 'happens', 'done', 'created', 'cancelled'];
export const DATE_OPS: DateOp[] = ['on', 'before', 'after', 'on or before', 'on or after', 'in'];
export const PRIORITIES: PriorityName[] = ['highest', 'high', 'medium', 'none', 'low', 'lowest'];
export const SORT_FIELDS = ['urgency', 'due', 'scheduled', 'start', 'happens', 'priority', 'description', 'status.type', 'path', 'filename', 'heading', 'created', 'done', 'tags', 'random'];
export const GROUP_FIELDS = ['filename', 'folder', 'path', 'heading', 'backlink', 'due', 'scheduled', 'start', 'happens', 'priority', 'status.type', 'status.name', 'tags', 'recurring', 'urgency'];
export const FLAGS: Extract<Row, { kind: 'flag' }>['value'][] = ['is recurring', 'is not recurring', 'is blocked', 'is not blocked', 'is blocking', 'has id', 'no id', 'has depends on', 'no depends on', 'exclude sub-items', 'has tags', 'no tags'];
export const LAYOUTS: Extract<Row, { kind: 'layout' }>['value'][] = ['short mode', 'explain', 'hide priority', 'hide due date', 'hide backlink', 'hide task count', 'hide tags', 'hide recurrence rule'];

export function rowToLine(r: Row): string {
  switch (r.kind) {
    case 'status': return r.value === 'done' || r.value === 'not done' ? r.value : `status.type is ${r.value}`;
    case 'date': return `${r.field} ${r.op} ${r.value}`.trim();
    case 'hasDate': return `${r.has ? 'has' : 'no'} ${r.field} date`;
    case 'priority': return `priority ${r.op} ${r.value}`;
    case 'tags': return `tags ${r.include ? 'include' : 'do not include'} ${r.value}`.trim();
    case 'text': return `${r.field} ${r.op} ${r.op.startsWith('regex') && !r.value.startsWith('/') ? `/${r.value}/i` : r.value}`.trim();
    case 'flag': return r.value;
    case 'sort': return `sort by ${r.field}${r.reverse ? ' reverse' : ''}`;
    case 'group': return `group by ${r.field}${r.reverse ? ' reverse' : ''}`;
    case 'limit': return `limit ${r.value}`;
    case 'layout': return r.value;
    case 'raw': return r.value;
  }
}

export function rowsToText(rows: Row[]): string {
  return rows.map(rowToLine).filter((l) => l.trim().length > 0).join('\n');
}

export function lineToRow(line: string): Row {
  const l = line.trim();
  const low = l.toLowerCase();
  let m: RegExpExecArray | null;
  if (low === 'done' || low === 'not done') return { kind: 'status', value: low };
  if ((m = /^status\.type is (todo|in_progress|on_hold|done|cancelled)$/i.exec(l))) return { kind: 'status', value: m[1]!.toUpperCase() as never };
  if ((m = /^(has|no) (due|scheduled|start|happens|done|created|cancelled) date$/i.exec(l))) return { kind: 'hasDate', field: m[2]!.toLowerCase() as DateFieldSel, has: m[1]!.toLowerCase() === 'has' };
  if ((m = /^(due|scheduled|start|happens|done|created|cancelled)(?: date)? (on or before|on or after|before|after|on|in) (.+)$/i.exec(l))) return { kind: 'date', field: m[1]!.toLowerCase() as DateFieldSel, op: m[2]!.toLowerCase() as DateOp, value: m[3]! };
  if ((m = /^priority (is above|is below|is not|is) (highest|high|medium|none|low|lowest)$/i.exec(l))) return { kind: 'priority', op: m[1]!.toLowerCase() as never, value: m[2]!.toLowerCase() as PriorityName };
  if ((m = /^tags? (include|includes|do not include|does not include) (.+)$/i.exec(l))) return { kind: 'tags', include: !m[1]!.toLowerCase().includes('not'), value: m[2]! };
  if ((m = /^(description|heading|path|folder|filename) (includes|does not include|regex matches|regex does not match) (.+)$/i.exec(l))) return { kind: 'text', field: m[1]!.toLowerCase() as never, op: m[2]!.toLowerCase() as never, value: m[3]! };
  if ((FLAGS as string[]).includes(low)) return { kind: 'flag', value: low as never };
  if ((m = /^sort by ([a-z.]+)( reverse)?$/i.exec(l))) return { kind: 'sort', field: m[1]!.toLowerCase(), reverse: !!m[2] };
  if ((m = /^group by ([a-z. ]+?)( reverse)?$/i.exec(l))) return { kind: 'group', field: m[1]!.toLowerCase().trim(), reverse: !!m[2] };
  if ((m = /^limit (?:to )?(\d+)/i.exec(l))) return { kind: 'limit', value: Number(m[1]) };
  if ((LAYOUTS as string[]).includes(low)) return { kind: 'layout', value: low as never };
  return { kind: 'raw', value: l };
}

export function textToRows(text: string): Row[] {
  return text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith('#')).map(lineToRow);
}
