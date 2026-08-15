import type { MuscleGroup } from "@prisma/client";
import type { DayKey } from "./templates";

export type RoutineInput = Record<DayKey, MuscleGroup | null>;