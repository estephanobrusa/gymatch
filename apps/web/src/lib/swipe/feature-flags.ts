/**
 * Feature flag helpers.
 *
 * Flags are read from NEXT_PUBLIC_FEATURE_* env vars so they are readable
 * on both client and server bundles. A flag is enabled ONLY when the env var
 * value is exactly the string "true". Any other value (undefined, "false",
 * "yes", empty string…) is treated as disabled.
 */

export type FeatureFlag = "SUPER_LIKE" | "REWIND" | "UNLIMITED_LIKES";

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return process.env[`NEXT_PUBLIC_FEATURE_${flag}`] === "true";
}
