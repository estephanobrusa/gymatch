import type { MuscleGroup } from "@prisma/client";
import { TEMPLATES } from "./templates";
import type { DayKey } from "./templates";

export { TEMPLATES };

export type WeeklyRoutineShape = Record<DayKey, MuscleGroup | null>;

/**
 * Day index map: JS Date.getDay() returns 0=Sun, 1=Mon, ..., 6=Sat
 */
const DAY_INDEX_MAP: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/**
 * Returns the MuscleGroup for the current weekday from the user's routine.
 * Uses the client's local Date.getDay() — caller is responsible for timing.
 *
 * Returns null if the routine has no value for today.
 */
export function getTodayMuscleGroup(routine: WeeklyRoutineShape): MuscleGroup | null {
  const dayIndex = new Date().getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const dayKey = DAY_INDEX_MAP[dayIndex] as DayKey;
  return routine[dayKey] ?? null;
}
