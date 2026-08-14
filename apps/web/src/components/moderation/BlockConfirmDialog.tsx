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
import { blockUserAction } from "@/lib/moderation/actions";

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  targetUserId: string;
  targetUserName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBlocked: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export function BlockConfirmDialog({
  targetUserId,
  targetUserName,
  open,
  onOpenChange,
  onBlocked,
}: Props) {
  const [isPending, setIsPending] = useState(false);

  async function handleConfirm() {
    if (isPending) return;
    setIsPending(true);

    const result = await blockUserAction(targetUserId);

    setIsPending(false);

    if ("success" in result) {
      toast.success("User blocked");
      onOpenChange(false);
      onBlocked();
    } else if (result.error === "already_blocked") {
      toast.error("User already blocked");
      onOpenChange(false);
      onBlocked(); // treat as success for UX
    } else {
      toast.error("Something went wrong");
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block {targetUserName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Blocking {targetUserName} will remove your match and chat. This
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => void handleConfirm()}
            disabled={isPending}
          >
            {isPending ? "Blocking…" : "Block"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
