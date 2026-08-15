/**
 * Feature flag helpers.
 *
 * Flags are read from `<prefix>FEATURE_*` env vars so they are readable on
 * both client and server bundles. A flag is enabled ONLY when the env var
 * value is exactly the string "true". Any other value (undefined, "false",
 * "yes", empty string…) is treated as disabled.
 *
 * The env-var prefix is configurable per platform:
 * - web (Next.js): "NEXT_PUBLIC_" (default, matches the historical behavior)
 * - mobile (Expo): "EXPO_PUBLIC_"
 *
 * NOTE: Next.js inlines NEXT_PUBLIC_* at build time; Expo/Metro inlines
 * EXPO_PUBLIC_* statically. RN consumers should pass the matching prefix.
 */

export type FeatureFlag = "SUPER_LIKE" | "REWIND" | "UNLIMITED_LIKES";

export const FEATURE_FLAG_PREFIX = "NEXT_PUBLIC_";

export function isFeatureEnabled(
  flag: FeatureFlag,
  prefix: string = FEATURE_FLAG_PREFIX
): boolean {
  return process.env[`${prefix}FEATURE_${flag}`] === "true";
}