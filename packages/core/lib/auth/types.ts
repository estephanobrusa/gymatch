import type {
  Discipline,
  ExperienceLevel,
  FitnessGoal,
  Schedule,
} from "@prisma/client";

export type FitnessProfileInput = {
  disciplines?: Discipline[];
  fitnessGoals?: FitnessGoal[];
  experienceLevel?: ExperienceLevel;
  weeklyFrequency?: number;
  schedules?: Schedule[];
};

export type ActionResult = { success: true } | { error: string };