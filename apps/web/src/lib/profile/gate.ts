import type { FitnessGoal } from "@prisma/client";

/**
 * Determines whether a user has completed enough of their profile to
 * access the swipe deck.
 *
 * Gate criteria (spec: profile-completion-gate):
 *   - gymId must be set (not null)
 *   - at least one FitnessGoal selected
 *
 * Gender is intentionally NOT required — omitting it must never block access.
 */
export function isSwipeReady(
  user: Pick<{ gymId: string | null; fitnessGoals: FitnessGoal[] }, "gymId" | "fitnessGoals">
): boolean {
  return user.gymId !== null && user.fitnessGoals.length >= 1;
}
