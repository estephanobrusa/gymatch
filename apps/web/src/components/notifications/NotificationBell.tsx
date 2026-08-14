"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getUnreadNotificationsCountAction } from "@/lib/notifications/actions";

/**
 * NotificationBell — shows the unread notification count with a live badge.
 *
 * Pure visual component: the parent (e.g. BottomNav) provides the Link.
 * Polls the unread count on mount, then subscribes to Supabase Realtime
 * INSERTs on the `notifications` table so the badge updates in real time.
 */
export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    try {
      const count = await getUnreadNotificationsCountAction();
      setUnreadCount(count);
    } catch {
      // ignore — badge just keeps the last known count
    }
  }, []);

  // Initial fetch + poll fallback every 60s (realtime is best-effort)
  useEffect(() => {
    void refreshUnread();
    const interval = setInterval(() => void refreshUnread(), 60_000);
    return () => clearInterval(interval);
  }, [refreshUnread]);

  // Supabase Realtime: live badge update on new notification rows
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        () => {
          void refreshUnread();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshUnread]);

  return (
    <span
      className="relative"
      aria-label="Notifications"
      data-testid="notification-bell"
    >
      <Bell size={22} aria-hidden="true" />
      {unreadCount > 0 && (
        <span
          data-testid="notification-badge"
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-600 text-white text-[10px] font-bold flex items-center justify-center"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </span>
  );
}
