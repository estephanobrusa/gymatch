import { format } from "date-fns";

/**
 * Formats an event start time for display, e.g. "Mon, Aug 18 · 19:00".
 * Server-safe: pure date-fns formatting, no client deps.
 */
export function formatEventDate(date: Date): string {
  return format(date, "EEE, MMM d · HH:mm");
}