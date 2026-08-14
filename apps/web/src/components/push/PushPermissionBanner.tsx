"use client";

import { useEffect, useState } from "react";
import { subscribePushAction } from "@/lib/push/actions";

export function PushPermissionBanner() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  // Already granted or denied — don't show
  if (permission !== "default") return null;

  async function handleEnable() {
    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") return;

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
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDismiss() {
    setPermission("denied");
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 mx-auto max-w-sm px-4 z-50">
      <div className="bg-card border border-border rounded-2xl shadow-lg p-4 flex flex-col gap-3">
        <div>
          <p className="font-semibold text-sm">Stay in the loop</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Get notified when you match or receive a message.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="flex-1 py-2 rounded-full bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Enabling\u2026" : "Enable notifications"}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
