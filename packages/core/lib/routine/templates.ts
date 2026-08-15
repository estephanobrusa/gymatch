import type { MuscleGroup } from "@prisma/client";

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export type TemplateName =
  | "PUSH_PULL_LEGS"
  | "BRO_SPLIT"
  | "FULL_BODY_3"
  | "UPPER_LOWER"
  | "ARNOLD_SPLIT"
  | "CUSTOM";

export type RoutineTemplateMap = Record<DayKey, MuscleGroup | null>;

/**
 * Predefined weekly training templates.
 * All templates are starting points — users can freely edit each day after applying.
 */
export const TEMPLATES: Record<TemplateName, RoutineTemplateMap> = {
  PUSH_PULL_LEGS: {
    mon: "CHEST",
    tue: "BACK",
    wed: "LEGS",
    thu: "SHOULDERS",
    fri: "ARMS",
    sat: "FULL_BODY",
    sun: "REST",
  },
  BRO_SPLIT: {
    mon: "CHEST",
    tue: "BACK",
    wed: "LEGS",
    thu: "SHOULDERS",
    fri: "ARMS",
    sat: "CARDIO",
    sun: "REST",
  },
  FULL_BODY_3: {
    mon: "FULL_BODY",
    tue: "REST",
    wed: "FULL_BODY",
    thu: "REST",
    fri: "FULL_BODY",
    sat: "REST",
    sun: "REST",
  },
  UPPER_LOWER: {
    mon: "CHEST",
    tue: "LEGS",
    wed: "BACK",
    thu: "LEGS",
    fri: "ARMS",
    sat: "REST",
    sun: "REST",
  },
  ARNOLD_SPLIT: {
    mon: "CHEST",
    tue: "LEGS",
    wed: "BACK",
    thu: "CHEST",
    fri: "LEGS",
    sat: "BACK",
    sun: "REST",
  },
  CUSTOM: {
    mon: null,
    tue: null,
    wed: null,
    thu: null,
    fri: null,
    sat: null,
    sun: null,
  },
};
