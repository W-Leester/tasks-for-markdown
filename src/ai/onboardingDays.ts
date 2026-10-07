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
 * The `tasksmd` install and the AI-connect prompts: on every activation (reload, restart, new
 * window) while still needed, until the user chooses "Don't ask again" (10-08 decision).
 */
export function shouldPrompt(state: { never?: boolean }, needed: boolean): boolean {
  return needed && !state.never;
}
