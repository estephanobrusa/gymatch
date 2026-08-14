"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { unmatchAction } from "@/lib/chat/actions";

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  matchId: string;
  targetUserName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnmatched: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export function UnmatchConfirmDialog({
  matchId,
  targetUserName,
  open,
  onOpenChange,
  onUnmatched,
}: Props) {
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    if (isPending) return;
    setIsPending(true);

    const result = await unmatchAction(matchId);

    setIsPending(false);

    if ("success" in result) {
      toast.success("Match removed");
      onOpenChange(false);
      onUnmatched();
    } else if (result.error === "unauthorized") {
      toast.error("This match no longer exists");
      onOpenChange(false);
      onUnmatched(); // treat as success for UX
    } else {
      toast.error("Something went wrong");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unmatch with {targetUserName}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove the match and delete the
            conversation. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleConfirm()}
            disabled={isPending}
          >
            {isPending ? "Removing…" : "Unmatch"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
