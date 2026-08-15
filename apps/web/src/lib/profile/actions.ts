"use server";

import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import type { ScheduleSlotInput } from "@gymatch/core";
import { DayOfWeek } from "@prisma/client";
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
 * Updates the authenticated user's profile fields (partial update).
 * Does NOT redirect — the calling form handles navigation.
 */
export async function updateProfileAction(
  data: ProfileUpdateInput
): Promise<{ success: true } | { error: string }> {
  // Validate age range before hitting the DB
  const ageError = validateAgeRange(data.minAge, data.maxAge);
  if (ageError) return { error: ageError };

  const user = await getUser();
  if (!user) return { error: "Unauthenticated" };

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) return { error: "User not found" };

  await prismaAdmin.user.update({
    where: { id: dbUser.id },
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

/**
 * Adds a new photo to the authenticated user's profile.
 * Enforces a maximum of 6 photos.
 * The new photo is appended at the end (position = current count).
 */
export async function addPhotoAction(
  url: string,
  storagePath: string
): Promise<
  | { success: true; photo: { id: string; url: string; position: number } }
  | { error: string }
> {
  const user = await getUser();
  if (!user) return { error: "Unauthenticated" };

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) return { error: "User not found" };

  const count = await prismaAdmin.userPhoto.count({
    where: { userId: dbUser.id },
  });

  if (count >= 6) return { error: "Maximum 6 photos allowed" };

  const photo = await prismaAdmin.userPhoto.create({
    data: {
      userId: dbUser.id,
      url,
      storagePath,
      position: count,
    },
    select: { id: true, url: true, position: true },
  });

  return { success: true, photo };
}

/**
 * Deletes a photo from the authenticated user's profile.
 * If the photo has a storagePath, it is also removed from Supabase Storage.
 * Remaining photos are re-numbered in position order.
 */
export async function deletePhotoAction(
  photoId: string
): Promise<{ success: true } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Unauthenticated" };

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) return { error: "User not found" };

  const photo = await prismaAdmin.userPhoto.findFirst({
    where: { id: photoId, userId: dbUser.id },
  });

  if (!photo) return { error: "Photo not found or does not belong to you" };

  // Remove from Supabase Storage if a storagePath is recorded
  if (photo.storagePath) {
    const supabase = await createClient();
    await supabase.storage.from("profile-photos").remove([photo.storagePath]);
  }

  // Remove from DB
  await prismaAdmin.userPhoto.delete({ where: { id: photoId } });

  // Re-number remaining photos contiguously starting from 0
  const remaining = await prismaAdmin.userPhoto.findMany({
    where: { userId: dbUser.id },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  await prismaAdmin.$transaction(
    remaining.map((p, index) =>
      prismaAdmin.userPhoto.update({
        where: { id: p.id },
        data: { position: index },
      })
    )
  );

  return { success: true };
}

/**
 * Reorders the authenticated user's photos according to the provided array of IDs.
 * The position of each photo is set to its index in `photoIds`.
 * All IDs must belong to the authenticated user.
 */
export async function reorderPhotosAction(
  photoIds: string[]
): Promise<{ success: true } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Unauthenticated" };

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) return { error: "User not found" };

  const owned = await prismaAdmin.userPhoto.findMany({
    where: { id: { in: photoIds }, userId: dbUser.id },
    select: { id: true },
  });

  if (owned.length !== photoIds.length) {
    return { error: "Some photos do not belong to you" };
  }

  await prismaAdmin.$transaction(
    photoIds.map((id, index) =>
      prismaAdmin.userPhoto.update({
        where: { id },
        data: { position: index },
      })
    )
  );

  return { success: true };
}

/**
 * Pauses or resumes the authenticated user's discovery visibility.
 * When hidden, the user no longer appears in discovery feeds or gym pages,
 * but can still browse and match normally.
 */
export async function setHideProfileAction(
  hidden: boolean
): Promise<{ success: true } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Unauthenticated" };

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) return { error: "User not found" };

  await prismaAdmin.user.update({
    where: { id: dbUser.id },
    data: { hideProfile: hidden },
  });

  return { success: true };
}

/**
 * Enables or disables incognito mode for the authenticated user.
 * In incognito mode, the user can browse without appearing in other users'
 * views, gymbro lists, or event attendee lists.
 */
export async function setIncognitoModeAction(
  incognito: boolean
): Promise<{ success: true } | { error: string }> {
  const user = await getUser();
  if (!user) return { error: "Unauthenticated" };

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) return { error: "User not found" };

  await prismaAdmin.user.update({
    where: { id: dbUser.id },
    data: { incognitoMode: incognito },
  });

  return { success: true };
}

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_VALUES = Object.values(DayOfWeek);

function parseMinutes(time: string): number {
  const parts = time.split(":");
  return Number(parts[0]) * 60 + Number(parts[1]);
}

/**
 * Replaces the authenticated user's weekly training slots wholesale
 * (delete-then-insert inside a transaction).
 * Validates slot shape and time bounds before touching the DB.
 */
export async function updateScheduleSlotsAction(input: {
  slots: ScheduleSlotInput[];
}): Promise<{ success: true } | { error: string }> {
  const { slots } = input;

  if (slots.length > 42) {
    return { error: "Too many schedule slots (max 42)" };
  }

  for (const slot of slots) {
    if (!DAY_VALUES.includes(slot.day)) {
      return { error: "Invalid day" };
    }
    if (!TIME_PATTERN.test(slot.startTime)) {
      return { error: "Invalid startTime, expected HH:mm" };
    }

    const endTime = slot.endTime || null;
    if (endTime !== null) {
      if (!TIME_PATTERN.test(endTime)) {
        return { error: "Invalid endTime, expected HH:mm" };
      }
      if (parseMinutes(endTime) <= parseMinutes(slot.startTime)) {
        return { error: "endTime must be after startTime" };
      }
    }

    const activity = slot.activity.trim();
    if (!activity) {
      return { error: "activity is required" };
    }
    if (activity.length > 40) {
      return { error: "activity must be 40 characters or less" };
    }
  }

  const user = await getUser();
  if (!user) return { error: "Unauthenticated" };

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });
  if (!dbUser) return { error: "User not found" };

  const data = slots.map((slot) => {
    const endTime = slot.endTime || null;
    const gymId = slot.gymId || null;
    return {
      userId: dbUser.id,
      day: slot.day,
      startTime: slot.startTime,
      activity: slot.activity.trim(),
      // exactOptionalPropertyTypes: omit null/undefined optional fields
      ...(endTime !== null && { endTime }),
      ...(gymId !== null && { gymId }),
    };
  });

  await prismaAdmin.$transaction([
    prismaAdmin.scheduleSlot.deleteMany({ where: { userId: dbUser.id } }),
    prismaAdmin.scheduleSlot.createMany({ data }),
  ]);

  return { success: true };
}
