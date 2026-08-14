// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ── Mock next/navigation ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// ── Mock unmatchAction ────────────────────────────────────────────────────
vi.mock("@/lib/chat/actions", () => ({
  unmatchAction: vi.fn(),
}));

// ── Mock sonner toast ─────────────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Mock ShadCN AlertDialog ───────────────────────────────────────────────
// Same mock strategy as BlockConfirmDialog.test.tsx — verify text and clicks
// without Radix portal/animation in jsdom.
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
import { UnmatchConfirmDialog } from "../UnmatchConfirmDialog";
import { unmatchAction } from "@/lib/chat/actions";
import { toast } from "sonner";
import type { Mock } from "vitest";

const mockUnmatchAction = unmatchAction as Mock;
const mockToastSuccess = toast.success as Mock;
const mockToastError = toast.error as Mock;

// ── Helpers ───────────────────────────────────────────────────────────────

function renderDialog(
  overrides: Partial<React.ComponentProps<typeof UnmatchConfirmDialog>> = {}
) {
  const onOpenChange = vi.fn();
  const onUnmatched = vi.fn();
  render(
    <UnmatchConfirmDialog
      matchId="match-1"
      targetUserName="Alice"
      open={true}
      onOpenChange={onOpenChange}
      onUnmatched={onUnmatched}
      {...overrides}
    />
  );
  return { onOpenChange, onUnmatched };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("UnmatchConfirmDialog — renders warning text", () => {
  it("shows title and warning containing the target user name", () => {
    renderDialog({ targetUserName: "Carlos" });

    expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Carlos");
    const description = screen.getByTestId("alert-dialog-description");
    expect(description).toHaveTextContent("match");
    expect(description).toHaveTextContent("conversation");
    expect(description).toHaveTextContent("cannot be undone");
  });

  it("reflects a different user name when prop changes", () => {
    renderDialog({ targetUserName: "Maria" });

    expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Maria");
  });
});

describe("UnmatchConfirmDialog — unmatch action", () => {
  it("calls unmatchAction with correct matchId on confirm", async () => {
    mockUnmatchAction.mockResolvedValue({ success: true });
    renderDialog({ matchId: "m99" });

    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockUnmatchAction).toHaveBeenCalledWith("m99");
    });
  });

  it("calls onUnmatched and shows success toast after successful unmatch", async () => {
    mockUnmatchAction.mockResolvedValue({ success: true });
    const { onUnmatched } = renderDialog();

    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Match removed");
      expect(onUnmatched).toHaveBeenCalledTimes(1);
    });
  });

  it("calls onUnmatched on unauthorized (treat as gone for UX)", async () => {
    mockUnmatchAction.mockResolvedValue({ error: "unauthorized" });
    const { onUnmatched } = renderDialog();

    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("This match no longer exists");
      expect(onUnmatched).toHaveBeenCalledTimes(1);
    });
  });

  it("shows generic error toast and does NOT call onUnmatched on other errors", async () => {
    mockUnmatchAction.mockResolvedValue({ error: "failed" });
    const { onUnmatched } = renderDialog();

    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Something went wrong");
      expect(onUnmatched).not.toHaveBeenCalled();
    });
  });

  it("confirm button is disabled while pending", async () => {
    mockUnmatchAction.mockReturnValue(new Promise(() => {}));
    renderDialog();

    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    expect(screen.getByTestId("alert-dialog-action")).toBeDisabled();
  });
});
