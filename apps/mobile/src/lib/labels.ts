import { DISCIPLINE_LABELS as CORE_DISCIPLINE_LABELS } from "@gymatch/core";

/**
 * Human-readable labels for the enum-ish card fields. Mirrors the label maps
 * used by the web (apps/web/src/components/swipe/ProfileDrawer.tsx) so the
 * mobile UI stays consistent.
 */

export const DISCIPLINE_LABELS: Record<string, string> = {
  ...CORE_DISCIPLINE_LABELS,
  GYM: "Gym",
};

export const GOAL_LABELS: Record<string, string> = {
  MUSCLE_GAIN: "Gain Muscle",
  FAT_LOSS: "Lose Weight",
  STRENGTH: "Strength",
  ENDURANCE: "Endurance",
  FLEXIBILITY: "Flexibility",
  GENERAL_FITNESS: "General Fitness",
  COMPETE: "Compete",
};

export const EXP_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  EXPERT: "Expert",
};