import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * Unit tests for getTodayMuscleGroup utility.
 *
 * Strategy: mock Date to control which day is "today".
 * JS Date.getDay() → 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 */

// ── Types ─────────────────────────────────────────────────────────────────
type MuscleGroup = "CHEST" | "BACK" | "LEGS" | "SHOULDERS" | "ARMS" | "FULL_BODY" | "CARDIO" | "WOD" | "REST";

type WeeklyRoutineShape = {
  mon: MuscleGroup | null;
  tue: MuscleGroup | null;
  wed: MuscleGroup | null;
  thu: MuscleGroup | null;
  fri: MuscleGroup | null;
  sat: MuscleGroup | null;
  sun: MuscleGroup | null;
};

// Import after mocks are registered
import { getTodayMuscleGroup, TEMPLATES } from "./utils";

afterEach(() => {
  vi.restoreAllMocks();
});

const fullRoutine: WeeklyRoutineShape = {
  mon: "CHEST",
  tue: "BACK",
  wed: "LEGS",
  thu: "SHOULDERS",
  fri: "ARMS",
  sat: "FULL_BODY",
  sun: "REST",
};

// Helper to mock Date.getDay to return a specific day index
function mockDay(dayIndex: number) {
  vi.spyOn(Date.prototype, "getDay").mockReturnValue(dayIndex);
}

// ─────────────────────────────────────────────────────────────────────────
// getTodayMuscleGroup — all 7 weekdays
// ─────────────────────────────────────────────────────────────────────────
describe("getTodayMuscleGroup", () => {
  it("returns sun muscle group when getDay() === 0 (Sunday)", () => {
    mockDay(0);
    const result = getTodayMuscleGroup(fullRoutine);
    expect(result).toBe("REST");
  });

  it("returns mon muscle group when getDay() === 1 (Monday)", () => {
    mockDay(1);
    const result = getTodayMuscleGroup(fullRoutine);
    expect(result).toBe("CHEST");
  });

  it("returns tue muscle group when getDay() === 2 (Tuesday)", () => {
    mockDay(2);
    const result = getTodayMuscleGroup(fullRoutine);
    expect(result).toBe("BACK");
  });

  it("returns wed muscle group when getDay() === 3 (Wednesday)", () => {
    mockDay(3);
    const result = getTodayMuscleGroup(fullRoutine);
    expect(result).toBe("LEGS");
  });

  it("returns thu muscle group when getDay() === 4 (Thursday)", () => {
    mockDay(4);
    const result = getTodayMuscleGroup(fullRoutine);
    expect(result).toBe("SHOULDERS");
  });

  it("returns fri muscle group when getDay() === 5 (Friday)", () => {
    mockDay(5);
    const result = getTodayMuscleGroup(fullRoutine);
    expect(result).toBe("ARMS");
  });

  it("returns sat muscle group when getDay() === 6 (Saturday)", () => {
    mockDay(6);
    const result = getTodayMuscleGroup(fullRoutine);
    expect(result).toBe("FULL_BODY");
  });

  it("returns null when the routine field for today is null", () => {
    mockDay(1); // Monday
    const partialRoutine: WeeklyRoutineShape = {
      ...fullRoutine,
      mon: null,
    };
    const result = getTodayMuscleGroup(partialRoutine);
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// TEMPLATES constant — shape validation
// ─────────────────────────────────────────────────────────────────────────
describe("TEMPLATES", () => {
  const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const VALID_MUSCLE_GROUPS: MuscleGroup[] = [
    "CHEST", "BACK", "LEGS", "SHOULDERS", "ARMS", "FULL_BODY", "CARDIO", "WOD", "REST",
  ];

  it("exports PUSH_PULL_LEGS template with all 7 day keys", () => {
    const template = TEMPLATES.PUSH_PULL_LEGS;
    for (const day of DAY_KEYS) {
      expect(day in template).toBe(true);
    }
  });

  it("PUSH_PULL_LEGS template maps mon to CHEST and sun to REST", () => {
    expect(TEMPLATES.PUSH_PULL_LEGS.mon).toBe("CHEST");
    expect(TEMPLATES.PUSH_PULL_LEGS.sun).toBe("REST");
  });

  it("exports CUSTOM template with all days set to null", () => {
    const template = TEMPLATES.CUSTOM;
    for (const day of DAY_KEYS) {
      expect(template[day]).toBeNull();
    }
  });

  it("all template values are valid MuscleGroup values or null", () => {
    const templateNames = Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>;
    for (const name of templateNames) {
      const template = TEMPLATES[name];
      for (const day of DAY_KEYS) {
        const value = template[day];
        if (value !== null) {
          expect(VALID_MUSCLE_GROUPS).toContain(value);
        }
      }
    }
  });

  it("exports at least 5 templates including CUSTOM", () => {
    const names = Object.keys(TEMPLATES);
    expect(names.length).toBeGreaterThanOrEqual(5);
    expect(names).toContain("CUSTOM");
  });
});
