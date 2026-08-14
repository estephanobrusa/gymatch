"use server";

import { revalidatePath } from "next/cache";
import { prismaAdmin } from "@/lib/auth/admin";
import { resolveAdminUserId } from "@/lib/moderation/actions";
import { WAITLIST_SETTING_KEY } from "@/lib/waitlist/queries";

export type ActionResult = { success: true } | { error: string };

/**
 * Enables or disables the waitlist (admin only).
 *
 * When enabled, brand-new Google signups are added to the waitlist instead of
 * being admitted to the app. Existing users keep their access.
 */
export async function setWaitlistActiveAction(
  active: boolean
): Promise<ActionResult> {
  const adminId = await resolveAdminUserId();
  if (!adminId) return { error: "forbidden" };

  await prismaAdmin.appSetting.upsert({
    where: { key: WAITLIST_SETTING_KEY },
    update: { value: active ? "true" : "false" },
    create: { key: WAITLIST_SETTING_KEY, value: active ? "true" : "false" },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Removes a single waitlist entry (admin only).
 * Useful when the user was manually admitted and no longer needs to wait.
 */
export async function removeWaitlistEntryAction(entryId: string): Promise<void> {
  const adminId = await resolveAdminUserId();
  if (!adminId) throw new Error("forbidden");

  await prismaAdmin.waitlistEntry.delete({
    where: { id: entryId },
  });

  revalidatePath("/dashboard");
}