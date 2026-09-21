import { Query, type InstructionParser } from './Query';
import type { LayoutElement } from './types';

const ELEMENTS: LayoutElement[] = [
  'priority', 'due date', 'scheduled date', 'start date', 'created date', 'done date', 'cancelled date',
  'recurrence rule', 'on completion', 'id', 'depends on', 'tags', 'backlink', 'edit button', 'postpone button',
  'urgency', 'task count', 'tree',
];

/** `hide|show <element>`, `short mode`, `full mode`, `explain`, `hide nested backlink`, `limit …`. */
export const layoutParser: InstructionParser = (line, query) => {
  const l = line.toLowerCase();
  if (l === 'short mode' || l === 'short') { query.layout.shortMode = true; return 'handled'; }
  if (l === 'full mode' || l === 'full') { query.layout.shortMode = false; return 'handled'; }
  if (l === 'explain') { query.layout.explain = true; return 'handled'; }
  if (l === 'hide nested backlink') { query.layout.hideNestedBacklink = true; return 'handled'; }
  const hs = /^(hide|show) (.+)$/.exec(l);
  if (hs) {
    const el = hs[2]!.trim() as LayoutElement;
    if (!ELEMENTS.includes(el)) throw new Error(`Unknown layout element "${hs[2]}". Known: ${ELEMENTS.join(', ')}`);
    if (hs[1] === 'hide') query.layout.hidden.add(el);
    else query.layout.hidden.delete(el);
    return 'handled';
  }
  const lim = /^limit (?:to )?(\d+)(?: tasks?)?$/.exec(l);
  if (lim) { query.limit = Number(lim[1]); return 'handled'; }
  const glim = /^limit groups (?:to )?(\d+)(?: groups?)?$/.exec(l);
  if (glim) { query.groupLimit = Number(glim[1]); return 'handled'; }
  return null;
};

export function registerLayout(): void {
  Query.parsers.push(layoutParser);
}
