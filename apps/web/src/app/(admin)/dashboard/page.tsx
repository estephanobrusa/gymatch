import { prismaAdmin } from "@/lib/auth/admin";
import { BroadcastForm } from "@/components/admin/BroadcastForm";
import { WaitlistToggle } from "@/components/admin/WaitlistToggle";
import { getPendingReportCount } from "@/lib/moderation/queries";
import { getPendingAppeals } from "@/lib/moderation/queries";
import {
  isWaitlistActive,
  getWaitlistEntries,
} from "@/lib/waitlist/queries";
import { removeWaitlistEntryAction } from "@/lib/waitlist/actions";

export const metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export default async function AdminDashboardPage() {

  const [totalUsers, totalSubscriptions, pendingReports, pendingAppeals, waitlistActive, waitlistEntries] =
    await Promise.all([
      prismaAdmin.user.count(),
      prismaAdmin.pushSubscription.count(),
      getPendingReportCount(),
      getPendingAppeals().then((a) => a.length),
      isWaitlistActive(),
      getWaitlistEntries(),
    ]);

  const reachableUsers = await prismaAdmin.pushSubscription
    .findMany({ select: { userId: true }, distinct: ["userId"] })
    .then((r) => r.length);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total users", value: totalUsers },
          { label: "Push subscriptions", value: totalSubscriptions },
          { label: "Reachable users", value: reachableUsers },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-card rounded-2xl border border-border p-4 text-center"
          >
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Moderation queue */}
      <a
        href="/reports"
        className="bg-card rounded-2xl border border-border p-6 flex items-center justify-between hover:border-brand-500 transition-colors"
      >
        <div>
          <h2 className="text-base font-semibold">Moderation queue</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review user reports and decide.
          </p>
        </div>
        {pendingReports > 0 ? (
          <span className="shrink-0 px-2.5 py-1 text-sm font-bold rounded-full bg-destructive/10 text-destructive">
            {pendingReports} pending
          </span>
        ) : (
          <span className="shrink-0 px-2.5 py-1 text-sm font-medium rounded-full bg-muted text-muted-foreground">
            All clear
          </span>
        )}
      </a>

      {/* Appeals queue */}
      <a
        href="/appeals"
        className="bg-card rounded-2xl border border-border p-6 flex items-center justify-between hover:border-brand-500 transition-colors"
      >
        <div>
          <h2 className="text-base font-semibold">Appeals</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review banned-user appeals and restore accounts.
          </p>
        </div>
        {pendingAppeals > 0 ? (
          <span className="shrink-0 px-2.5 py-1 text-sm font-bold rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            {pendingAppeals} pending
          </span>
        ) : (
          <span className="shrink-0 px-2.5 py-1 text-sm font-medium rounded-full bg-muted text-muted-foreground">
            All clear
          </span>
        )}
      </a>

      {/* Broadcast form */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-base font-semibold mb-1">Send push notification</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Sends to all {reachableUsers} users with push enabled.
        </p>
        <BroadcastForm reachableUsers={reachableUsers} />
      </div>

      {/* Waitlist */}
      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-base font-semibold mb-1">Waitlist</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Capture new signups when the app is not open yet. Existing users keep
          their access while the waitlist is active.
        </p>
        <WaitlistToggle initiallyActive={waitlistActive} />

        {waitlistEntries.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium mb-2">
              {waitlistEntries.length}{" "}
              {waitlistEntries.length === 1 ? "person" : "people"} waiting
            </p>
            <ul className="flex flex-col gap-2">
              {waitlistEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.name ?? "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.email} ·{" "}
                      {entry.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <form action={removeWaitlistEntryAction.bind(null, entry.id)}>
                    <button
                      type="submit"
                      className="shrink-0 px-2.5 py-1 text-xs font-medium rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
