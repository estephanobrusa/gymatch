// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mock next/navigation ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

// ── Mock next/link ────────────────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ── Mock NotificationBell deps (unread count + realtime client) ───────────
vi.mock("@/lib/notifications/actions", () => ({
  getUnreadNotificationsCountAction: vi.fn(async () => 0),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  }),
}));

// ── Import after mocks ────────────────────────────────────────────────────
import { BottomNav } from "../BottomNav";

// ── Tests ─────────────────────────────────────────────────────────────────

describe("BottomNav — renders all tabs", () => {
  it("renders the four core tabs (no notifications entry)", () => {
    render(<BottomNav />);

    expect(screen.getByText("Discover")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Matches")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });

  it("Events link points to /events", () => {
    render(<BottomNav />);
    const link = screen.getByRole("link", { name: /events/i });
    expect(link).toHaveAttribute("href", "/events");
  });

  it("Discover link points to /", () => {
    render(<BottomNav />);
    const link = screen.getByRole("link", { name: /discover/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("Matches link points to /matches", () => {
    render(<BottomNav />);
    const link = screen.getByRole("link", { name: /matches/i });
    expect(link).toHaveAttribute("href", "/matches");
  });

  it("Profile link points to /profile", () => {
    render(<BottomNav />);
    const link = screen.getByRole("link", { name: /profile/i });
    expect(link).toHaveAttribute("href", "/profile");
  });
});

describe("BottomNav — active tab", () => {
  it("active tab (/) makes Discover text aria-current='page'", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/");

    render(<BottomNav />);

    const discoverLink = screen.getByRole("link", { name: /discover/i });
    expect(discoverLink).toHaveAttribute("aria-current", "page");
  });

  it("active tab (/matches) makes Matches link aria-current='page'", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/matches");

    render(<BottomNav />);

    const matchesLink = screen.getByRole("link", { name: /matches/i });
    expect(matchesLink).toHaveAttribute("aria-current", "page");
  });

  it("inactive tabs do not have aria-current='page'", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/");

    render(<BottomNav />);

    // Matches and Profile are not active
    const matchesLink = screen.getByRole("link", { name: /matches/i });
    const profileLink = screen.getByRole("link", { name: /profile/i });
    expect(matchesLink).not.toHaveAttribute("aria-current", "page");
    expect(profileLink).not.toHaveAttribute("aria-current", "page");
  });
});
