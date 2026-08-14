"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitAppealAction } from "@/lib/moderation/actions";

export function AppealForm() {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = reason.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await submitAppealAction(trimmed);
      if ("error" in result) {
        if (result.error === "empty_reason") {
          toast.error("Please write something");
        } else if (result.error === "reason_too_long") {
          toast.error("Your appeal is too long");
        } else if (result.error === "already_appealed") {
          toast.error("You already submitted an appeal");
        } else {
          toast.error("Something went wrong");
        }
        return;
      }
      toast.success("Appeal submitted");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-3 text-left">
      <div className="flex flex-col gap-1">
        <label htmlFor="appeal-reason" className="text-sm font-medium">
          Why should your account be restored?
        </label>
        <textarea
          id="appeal-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain what happened and why you believe the ban was a mistake…"
          rows={5}
          maxLength={2000}
          required
          className="rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600 resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {reason.length}/2000
        </p>
      </div>
      <Button
        type="submit"
        disabled={isPending || reason.trim().length === 0}
        className="w-full"
      >
        {isPending ? "Submitting…" : "Submit appeal"}
      </Button>
    </form>
  );
}
