import { describe, it, expect } from "vitest";
import { computeAge, passesAgeFilter } from "../age-filter";

// ── computeAge ────────────────────────────────────────────────────────────

describe("computeAge", () => {
  it("returns null when birthDate is null", () => {
    expect(computeAge(null)).toBeNull();
  });

  it("returns full years elapsed for a past birth date", () => {
    // Someone born exactly 30 years ago today should be 30
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
    expect(computeAge(thirtyYearsAgo)).toBe(30);
  });

  it("returns 0 for someone born today", () => {
    expect(computeAge(new Date())).toBe(0);
  });

  it("does not count the birthday until it has actually passed", () => {
    // Born 25 years ago + 1 day in the future = still 24
    const almostTwentyFive = new Date();
    almostTwentyFive.setFullYear(almostTwentyFive.getFullYear() - 25);
    almostTwentyFive.setDate(almostTwentyFive.getDate() + 1); // birthday tomorrow
    expect(computeAge(almostTwentyFive)).toBe(24);
  });
});

// ── passesAgeFilter ───────────────────────────────────────────────────────

describe("passesAgeFilter", () => {
  // Both in range — bidirectional overlap
  it("returns true when both viewer and candidate are within each other's range", () => {
    // viewer: 30yo, wants 25-40; candidate: 28yo, wants 20-35
    // viewer (30) is within candidate's range [20, 35] ✓
    // candidate (28) is within viewer's range [25, 40] ✓
    expect(passesAgeFilter(30, 28, 25, 40, 20, 35)).toBe(true);
  });

  // Candidate too old for viewer
  it("returns false when candidate age exceeds viewer maxAge", () => {
    // viewer: 25yo, wants 18-30; candidate: 45yo → 45 > 30 → fail
    expect(passesAgeFilter(25, 45, 18, 30, 18, 50)).toBe(false);
  });

  // Viewer too old for candidate (bidirectional check)
  it("returns false when viewer age exceeds candidate maxAge", () => {
    // viewer: 50yo, wants 18-60; candidate: 25yo, wants 18-35 → viewer (50) > 35 → fail
    expect(passesAgeFilter(50, 25, 18, 60, 18, 35)).toBe(false);
  });

  // Candidate too young for viewer
  it("returns false when candidate age is below viewer minAge", () => {
    // viewer: 40yo, wants 35-50; candidate: 20yo → 20 < 35 → fail
    expect(passesAgeFilter(40, 20, 35, 50, 18, 50)).toBe(false);
  });

  // Viewer too young for candidate (bidirectional check)
  it("returns false when viewer age is below candidate minAge", () => {
    // viewer: 20yo, wants 18-50; candidate: 30yo, wants 28-40 → viewer (20) < 28 → fail
    expect(passesAgeFilter(20, 30, 18, 50, 28, 40)).toBe(false);
  });

  // Null viewer age — permissive
  it("returns true when viewer age is null (null birthDate)", () => {
    expect(passesAgeFilter(null, 30, 18, 50, 18, 50)).toBe(true);
  });

  // Null candidate age — permissive
  it("returns true when candidate age is null (null birthDate)", () => {
    expect(passesAgeFilter(30, null, 18, 50, 18, 50)).toBe(true);
  });

  // Both null
  it("returns true when both ages are null", () => {
    expect(passesAgeFilter(null, null, 18, 50, 18, 50)).toBe(true);
  });
});
