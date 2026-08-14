"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Heart, CalendarDays, User } from "lucide-react";

const TABS = [
  { label: "Discover", href: "/", Icon: Flame },
  { label: "Events", href: "/events", Icon: CalendarDays },
  { label: "Matches", href: "/matches", Icon: Heart },
  { label: "Profile", href: "/profile", Icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bottom navigation"
      className="bg-background border-t shrink-0"
    >
      <div className="flex items-center justify-around">
        {TABS.map(({ label, href, Icon }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 px-6 py-3 text-xs font-medium transition-colors ${
                isActive
                  ? "text-brand-600"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                size={22}
                aria-hidden="true"
                fill={isActive ? "currentColor" : "none"}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
