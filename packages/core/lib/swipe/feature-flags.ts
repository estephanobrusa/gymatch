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

/**
 * `prefix` defaults to "NEXT_PUBLIC_" (web). Any caller running on Expo
 * (mobile) MUST pass "EXPO_PUBLIC_" explicitly, or this silently reads the
 * web-only env var instead and the flag will always evaluate to false on a
 * real Expo build — no error, no warning.
 *
 * ⚠️ Known issue: `packages/core/stores/swipe.store.ts`'s `rewind()` calls
 * `isFeatureEnabled("REWIND")` with no prefix, so on mobile the shared store
 * checks `NEXT_PUBLIC_FEATURE_REWIND` instead of `EXPO_PUBLIC_FEATURE_REWIND`
 * — the rewind button can render (CardStack.tsx correctly passes the Expo
 * prefix for that check) but tapping it does nothing on device. Don't copy
 * this pattern; if you add a new call site shared with mobile, thread the
 * platform prefix all the way down to the actual gate.
 */
export function isFeatureEnabled(
  flag: FeatureFlag,
  prefix: string = FEATURE_FLAG_PREFIX
): boolean {
  return process.env[`${prefix}FEATURE_${flag}`] === "true";
}