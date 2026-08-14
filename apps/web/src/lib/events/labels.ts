import type { EventType } from "@prisma/client";

// ── Display labels (server-safe, no client deps) ──────────────────────────

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  CHALLENGE: "Challenge",
  CLINIC: "Clinic",
  COMPETITION: "Competition",
  FUNDRAISER: "Fundraiser",
  MEETUP: "Meetup",
  OPEN_MAT: "Open Mat",
  RETREAT: "Retreat",
  SEMINAR: "Seminar",
  SOCIAL: "Social",
  TOURNAMENT: "Tournament",
  WORKSHOP: "Workshop",
};