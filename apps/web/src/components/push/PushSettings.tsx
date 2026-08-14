"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { subscribePushAction, unsubscribePushAction } from "@/lib/push/actions";

type Status = "loading" | "unsupported" | "denied" | "enabled" | "disabled";

export function PushSettings() {
  const [status, setStatus] = useState<Status>("loading");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then(async (sub) => {
        if (!sub) {
          setStatus("disabled");
          return;
        }
        // Re-sync an orphaned local subscription with the server (idempotent
        // upsert) so the toggle reflects the database, not just the browser.
        const result = await subscribePushAction({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
          },
        });
        setStatus("success" in result ? "enabled" : "disabled");
      })
      .catch(() => setStatus("disabled"));
  }, []);

  async function handleEnable() {
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const sub =
        existing ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        }));
      await subscribePushAction({
        endpoint: sub.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))),
        },
      }).then((result) => {
        if (!("success" in result)) {
          setStatus("disabled");
          return;
        }
        setStatus("enabled");
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await unsubscribePushAction(sub.endpoint);
      }
      setStatus("disabled");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") return null;

  return (
    <div className="flex items-center justify-between py-4 border-b border-border">
      <div className="flex items-center gap-3">
        {status === "enabled" ? (
          <Bell size={18} className="text-brand-600" />
        ) : (
          <BellOff size={18} className="text-muted-foreground" />
        )}
        <div>
          <p className="text-sm font-medium">
            {status === "enabled" ? "Push notifications on" : "Push notifications off"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {status === "denied"
              ? "Blocked in browser settings — enable from your browser to turn on."
              : status === "unsupported"
              ? "Not supported on this device."
              : status === "enabled"
              ? "You'll be notified for new matches and messages."
              : "Enable to get notified for new matches and messages."}
          </p>
        </div>
      </div>

      {status === "enabled" && (
        <button
          type="button"
          role="switch"
          aria-checked={true}
          aria-label="Disable push notifications"
          onClick={handleDisable}
          disabled={loading}
          className="relative w-11 h-6 rounded-full bg-brand-600 transition-colors disabled:opacity-50"
        >
          <span className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white shadow" />
        </button>
      )}
      {status === "disabled" && (
        <button
          type="button"
          role="switch"
          aria-checked={false}
          aria-label="Enable push notifications"
          onClick={handleEnable}
          disabled={loading}
          className="relative w-11 h-6 rounded-full bg-muted border border-border transition-colors disabled:opacity-50"
        >
          <span className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow" />
        </button>
      )}
    </div>
  );
}
