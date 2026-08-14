"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";

/**
 * TopBar — slim app header shown on protected pages.
 *
 * Keeps the bottom nav focused on the core flow (Discover, Events, Matches,
 * Profile) by hosting the passive notifications entry (bell + unread badge)
 * in the top-right, the standard mobile app pattern.
 */
export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="shrink-0 bg-background border-b z-40">
      <div className="flex items-center justify-between px-6 h-14">
        <Link href="/" className="flex items-center gap-1.5 text-brand-600" aria-label="Gymatch home">
          <Flame size={20} aria-hidden="true" />
          <span className="font-bold">Gymatch</span>
        </Link>

        <Link
          href="/notifications"
          aria-label="Notifications"
          aria-current={pathname === "/notifications" ? "page" : undefined}
          className="p-2 rounded-full hover:bg-muted transition-colors"
          data-testid="topbar-notifications-link"
        >
          <NotificationBell />
        </Link>
      </div>
    </header>
  );
}