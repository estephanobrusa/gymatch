import Link from "next/link";
import { getReportQueue, getResolvedReports } from "@/lib/moderation/queries";
import { ReportReviewCard } from "@/components/admin/ReportReviewCard";

export const metadata = {
  title: "Reports — Admin",
  robots: { index: false, follow: false },
};

const REASON_LABELS: Record<string, string> = {
  FAKE_PROFILE: "Fake profile",
  HARASSMENT: "Harassment",
  SEXUAL_CONTENT: "Sexual content",
  SPAM: "Spam",
  UNDERAGE: "Underage",
  OFFENSIVE_BEHAVIOR: "Offensive behavior",
};

const STATUS_STYLES: Record<string, string> = {
  WARNED: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300",
  BANNED: "bg-destructive/10 text-destructive",
  DISMISSED: "bg-muted text-muted-foreground",
};

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminReportsPage() {
  const [queue, resolved] = await Promise.all([
    getReportQueue(),
    getResolvedReports(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/dashboard"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold mt-1">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {queue.length} pending · {resolved.length} resolved
        </p>
      </div>

      {/* Pending queue */}
      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold">Pending review</h2>
        {queue.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 text-center text-sm text-muted-foreground">
            No pending reports. 🎉
          </div>
        ) : (
          queue.map((report) => (
            <ReportReviewCard key={report.id} report={report} />
          ))
        )}
      </section>

      {/* Case history */}
      {resolved.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Case history</h2>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border">
            {resolved.map((report) => (
              <div key={report.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{report.targetName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {REASON_LABELS[report.reason] ?? report.reason}
                    {report.note ? ` — "${report.note}"` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                      STATUS_STYLES[report.status] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {report.status}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(report.resolvedAt)}
                    {report.resolvedByName ? ` · ${report.resolvedByName}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
