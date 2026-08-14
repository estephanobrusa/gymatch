import { describe, expect, it } from "vitest";
import { isSwipeReady } from "./gate";

/**
 * Unit tests for isSwipeReady.
 * Covers all four spec scenarios from profile-completion-gate capability.
 */
describe("isSwipeReady", () => {
  it("returns true when gymId is set and at least one fitnessGoal is selected", () => {
    // Scenario: Ready
    expect(
      isSwipeReady({ gymId: "gym-1", fitnessGoals: ["MUSCLE_GAIN"] })
    ).toBe(true);
  });

  it("returns false when gymId is null (gym not selected)", () => {
    // Scenario: Missing gym
    expect(
      isSwipeReady({ gymId: null, fitnessGoals: ["ENDURANCE"] })
    ).toBe(false);
  });

  it("returns false when fitnessGoals is empty (no goals selected)", () => {
    // Scenario: Missing goals
    expect(
      isSwipeReady({ gymId: "gym-1", fitnessGoals: [] })
    ).toBe(false);
  });

  it("returns true when gender is absent but gymId and fitnessGoals are set", () => {
    // Scenario: Gender absence does not block
    // (gender is not even a parameter of isSwipeReady — this confirms the contract)
    expect(
      isSwipeReady({ gymId: "gym-1", fitnessGoals: ["STRENGTH", "GENERAL_FITNESS"] })
    ).toBe(true);
  });
});
