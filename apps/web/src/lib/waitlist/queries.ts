import { prismaAdmin } from "@/lib/auth/admin";

/**
 * Waitlist setting key in the app_settings table.
 * value "true" → waitlist is active (new signups are captured, not admitted).
 */
export const WAITLIST_SETTING_KEY = "waitlist_enabled";

/**
 * Returns whether the waitlist is currently active.
 * Defaults to false when no setting row exists.
 */
export async function isWaitlistActive(): Promise<boolean> {
  const setting = await prismaAdmin.appSetting.findUnique({
    where: { key: WAITLIST_SETTING_KEY },
    select: { value: true },
  });
  return setting?.value === "true";
}

export type WaitlistEntryPreview = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
};

/**
 * Lists waitlist entries, most recent first.
 */
export async function getWaitlistEntries(): Promise<WaitlistEntryPreview[]> {
  const entries = await prismaAdmin.waitlistEntry.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, createdAt: true },
  });
  return entries;
}