/** Semantic category of a status symbol. Behaviour (done dates, recurrence) keys off the type, not the symbol. */
export enum StatusType {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  ON_HOLD = 'ON_HOLD',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
  NON_TASK = 'NON_TASK',
}

export const ALL_STATUS_TYPES: readonly StatusType[] = Object.values(StatusType);

export function isStatusType(value: unknown): value is StatusType {
  return typeof value === 'string' && (ALL_STATUS_TYPES as string[]).includes(value);
}
