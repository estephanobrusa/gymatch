import { prismaAdmin } from "@/lib/auth/admin";

/**
 * The first incomplete onboarding step for the given user, or null when fully
 * complete.  Used by both the callback route and the protected layout gate.
 *
 * Step order matches the onboarding flow:
 *   1. username   → /onboarding/username
 *   2. birthDate  → /onboarding/birthdate
 *   3. photo      → /onboarding/photo
 *   4. fitness    → /onboarding/fitness   (gated: onboardingVersion >= 2)
 *   5. routine    → /onboarding/routine   (gated: onboardingVersion >= 2)
 *   null          → onboarding complete
 *
 * Completion rule: username + birthDate + at least 1 photo.
 * Steps 4 and 5 are gated behind onboardingVersion >= 2.
 * Existing users have onboardingVersion = 1 by default — NOT blocked.
 * Future activation: set onboardingVersion = 2 per-user to enable steps 4/5.
 */
export type OnboardingStatus =
  | "/onboarding/username"
  | "/onboarding/birthdate"
  | "/onboarding/photo"
  | "/onboarding/fitness"
  | "/onboarding/routine"
  | null;

export async function getOnboardingStatus(
  supabaseId: string
): Promise<OnboardingStatus> {
  const user = await prismaAdmin.user.findUnique({
    where: { supabaseId },
    include: {
      photos: true,
      weeklyRoutine: true,
    },
  });

  // User not yet synced — treat as needing full onboarding
  if (!user) return "/onboarding/username";

  if (!user.username) return "/onboarding/username";
  if (!user.birthDate) return "/onboarding/birthdate";
  if (user.photos.length === 0) return "/onboarding/photo";

  // Steps 4 (fitness) and 5 (routine) are enabled for onboardingVersion >= 2.
  // Default is 1, so all existing/new users skip these steps until activated.
  const version = user.onboardingVersion ?? 1;
  if (version >= 2) {
    const hasFitnessData =
      user.weeklyFrequency !== null ||
      user.disciplines.length > 0 ||
      user.fitnessGoals.length > 0;
    if (!hasFitnessData) return "/onboarding/fitness";
    if (!user.weeklyRoutine) return "/onboarding/routine";
  }

  return null;
}
