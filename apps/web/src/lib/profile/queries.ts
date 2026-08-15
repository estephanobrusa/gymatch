import { prismaAdmin } from "@/lib/auth/admin";
import type { ProfileUser } from "@gymatch/core";

/**
 * Fetches the full profile shape for a user identified by their Supabase auth ID.
 * Returns null if the user has not yet been synced to the DB.
 *
 * Uses prismaAdmin (service-role connection, bypasses RLS).
 * MUST be called only from server-side code (Server Components, Server Actions).
 */
export async function getProfileUser(
  supabaseId: string
): Promise<ProfileUser | null> {
  return prismaAdmin.user.findUnique({
    where: { supabaseId },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      birthDate: true,
      minAge: true,
      maxAge: true,
      city: true,
      gender: true,
      maxDistance: true,
      height: true,
      weight: true,
      weeklyFrequency: true,
      experienceLevel: true,
      fitnessGoals: true,
      disciplines: true,
      schedule: true,
      scheduleSlots: {
        include: { gym: { select: { id: true, name: true } } },
      },
      lookingFor: true,
      gymId: true,
      hideProfile: true,
      incognitoMode: true,
      gym: {
        select: {
          id: true,
          name: true,
          address: true,
          googlePlaceId: true,
          lat: true,
          lng: true,
        },
      },
      photos: {
        select: {
          id: true,
          url: true,
          storagePath: true,
          position: true,
        },
        orderBy: { position: "asc" },
      },
    },
  });
}
