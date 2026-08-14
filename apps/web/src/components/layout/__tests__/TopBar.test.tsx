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
  getUnreadNotificationsCountAction: vi.fn(async () => 3),
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
import { TopBar } from "../TopBar";

// ── Tests ─────────────────────────────────────────────────────────────────

describe("TopBar", () => {
  it("links the notifications bell to /notifications", () => {
    render(<TopBar />);

    const link = screen.getByRole("link", { name: /notifications/i });
    expect(link).toHaveAttribute("href", "/notifications");
  });

  it("shows the unread badge with the mocked count", async () => {
    render(<TopBar />);

    expect(await screen.findByTestId("notification-badge")).toHaveTextContent("3");
  });

  it("marks the notifications link active on /notifications", async () => {
    const { usePathname } = await import("next/navigation");
    vi.mocked(usePathname).mockReturnValue("/notifications");

    render(<TopBar />);

    const link = screen.getByRole("link", { name: /notifications/i });
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("links the brand to home", () => {
    render(<TopBar />);

    const brand = screen.getByRole("link", { name: /gymatch home/i });
    expect(brand).toHaveAttribute("href", "/");
  });
});