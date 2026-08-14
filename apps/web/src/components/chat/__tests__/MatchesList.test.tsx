// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// ── Mock next/navigation ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

// ── Import after mocks ────────────────────────────────────────────────────
import { MatchesList } from "../MatchesList";

const matches = [
  {
    matchId: "m1",
    conversationId: "c1",
    matchedUser: { id: "u2", name: "Ada", photoUrl: null },
    lastMessage: {
      id: "msg1",
      conversationId: "c1",
      senderId: "u2",
      body: "Let's lift",
      createdAt: "2026-08-13T00:00:00.000Z",
    },
    unreadCount: 0,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MatchesList", () => {
  it("renders match cards with name and last message", () => {
    render(<MatchesList matches={matches} />);

    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Let's lift")).toBeInTheDocument();
  });

  it("does not show the Unmatch label on match cards", () => {
    render(<MatchesList matches={matches} />);

    expect(screen.queryByText("Unmatch")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Unmatch with Ada")).not.toBeInTheDocument();
  });
});
