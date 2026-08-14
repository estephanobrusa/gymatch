"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteEventAction } from "@/lib/events/actions";

interface DeleteEventButtonProps {
  eventId: string;
}

export function DeleteEventButton({ eventId }: DeleteEventButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleDelete() {
    setIsPending(true);
    setErrorMsg("");

    const result = await deleteEventAction(eventId);

    if ("error" in result) {
      setIsPending(false);
      setErrorMsg(result.error);
      return;
    }

    router.push("/events");
  }

  return (
    <div>
      {confirming ? (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isPending}
            className="w-full py-3 bg-destructive text-white rounded-full font-semibold disabled:opacity-60"
          >
            {isPending ? "Deleting..." : "Confirm delete"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="px-4 py-3 border border-border rounded-full text-sm font-semibold text-muted-foreground disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full py-3 border border-destructive text-destructive rounded-full font-semibold"
        >
          Delete event
        </button>
      )}
      {errorMsg && (
        <p className="text-sm text-destructive font-medium mt-1" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}