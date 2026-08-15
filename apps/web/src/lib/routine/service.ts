import { prismaAdmin } from "@/lib/auth/admin";
import type { WeeklyRoutine } from "@prisma/client";
import type { RoutineInput } from "@gymatch/core";

/**
 * Upserts the WeeklyRoutine for a user.
 * All 7 days are replaced atomically — pass null for rest/empty days.
 *
 * Shared by the server action (saveRoutineAction) and the REST handler
 * (POST /api/v1/routine).
 */
export async function saveRoutine(userId: string, data: RoutineInput): Promise<void> {
  const payload = {
    mon: data.mon,
    tue: data.tue,
    wed: data.wed,
    thu: data.thu,
    fri: data.fri,
    sat: data.sat,
    sun: data.sun,
  };

  await prismaAdmin.weeklyRoutine.upsert({
    where: { userId },
    create: { userId, ...payload },
    update: payload,
  });
}

/**
 * Returns the WeeklyRoutine for a user, or null if none exists.
 *
 * Shared by the server action (getRoutineAction) and the REST handler
 * (GET /api/v1/routine).
 */
export async function getRoutine(userId: string): Promise<WeeklyRoutine | null> {
  return prismaAdmin.weeklyRoutine.findUnique({
    where: { userId },
  });
}