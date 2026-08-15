"use client";

import { useState } from "react";
import { setWaitlistActiveAction } from "@/lib/waitlist/actions";

/**
 * Waitlist toggle for the admin dashboard.
 *
 * When active, brand-new Google signups are captured on the waitlist instead
 * of being admitted to the app. Existing users keep their access.
 */
export function WaitlistToggle({
  initiallyActive,
}: {
  initiallyActive: boolean;
}) {
  const [active, setActive] = useState(initiallyActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(next: boolean) {
    setBusy(true);
    setError(null);
    const result = await setWaitlistActiveAction(next);
    setBusy(false);
    if ("error" in result) {
      setActive(!next);
      setError(result.error);
      return;
    }
    setActive(next);
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">Waitlist</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {active
            ? "Active — new signups are captured and wait."
            : "Inactive — new signups join normally."}
        </p>
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label="Toggle waitlist"
        disabled={busy}
        onClick={() => handleToggle(!active)}
        className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
          active ? "bg-brand-600" : "bg-muted"
        } disabled:opacity-60`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition-transform ${
            active ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}