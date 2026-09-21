/**
 * Status sets of popular Obsidian themes, ported from Obsidian Tasks `src/Config/Themes/*`
 * (MIT). Row format: [symbol, name, nextSymbol, type].
 */
import type { StatusConfig } from './Status';
import { StatusType } from './StatusType';

type Row = [string, string, string, keyof typeof StatusType];

const MINIMAL: Row[] = [
  [' ', 'to-do', 'x', 'TODO'], ['/', 'incomplete', 'x', 'IN_PROGRESS'], ['x', 'done', ' ', 'DONE'], ['-', 'canceled', ' ', 'CANCELLED'],
  ['>', 'forwarded', 'x', 'TODO'], ['<', 'scheduling', 'x', 'TODO'], ['?', 'question', 'x', 'TODO'], ['!', 'important', 'x', 'TODO'],
  ['*', 'star', 'x', 'TODO'], ['"', 'quote', 'x', 'TODO'], ['l', 'location', 'x', 'TODO'], ['b', 'bookmark', 'x', 'TODO'],
  ['i', 'information', 'x', 'TODO'], ['S', 'savings', 'x', 'TODO'], ['I', 'idea', 'x', 'TODO'], ['p', 'pros', 'x', 'TODO'],
  ['c', 'cons', 'x', 'TODO'], ['f', 'fire', 'x', 'TODO'], ['k', 'key', 'x', 'TODO'], ['w', 'win', 'x', 'TODO'],
  ['u', 'up', 'x', 'TODO'], ['d', 'down', 'x', 'TODO'],
];

const ITS: Row[] = [
  [' ', 'Unchecked', 'x', 'TODO'], ['x', 'Regular', ' ', 'DONE'], ['X', 'Checked', ' ', 'DONE'], ['-', 'Dropped', ' ', 'CANCELLED'],
  ['>', 'Forward', 'x', 'TODO'], ['<', 'Migrated', 'x', 'TODO'], ['D', 'Date', 'x', 'TODO'], ['?', 'Question', 'x', 'TODO'],
  ['/', 'Half Done', 'x', 'IN_PROGRESS'], ['+', 'Add', 'x', 'TODO'], ['R', 'Research', 'x', 'TODO'], ['!', 'Important', 'x', 'TODO'],
  ['i', 'Idea', 'x', 'TODO'], ['B', 'Brainstorm', 'x', 'TODO'], ['P', 'Pro', 'x', 'TODO'], ['C', 'Con', 'x', 'TODO'],
  ['Q', 'Quote', 'x', 'TODO'], ['N', 'Note', 'x', 'TODO'], ['b', 'Bookmark', 'x', 'TODO'], ['I', 'Information', 'x', 'TODO'],
  ['p', 'Paraphrase', 'x', 'TODO'], ['L', 'Location', 'x', 'TODO'], ['E', 'Example', 'x', 'TODO'], ['A', 'Answer', 'x', 'TODO'],
  ['r', 'Reward', 'x', 'TODO'], ['c', 'Choice', 'x', 'TODO'], ['d', 'Doing', 'x', 'IN_PROGRESS'], ['T', 'Time', 'x', 'TODO'],
  ['@', 'Character / Person', 'x', 'TODO'], ['t', 'Talk', 'x', 'TODO'], ['O', 'Outline / Plot', 'x', 'TODO'], ['~', 'Conflict', 'x', 'TODO'],
  ['W', 'World', 'x', 'TODO'], ['f', 'Clue / Find', 'x', 'TODO'], ['F', 'Foreshadow', 'x', 'TODO'], ['H', 'Favorite / Health', 'x', 'TODO'],
  ['&', 'Symbolism', 'x', 'TODO'], ['s', 'Secret', 'x', 'TODO'],
];

// Things uses the same symbols as Minimal.
const THINGS: Row[] = MINIMAL;

const CORE: Row[] = [[' ', 'Todo', 'x', 'TODO'], ['x', 'Done', ' ', 'DONE'], ['/', 'In Progress', 'x', 'IN_PROGRESS'], ['-', 'Cancelled', ' ', 'CANCELLED']];

export type StatusPresetName = 'core' | 'minimal' | 'its' | 'things';

export const STATUS_PRESETS: Readonly<Record<StatusPresetName, { label: string; rows: readonly Row[] }>> = {
  core: { label: 'Core (default 4 statuses)', rows: CORE },
  minimal: { label: 'Minimal theme', rows: MINIMAL },
  its: { label: 'ITS theme', rows: ITS },
  things: { label: 'Things theme', rows: THINGS },
};

export function presetStatuses(name: StatusPresetName): StatusConfig[] {
  return STATUS_PRESETS[name].rows.map(([symbol, name, nextSymbol, type]) => ({ symbol, name, nextSymbol, type: StatusType[type] }));
}
