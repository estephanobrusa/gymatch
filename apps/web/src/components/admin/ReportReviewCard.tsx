"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewReportAction } from "@/lib/moderation/actions";
import type { ReportQueueItem } from "@/lib/moderation/queries";

const REASON_LABELS: Record<string, string> = {
  FAKE_PROFILE: "Fake profile",
  HARASSMENT: "Harassment",
  SEXUAL_CONTENT: "Sexual content",
  SPAM: "Spam",
  UNDERAGE: "Underage",
  OFFENSIVE_BEHAVIOR: "Offensive behavior",
};

interface Props {
  report: ReportQueueItem;
}

export function ReportReviewCard({ report }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<null | "WARN" | "BAN" | "DISMISS">(null);
  const [confirmBan, setConfirmBan] = useState(false);

  const { target } = report;

  async function handleDecision(decision: "WARN" | "BAN" | "DISMISS") {
    if (decision === "BAN" && !confirmBan) {
      setConfirmBan(true);
      return;
    }

    setLoading(decision);
    const result = await reviewReportAction(report.id, decision, note);
    setLoading(null);

    if ("error" in result) {
      toast.error(
        result.error === "already_reviewed"
          ? "This report was already reviewed"
          : result.error === "forbidden"
          ? "Admin access required"
          : "Something went wrong"
      );
      return;
    }

    toast.success(
      decision === "BAN"
        ? `${target.name} was banned`
        : decision === "WARN"
        ? `${target.name} was warned`
        : "Report dismissed"
    );
    router.refresh();
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        {/* Target profile */}
        <div className="flex items-center gap-3 min-w-0">
          {target.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={target.photoUrl}
              alt={target.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
              {target.name[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">
              {target.name}
              {target.bannedAt && (
                <span className="ml-2 text-xs font-medium text-destructive">
                  Banned
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              @{target.username ?? "unknown"}
              {target.city ? ` · ${target.city}` : ""}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {target.email ?? "no email"}
            </p>
          </div>
        </div>
        {/* Report meta */}
        <div className="text-right shrink-0">
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-destructive/10 text-destructive">
            {REASON_LABELS[report.reason] ?? report.reason}
          </span>
          <p className="text-xs text-muted-foreground mt-1">
            {target.reportCount} report{target.reportCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Bio */}
      {target.bio && (
        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
          {target.bio}
        </p>
      )}

      {/* Reporters */}
      {report.reporters.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Reported by{" "}
          {report.reporters.map((r) => `@${r.username ?? r.name}`).join(", ")}
        </p>
      )}

      {/* Evidence transcript */}
      {report.evidence && report.evidence.length > 0 && (
        <div className="mt-3 rounded-xl border border-border bg-muted/40 p-3 space-y-2 max-h-64 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Chat evidence (last {report.evidence.length} messages)
          </p>
          {report.evidence.map((msg, i) => {
            const fromTarget = msg.senderId === target.id;
            const name = fromTarget ? target.name : `Reporter (${report.reporters[0]?.name ?? "user"})`;
            return (
              <div
                key={i}
                className={`flex flex-col gap-0.5 ${fromTarget ? "items-start" : "items-end"}`}
              >
                <span
                  className={`text-[11px] ${
                    fromTarget ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {name}
                </span>
                <span
                  className={`text-sm px-3 py-1.5 rounded-2xl max-w-[85%] break-words ${
                    fromTarget
                      ? "bg-muted text-foreground rounded-bl-sm"
                      : "bg-brand-600 text-white rounded-br-sm"
                  }`}
                >
                  {msg.body}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Internal note (optional)"
        rows={2}
        maxLength={500}
        className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
      />

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={loading !== null}
          onClick={() => void handleDecision("DISMISS")}
        >
          Dismiss
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={loading !== null}
          onClick={() => void handleDecision("WARN")}
        >
          Warn
        </Button>
        <Button
          variant={confirmBan ? "destructive" : "outline"}
          size="sm"
          disabled={loading !== null}
          onClick={() => void handleDecision("BAN")}
        >
          {confirmBan
            ? loading === "BAN"
              ? "Banning…"
              : "Confirm ban?"
            : "Ban user"}
        </Button>
      </div>
    </div>
  );
}
