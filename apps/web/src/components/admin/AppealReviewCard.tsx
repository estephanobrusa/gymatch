"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reviewAppealAction } from "@/lib/moderation/actions";
import type { AppealQueueItem } from "@/lib/moderation/queries";

interface Props {
  appeal: AppealQueueItem;
}

export function AppealReviewCard({ appeal }: Props) {
  const router = useRouter();
  const [adminNote, setAdminNote] = useState("");
  const [loading, setLoading] = useState<null | "ACCEPT" | "REJECT">(null);
  const [confirmReject, setConfirmReject] = useState(false);

  async function handleDecision(decision: "ACCEPT" | "REJECT") {
    if (decision === "REJECT" && !confirmReject) {
      setConfirmReject(true);
      return;
    }

    setLoading(decision);
    const result = await reviewAppealAction(appeal.id, decision, adminNote);
    setLoading(null);

    if ("error" in result) {
      toast.error(
        result.error === "already_reviewed"
          ? "This appeal was already reviewed"
          : result.error === "forbidden"
          ? "Admin access required"
          : "Something went wrong"
      );
      return;
    }

    toast.success(
      decision === "ACCEPT"
        ? `${appeal.user.name}'s account was restored`
        : `Appeal rejected — ${appeal.user.name} stays banned`
    );
    router.refresh();
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center gap-3">
        {appeal.user.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={appeal.user.photoUrl}
            alt={appeal.user.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-lg font-bold text-muted-foreground">
            {appeal.user.name[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{appeal.user.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            @{appeal.user.username ?? "unknown"}
            {appeal.user.city ? ` · ${appeal.user.city}` : ""}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {appeal.user.email ?? "no email"}
          </p>
        </div>
      </div>

      {/* Appeal reason */}
      <div className="mt-3 rounded-xl bg-muted p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          Appeal
        </p>
        <p className="text-sm whitespace-pre-wrap">{appeal.reason}</p>
      </div>

      {/* Admin note */}
      <textarea
        value={adminNote}
        onChange={(e) => setAdminNote(e.target.value)}
        placeholder="Reply to the user (optional)"
        rows={2}
        maxLength={500}
        className="mt-3 w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
      />

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <Button
          variant={confirmReject ? "destructive" : "outline"}
          size="sm"
          disabled={loading !== null}
          onClick={() => void handleDecision("REJECT")}
        >
          {confirmReject
            ? loading === "REJECT"
              ? "Rejecting…"
              : "Confirm reject?"
            : "Reject"}
        </Button>
        <Button
          variant="default"
          size="sm"
          disabled={loading !== null}
          onClick={() => void handleDecision("ACCEPT")}
        >
          {loading === "ACCEPT" ? "Restoring…" : "Restore account"}
        </Button>
      </div>
    </div>
  );
}
