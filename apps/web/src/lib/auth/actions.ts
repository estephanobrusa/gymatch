"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import type { Schedule } from "@prisma/client";
import type { FitnessProfileInput, ActionResult } from "@gymatch/core";

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Updates the username for the currently authenticated user.
 *
 * Validates:
 *   - User must be authenticated
 *   - 3–30 characters, alphanumeric + underscores only
 *   - Username must be unique (database-level constraint)
 *
 * On success: redirects to /onboarding/birthdate
 */
export async function updateUsername(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/login");

  const username = (formData.get("username") as string | null)?.trim() ?? "";

  if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    throw new Error(
      "Username must be 3–30 characters and contain only letters, numbers, and underscores."
    );
  }

  await prismaAdmin.user.update({
    where: { supabaseId: user.id },
    data: { username },
  });

  redirect("/onboarding/birthdate");
}

/**
 * Updates the birth date for the currently authenticated user.
 *
 * Validates:
 *   - User must be authenticated
 *   - Valid date string (YYYY-MM-DD)
 *   - User must be at least 18 years old
 *
 * On success: redirects to /onboarding/photo
 */
export async function updateBirthDate(formData: FormData): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/login");

  const raw = (formData.get("birthDate") as string | null)?.trim() ?? "";

  if (!raw) {
    throw new Error("Birth date is required.");
  }

  const birthDate = new Date(raw);

  if (isNaN(birthDate.getTime())) {
    throw new Error("Invalid date.");
  }

  const today = new Date();
  const minAge = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

  if (birthDate > minAge) {
    throw new Error("You must be at least 18 years old to use Gymatch.");
  }

  await prismaAdmin.user.update({
    where: { supabaseId: user.id },
    data: { birthDate },
  });

  redirect("/onboarding/photo");
}

/**
 * Saves a photo URL to the user's profile.
 *
 * Called by the PhotoUploader client component after it has uploaded the file
 * to Supabase Storage and obtained the public URL.
 *
 * Validates:
 *   - User must be authenticated
 *   - photoUrl must be a non-empty string
 *
 * On success: redirects to /
 */
export async function savePhotoUrl(photoUrl: string): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/login");

  if (!photoUrl || typeof photoUrl !== "string") {
    throw new Error("A valid photo URL is required.");
  }

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: user.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/login");

  await prismaAdmin.userPhoto.create({
    data: {
      userId: dbUser.id,
      url: photoUrl,
      position: 0,
    },
  });

  redirect("/");
}

/**
 * Saves the fitness profile fields for the currently authenticated user.
 * All fields are optional — call with partial data for partial updates.
 *
 * On success: redirects to /onboarding/routine
 */
export async function saveFitnessProfileAction(data: FitnessProfileInput): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/login");

  await prismaAdmin.user.update({
    where: { supabaseId: user.id },
    data: {
      ...(data.disciplines !== undefined && { disciplines: { set: data.disciplines } }),
      ...(data.fitnessGoals !== undefined && { fitnessGoals: { set: data.fitnessGoals } }),
      ...(data.experienceLevel !== undefined && { experienceLevel: data.experienceLevel }),
      ...(data.weeklyFrequency !== undefined && { weeklyFrequency: data.weeklyFrequency }),
      ...(data.schedules !== undefined && { schedule: { set: data.schedules } }),
    },
  });

  redirect("/onboarding/routine");
}

/**
 * Saves the schedule preference for the current user.
 * Called as the final step of the routine onboarding page.
 *
 * On success: redirects to /
 */
export async function saveScheduleAction(schedule: Schedule[]): Promise<void> {
  const user = await getUser();
  if (!user) redirect("/login");

  await prismaAdmin.user.update({
    where: { supabaseId: user.id },
    data: { schedule: { set: schedule } },
  });

  redirect("/");
}

/**
 * Permanently deletes the current user's account.
 *
 * Deletes the Prisma User row — cascade rules remove photos, swipes, matches,
 * conversations, messages, blocks, and reports. Then signs out of the session.
 *
 * NOTE: The Supabase auth user row itself is NOT deleted (requires the
 * service-role key via `supabase.auth.admin.deleteUser`), which is out of
 * scope for this task. All app data is gone; the auth record becomes inert.
 *
 * Returns a structured ActionResult (no redirect) so the client can show
 * success/error feedback without navigating away.
 */
export async function deleteAccountAction(): Promise<ActionResult> {
  const user = await getUser();
  if (!user) return { error: "auth" };

  try {
    await prismaAdmin.user.delete({
      where: { supabaseId: user.id },
    });

    const supabase = await createClient();
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error("deleteAccountAction failed:", error);
    return { error: "failed" };
  }
}
