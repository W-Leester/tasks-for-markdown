/**
 * Onboarding is counted by distinct days, not by activations: every window and every reload
 * activates the extension, which used up "the first three launches" within minutes (10-07).
 */
export interface OnboardingDays {
  /** How many distinct days the extension has run on so far. */
  days: number;
  /** The last of those days, YYYY-MM-DD (local). */
  lastDay?: string;
}

/** The day number to show today's onboarding for (1 = first day), or null when today was already counted. */
export function onboardingDay(state: OnboardingDays, today: string): { day: number | null; next: OnboardingDays } {
  if (state.lastDay === today) return { day: null, next: state };
  const day = state.days + 1;
  return { day, next: { days: day, lastDay: today } };
}

/**
 * The `tasksmd` install prompt: once a day (the first activation of the day) until the command
 * is installed or the user chose "Don't ask again" — no three-day limit.
 */
export function shouldPromptInstall(state: { lastDay?: string; never?: boolean }, today: string, installed: boolean): boolean {
  return !installed && !state.never && state.lastDay !== today;
}
