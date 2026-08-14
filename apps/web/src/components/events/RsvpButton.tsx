"use client";

import { useState } from "react";
import { toggleEventRsvpAction } from "@/lib/events/actions";

interface RsvpButtonProps {
  eventId: string;
  initiallyAttending: boolean;
}

export function RsvpButton({ eventId, initiallyAttending }: RsvpButtonProps) {
  const [attending, setAttending] = useState(initiallyAttending);
  const [isPending, setIsPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleToggle() {
    setIsPending(true);
    setErrorMsg("");

    const result = await toggleEventRsvpAction(eventId);

    if ("error" in result) {
      setIsPending(false);
      setErrorMsg(result.error);
      return;
    }

    setAttending(result.attending);
    setIsPending(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleToggle()}
        disabled={isPending}
        className={
          attending
            ? "w-full py-3 bg-brand-500 text-white rounded-full font-semibold disabled:opacity-60"
            : "w-full py-3 border border-brand-500 text-brand-600 rounded-full font-semibold disabled:opacity-60"
        }
      >
        {isPending ? "Saving..." : attending ? "Cancel RSVP" : "RSVP"}
      </button>
      {errorMsg && (
        <p className="text-sm text-destructive font-medium mt-1" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}