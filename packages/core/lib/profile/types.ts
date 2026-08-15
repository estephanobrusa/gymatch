import type {
  DayOfWeek,
  Discipline,
  ExperienceLevel,
  FitnessGoal,
  Gender,
  LookingFor,
  Schedule,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";

/**
 * Input shape for a single weekly training slot, as submitted by the client.
 * endTime and gymId are optional; null means "not set" (no end time / not at a gym).
 */
export type ScheduleSlotInput = {
  day: DayOfWeek;
  startTime: string;
  endTime?: string | null;
  activity: string;
  gymId?: string | null;
};

/**
 * A stored ScheduleSlot plus the gym name, for display in the edit form.
 */
export type ScheduleSlotWithGym = Prisma.ScheduleSlotGetPayload<{
  include: { gym: { select: { id: true; name: true } } };
}>;

/**
 * ProfileUser is the full shape returned by `getProfileUser`.
 * It is a Prisma select shape — not the raw model — so all relations
 * are included and only the columns the profile feature needs are exposed.
 *
 * Server-side only. Never serialise the full object to a client component;
 * pass only the props each component actually needs.
 */
export type ProfileUser = {
  id: string;
  name: string;
  username: string | null;
  bio: string | null;
  birthDate: Date | null;
  minAge: number;
  maxAge: number;
  city: string | null;
  gender: Gender | null;
  maxDistance: number | null;
  height: number | null; // cm
  weight: number | null; // kg
  weeklyFrequency: number | null;
  experienceLevel: ExperienceLevel | null;
  fitnessGoals: FitnessGoal[];
  disciplines: Discipline[];
  schedule: Schedule[];
  scheduleSlots: ScheduleSlotWithGym[];
  lookingFor: LookingFor[];
  gymId: string | null;
  hideProfile: boolean;
  incognitoMode: boolean;
  gym: {
    id: string;
    name: string;
    address: string | null;
    googlePlaceId: string | null;
    lat: number | null;
    lng: number | null;
  } | null;
  photos: {
    id: string;
    url: string;
    storagePath: string | null;
    position: number;
  }[];
};
