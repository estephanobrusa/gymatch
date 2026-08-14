"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { reportUserAction } from "@/lib/moderation/actions";
import type { ReportReason } from "@/lib/moderation/actions";

// ── Reason options ────────────────────────────────────────────────────────

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: "FAKE_PROFILE", label: "Fake profile" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SEXUAL_CONTENT", label: "Sexual content" },
  { value: "SPAM", label: "Spam" },
  { value: "UNDERAGE", label: "Underage" },
  { value: "OFFENSIVE_BEHAVIOR", label: "Offensive behavior" },
];

// ── State machine ─────────────────────────────────────────────────────────

type ModalState = "idle" | "submitting" | "success" | "error";

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  targetUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export function ReportModal({ targetUserId, open, onOpenChange }: Props) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null
  );
  const [state, setState] = useState<ModalState>("idle");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      // Reset state when closing
      setSelectedReason(null);
      setState("idle");
    }
    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    if (!selectedReason || state === "submitting") return;

    setState("submitting");

    const result = await reportUserAction(targetUserId, selectedReason);

    if ("success" in result) {
      setState("success");
      toast.success("Report submitted");
      handleOpenChange(false);
    } else if (result.error === "already_reported") {
      setState("success");
      toast.error("You already reported this user");
      handleOpenChange(false);
    } else {
      setState("error");
      toast.error("Something went wrong");
    }
  }

  const isSubmitting = state === "submitting";
  const isDisabled = isSubmitting || !selectedReason;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report user</DialogTitle>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="sr-only">Select a reason</legend>
          {REASON_OPTIONS.map(({ value, label }) => (
            <label
              key={value}
              className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-accent"
            >
              <input
                type="radio"
                name="report-reason"
                value={value}
                checked={selectedReason === value}
                onChange={() => setSelectedReason(value)}
                disabled={isSubmitting}
                className="accent-primary"
              />
              {label}
            </label>
          ))}
        </fieldset>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => void handleSubmit()}
            disabled={isDisabled}
          >
            {isSubmitting ? "Submitting…" : "Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
