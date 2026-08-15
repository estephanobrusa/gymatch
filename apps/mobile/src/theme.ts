/**
 * Shared color palette for the mobile app.
 *
 * Mirrors the web's design tokens: brand-500 `#f43f5e` is the primary coral,
 * and the neutrals follow the existing dark mobile theme (bg `#0a0a0a`,
 * surfaces `#18181b`).
 */
export const colors = {
  background: "#0a0a0a",
  surface: "#18181b",
  border: "#27272a",
  primary: "#f43f5e",
  primaryDark: "#e11d48",
  primarySoft: "#4c0519",
  text: "#fafafa",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  destructive: "#f87171",
  success: "#34d399",
  white: "#ffffff",
} as const;