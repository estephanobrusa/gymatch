"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { deleteAccountAction } from "@/lib/auth/actions";

// ── Component ─────────────────────────────────────────────────────────────

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    if (isPending) return;
    setIsPending(true);

    const result = await deleteAccountAction();

    setIsPending(false);

    if ("success" in result) {
      toast.success("Account deleted. See you around!");
      router.replace("/login");
    } else {
      toast.error("Something went wrong");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full py-2 rounded-full border border-destructive text-destructive font-semibold hover:bg-destructive hover:text-white transition-colors"
      >
        Delete account
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your profile, photos, matches, and
              messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirm()}
              disabled={isPending}
            >
              {isPending ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
