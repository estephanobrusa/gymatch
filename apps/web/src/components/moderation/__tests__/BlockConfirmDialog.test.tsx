// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ── Mock next/navigation ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// ── Mock blockUserAction ──────────────────────────────────────────────────
vi.mock("@/lib/moderation/actions", () => ({
  blockUserAction: vi.fn(),
}));

// ── Mock sonner toast ─────────────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Mock ShadCN AlertDialog ───────────────────────────────────────────────
// We mock it as a simple visible structure so we can verify text and clicks
// without dealing with Radix portal/animation in jsdom.
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <div data-testid="alert-dialog-root">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="alert-dialog-title">{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="alert-dialog-description">{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogCancel: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => (
    <button data-testid="alert-dialog-cancel" {...props}>
      {children}
    </button>
  ),
  AlertDialogAction: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => (
    <button data-testid="alert-dialog-action" {...props}>
      {children}
    </button>
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────
import { BlockConfirmDialog } from "../BlockConfirmDialog";
import { blockUserAction } from "@/lib/moderation/actions";
import { toast } from "sonner";
import type { Mock } from "vitest";

const mockBlockUserAction = blockUserAction as Mock;
const mockToastSuccess = toast.success as Mock;
const mockToastError = toast.error as Mock;

// ── Helpers ───────────────────────────────────────────────────────────────

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof BlockConfirmDialog>> = {}
) {
  const onOpenChange = vi.fn();
  const onBlocked = vi.fn();
  render(
    <BlockConfirmDialog
      targetUserId="u2"
      targetUserName="Alice"
      open={true}
      onOpenChange={onOpenChange}
      onBlocked={onBlocked}
      {...overrides}
    />
  );
  return { onOpenChange, onBlocked };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("BlockConfirmDialog — renders warning text", () => {
  it("shows warning text containing the target user name", () => {
    renderDialog({ targetUserName: "Carlos" });

    const description = screen.getByTestId("alert-dialog-description");
    expect(description).toHaveTextContent("Carlos");
    expect(description).toHaveTextContent("match");
    expect(description).toHaveTextContent("chat");
  });

  it("reflects a different user name when prop changes", () => {
    renderDialog({ targetUserName: "Maria" });

    const description = screen.getByTestId("alert-dialog-description");
    expect(description).toHaveTextContent("Maria");
  });
});

describe("BlockConfirmDialog — block action", () => {
  it("calls blockUserAction with correct targetUserId on confirm", async () => {
    mockBlockUserAction.mockResolvedValue({ success: true });
    renderDialog({ targetUserId: "u99" });

    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockBlockUserAction).toHaveBeenCalledWith("u99");
    });
  });

  it("calls onBlocked and shows success toast after successful block", async () => {
    mockBlockUserAction.mockResolvedValue({ success: true });
    const { onBlocked } = renderDialog();

    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("User blocked");
      expect(onBlocked).toHaveBeenCalledTimes(1);
    });
  });

  it("calls onBlocked on already_blocked (treat as success for UX)", async () => {
    mockBlockUserAction.mockResolvedValue({ error: "already_blocked" });
    const { onBlocked } = renderDialog();

    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("User already blocked");
      expect(onBlocked).toHaveBeenCalledTimes(1);
    });
  });

  it("shows generic error toast and does NOT call onBlocked on unknown error", async () => {
    mockBlockUserAction.mockResolvedValue({ error: "auth" });
    const { onBlocked } = renderDialog();

    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Something went wrong");
      expect(onBlocked).not.toHaveBeenCalled();
    });
  });

  it("confirm button is disabled while pending", async () => {
    // Never resolves — keeps component in pending state
    mockBlockUserAction.mockReturnValue(new Promise(() => {}));
    renderDialog();

    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    // Button should be disabled immediately after click (pending state)
    expect(screen.getByTestId("alert-dialog-action")).toBeDisabled();
  });
});
