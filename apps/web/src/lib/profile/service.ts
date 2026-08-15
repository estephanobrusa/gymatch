import { prismaAdmin } from "@/lib/auth/admin";
import type {
  Discipline,
  ExperienceLevel,
  FitnessGoal,
  Schedule,
} from "@prisma/client";

export type ProfileUpdateInput = {
  bio?: string;
  disciplines?: Discipline[];
  fitnessGoals?: FitnessGoal[];
  experienceLevel?: ExperienceLevel;
  weeklyFrequency?: number;
  schedule?: Schedule[];
  minAge?: number;
  maxAge?: number;
};

/**
 * Validates the age range fields when present.
 * Returns an error string if invalid, or null if valid.
 */
function validateAgeRange(
  minAge: number | undefined,
  maxAge: number | undefined
): string | null {
  if (minAge === undefined && maxAge === undefined) return null;

  const resolvedMin = minAge ?? 18;
  const resolvedMax = maxAge ?? 50;

  if (minAge !== undefined && minAge < 18) {
    return "minAge must be at least 18";
  }
  if (maxAge !== undefined && maxAge > 99) {
    return "maxAge must be at most 99";
  }
  if (resolvedMin >= resolvedMax) {
    return "minAge must be less than maxAge";
  }

  return null;
}

/**
 * Updates a user's profile fields (partial update).
 * Validates the age range before touching the DB.
 *
 * Shared by the server action (updateProfileAction) and the REST handler
 * (POST /api/v1/profile).
 */
export async function updateProfile(
  userId: string,
  data: ProfileUpdateInput
): Promise<{ success: true } | { error: string }> {
  // Validate age range before hitting the DB
  const ageError = validateAgeRange(data.minAge, data.maxAge);
  if (ageError) return { error: ageError };

  await prismaAdmin.user.update({
    where: { id: userId },
    data: {
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.disciplines !== undefined && { disciplines: { set: data.disciplines } }),
      ...(data.fitnessGoals !== undefined && { fitnessGoals: { set: data.fitnessGoals } }),
      ...(data.experienceLevel !== undefined && { experienceLevel: data.experienceLevel }),
      ...(data.weeklyFrequency !== undefined && { weeklyFrequency: data.weeklyFrequency }),
      ...(data.schedule !== undefined && { schedule: { set: data.schedule } }),
      ...(data.minAge !== undefined && { minAge: data.minAge }),
      ...(data.maxAge !== undefined && { maxAge: data.maxAge }),
    },
  });

  return { success: true };
}