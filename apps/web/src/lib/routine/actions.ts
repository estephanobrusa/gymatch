"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prismaAdmin } from "@/lib/auth/admin";
import type { WeeklyRoutine } from "@prisma/client";
import type { RoutineInput } from "@gymatch/core";
import { saveRoutine, getRoutine } from "./service";

/**
 * Returns the DB user id for the currently authenticated user.
 * Redirects to /login if unauthenticated or missing from DB.
 */
async function resolveCurrentUserId(): Promise<string> {
  const authUser = await getUser();
  if (!authUser) redirect("/login");

  const dbUser = await prismaAdmin.user.findUnique({
    where: { supabaseId: authUser.id },
    select: { id: true },
  });

  if (!dbUser) redirect("/login");
  return dbUser.id;
}

/**
 * Upserts the WeeklyRoutine for the current user.
 * All 7 days are replaced atomically — pass null for rest/empty days.
 */
export async function saveRoutineAction(data: RoutineInput): Promise<void> {
  const userId = await resolveCurrentUserId();
  await saveRoutine(userId, data);
}

/**
 * Returns the WeeklyRoutine for the current user, or null if none exists.
 */
export async function getRoutineAction(): Promise<WeeklyRoutine | null> {
  const userId = await resolveCurrentUserId();
  return getRoutine(userId);
}
