// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";

// ── Mock next/navigation ──────────────────────────────────────────────────
const mockRouterPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, replace: vi.fn(), refresh: vi.fn() }),
}));

// ── Mock chat actions ─────────────────────────────────────────────────────
vi.mock("@/lib/chat/actions", () => ({
  sendMessageAction: vi.fn(),
  markAsReadAction: vi.fn(),
}));

// ── Mock moderation dialogs (rendered but not under test) ─────────────────
vi.mock("@/components/moderation/ReportModal", () => ({
  ReportModal: () => null,
}));
vi.mock("@/components/moderation/BlockConfirmDialog", () => ({
  BlockConfirmDialog: () => null,
}));
vi.mock("@/components/moderation/UnmatchConfirmDialog", () => ({
  UnmatchConfirmDialog: () => null,
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
import { ChatWindow } from "../ChatWindow";

const defaultProps = {
  conversationId: "conversation-1",
  matchId: "match-1",
  currentUserId: "user-1",
  otherUser: { id: "user-2", name: "Ada", photoUrl: null },
  initialMessages: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

describe("ChatWindow", () => {
  it("subscribes to match DELETE events via realtime", async () => {
    render(<ChatWindow {...defaultProps} />);

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith("conversation:conversation-1");
    });

    expect(mockChannelOn).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "matches",
        filter: "id=eq.match-1",
      },
      expect.any(Function)
    );
    expect(mockChannelSubscribe).toHaveBeenCalled();
  });

  it("redirects to /matches when the match is deleted remotely", async () => {
    render(<ChatWindow {...defaultProps} />);

    // Grab the DELETE handler registered on the channel
    const deleteCall = mockChannelOn.mock.calls.find(
      ([event, options]) => event === "postgres_changes" && options.event === "DELETE"
    );
    expect(deleteCall).toBeDefined();

    const deleteHandler = deleteCall![2] as (payload: { old: { id: string } }) => void;
    deleteHandler({ old: { id: "match-1" } });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/matches");
    });
  });

  it("subscribes to blocks INSERT events for the current user", async () => {
    render(<ChatWindow {...defaultProps} />);

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith("conversation:conversation-1");
    });

    expect(mockChannelOn).toHaveBeenCalledWith(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "blocks",
        filter: "toId=eq.user-1",
      },
      expect.any(Function)
    );
  });

  it("redirects to /matches when the current user gets blocked", async () => {
    render(<ChatWindow {...defaultProps} />);

    const insertCall = mockChannelOn.mock.calls.find(
      ([event, options]) => event === "postgres_changes" && options.table === "blocks"
    );
    expect(insertCall).toBeDefined();

    const insertHandler = insertCall![2] as (payload: { new: { toId: string } }) => void;
    insertHandler({ new: { toId: "user-1" } });

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith("/matches");
    });
  });

  it("shows Unmatch, Report and Block in the chat menu", async () => {
    render(<ChatWindow {...defaultProps} />);

    fireEvent.click(await screen.findByLabelText("More options"));

    expect(screen.getByText("Unmatch")).toBeInTheDocument();
    expect(screen.getByText("Report")).toBeInTheDocument();
    expect(screen.getByText("Block")).toBeInTheDocument();
  });
});
