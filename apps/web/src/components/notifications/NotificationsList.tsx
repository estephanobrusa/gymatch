"use client";

import Link from "next/link";
import { Heart, MessageCircle } from "lucide-react";
import type { NotificationPreview } from "@/lib/notifications/actions";

// ── Helpers ───────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString();
}

// ── Component ─────────────────────────────────────────────────────────────

export function NotificationsList({
  notifications,
}: {
  notifications: NotificationPreview[];
}) {
  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <Heart size={24} className="text-muted-foreground" aria-hidden="true" />
        </div>
        <p className="text-muted-foreground text-sm">
          No notifications yet. When someone matches with you or sends a
          message, it will show up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {notifications.map((n) => {
        const href = n.conversationId
          ? `/matches/${n.conversationId}`
          : n.matchId
            ? "/matches"
            : "/matches";

        const Icon = n.type === "NEW_MATCH" ? Heart : MessageCircle;

        return (
          <li key={n.id}>
            <Link
              href={href}
              className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                n.read
                  ? "border-border bg-background"
                  : "border-brand-200 bg-brand-50 dark:border-brand-900 dark:bg-brand-950/60"
              } hover:border-brand-300 dark:hover:border-brand-700`}
            >
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon size={18} className="text-brand-600" aria-hidden="true" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground line-clamp-2">
                  {n.type === "NEW_MATCH" ? (
                    <>
                      <span className="font-semibold">
                        {n.actor?.name ?? "Someone"}
                      </span>{" "}
                      matched with you!
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">
                        {n.actor?.name ?? "Someone"}
                      </span>{" "}
                      sent you a message
                    </>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatRelativeTime(n.createdAt)}
                </p>
              </div>

              {!n.read && (
                <span
                  className="w-2 h-2 rounded-full bg-brand-600 shrink-0"
                  aria-label="Unread"
                />
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
