import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isFeatureEnabled } from "./feature-flags";

/**
 * Unit tests for isFeatureEnabled.
 * The helper reads NEXT_PUBLIC_FEATURE_* env vars and returns true ONLY
 * when the value is exactly the string "true". All other values → false.
 */
describe("isFeatureEnabled", () => {
  const FLAG = "SUPER_LIKE";
  const ENV_KEY = `NEXT_PUBLIC_FEATURE_${FLAG}`;

  // Save/restore original env value around each test
  let original: string | undefined;
  beforeEach(() => {
    original = process.env[ENV_KEY];
  });
  afterEach(() => {
    if (original === undefined) {
      delete process.env[ENV_KEY];
    } else {
      process.env[ENV_KEY] = original;
    }
  });

  it('returns false when the env var is not set (undefined)', () => {
    delete process.env[ENV_KEY];
    expect(isFeatureEnabled("SUPER_LIKE")).toBe(false);
  });

  it('returns false when the env var is "false"', () => {
    process.env[ENV_KEY] = "false";
    expect(isFeatureEnabled("SUPER_LIKE")).toBe(false);
  });

  it('returns false when the env var has a malformed value like "yes"', () => {
    process.env[ENV_KEY] = "yes";
    expect(isFeatureEnabled("SUPER_LIKE")).toBe(false);
  });

  it('returns true when the env var is exactly "true"', () => {
    process.env[ENV_KEY] = "true";
    expect(isFeatureEnabled("SUPER_LIKE")).toBe(true);
  });
});
