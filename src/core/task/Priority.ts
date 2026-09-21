/** Values are chosen so that a plain string sort orders Highest first (mirrors Obsidian Tasks). */
export enum Priority {
  Highest = '0',
  High = '1',
  Medium = '2',
  None = '3',
  Low = '4',
  Lowest = '5',
}

export const PRIORITY_EMOJI: Readonly<Record<Priority, string>> = {
  [Priority.Highest]: '🔺',
  [Priority.High]: '⏫',
  [Priority.Medium]: '🔼',
  [Priority.None]: '',
  [Priority.Low]: '🔽',
  [Priority.Lowest]: '⏬',
};

/** Names used by the Dataview format (`[priority:: high]`) and by queries (`priority is high`). */
export const PRIORITY_NAME: Readonly<Record<Priority, string>> = {
  [Priority.Highest]: 'highest',
  [Priority.High]: 'high',
  [Priority.Medium]: 'medium',
  [Priority.None]: 'none',
  [Priority.Low]: 'low',
  [Priority.Lowest]: 'lowest',
};

const EMOJI_TO_PRIORITY = new Map<string, Priority>(
  (Object.entries(PRIORITY_EMOJI) as [Priority, string][]).filter(([, e]) => e !== '').map(([p, e]) => [e, p]),
);
const NAME_TO_PRIORITY = new Map<string, Priority>(
  (Object.entries(PRIORITY_NAME) as [Priority, string][]).map(([p, n]) => [n, p]),
);

export function priorityFromEmoji(emoji: string): Priority | undefined {
  return EMOJI_TO_PRIORITY.get(emoji);
}

export function priorityFromName(name: string): Priority | undefined {
  return NAME_TO_PRIORITY.get(name.trim().toLowerCase());
}

/** Numeric value for sorting: Highest = 0 … Lowest = 5. */
export function priorityNumber(priority: Priority): number {
  return Number(priority);
}
