import { getUser } from "@/lib/auth";
import { getNotificationsAction, markNotificationsReadAction } from "@/lib/notifications/actions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NotificationsList } from "@/components/notifications/NotificationsList";

/**
 * Notifications screen (V2.1 E).
 *
 * Server component: fetches notifications, marks them as read (best-effort —
 * the fire-and-forget avoids a redirect loop if the action fails), then hands
 * the previews to a client list that handles empty state + links.
 */
export default async function NotificationsPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  const notifications = await getNotificationsAction();

  // Best-effort mark-as-read on open (fire and forget, swallow errors)
  await markNotificationsReadAction().catch(() => {});

  return (
    <div className="flex flex-col min-h-full px-6 py-8 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      <NotificationsList notifications={notifications} />

      <div className="mt-8">
        <Link
          href="/matches"
          className="text-sm text-brand-600 hover:text-brand-700 font-medium"
        >
          ← Back to matches
        </Link>
      </div>
    </div>
  );
}
