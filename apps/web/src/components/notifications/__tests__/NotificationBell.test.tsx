// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// ── Mock next/navigation ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

// ── Mock notifications action ─────────────────────────────────────────────
const mockGetUnreadCount = vi.fn();
vi.mock("@/lib/notifications/actions", () => ({
  getUnreadNotificationsCountAction: () => mockGetUnreadCount(),
}));

// ── Mock supabase client ──────────────────────────────────────────────────
const mockChannelOn = vi.fn();
const mockChannelSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
const mockChannel = vi.fn(() => ({
  on: mockChannelOn.mockReturnThis(),
  subscribe: mockChannelSubscribe,
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: mockChannel,
    removeChannel: vi.fn(),
  }),
}));

// ── Import after mocks ────────────────────────────────────────────────────
import { NotificationBell } from "../NotificationBell";
import type { Mock } from "vitest";

const mockGetUnreadCountTyped = mockGetUnreadCount as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUnreadCountTyped.mockResolvedValue(0);
});

describe("NotificationBell", () => {
  it("fetches and shows the unread count badge", async () => {
    mockGetUnreadCountTyped.mockResolvedValue(3);
    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.getByTestId("notification-badge")).toHaveTextContent("3");
    });
  });

  it("hides the badge when unread count is zero", async () => {
    mockGetUnreadCountTyped.mockResolvedValue(0);
    render(<NotificationBell />);

    await waitFor(() => {
      expect(screen.queryByTestId("notification-badge")).not.toBeInTheDocument();
    });
  });

  it("renders the bell with notifications label", () => {
    render(<NotificationBell />);

    expect(screen.getByTestId("notification-bell")).toHaveAttribute(
      "aria-label",
      "Notifications"
    );
  });

  it("subscribes to a realtime channel on the notifications table", async () => {
    render(<NotificationBell />);

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith("notifications");
      expect(mockChannelSubscribe).toHaveBeenCalled();
    });
  });
});
