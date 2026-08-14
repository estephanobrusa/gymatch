// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ── Mock next/navigation ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// ── Mock reportUserAction ─────────────────────────────────────────────────
vi.mock("@/lib/moderation/actions", () => ({
  reportUserAction: vi.fn(),
}));

// ── Mock sonner toast ─────────────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Mock ShadCN Dialog to keep tests deterministic ────────────────────────
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

// ── Import after mocks ────────────────────────────────────────────────────
import { ReportModal } from "../ReportModal";
import { reportUserAction } from "@/lib/moderation/actions";
import { toast } from "sonner";
import type { Mock } from "vitest";

const mockReportUserAction = reportUserAction as Mock;
const mockToastSuccess = toast.success as Mock;
const mockToastError = toast.error as Mock;

// ── Helpers ───────────────────────────────────────────────────────────────

function renderModal(
  overrides: Partial<React.ComponentProps<typeof ReportModal>> = {}
) {
  const onOpenChange = vi.fn();
  render(
    <ReportModal
      targetUserId="u2"
      open={true}
      onOpenChange={onOpenChange}
      {...overrides}
    />
  );
  return { onOpenChange };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ReportModal — reason options", () => {
  it("renders all 6 reason options", () => {
    renderModal();

    expect(screen.getByText("Fake profile")).toBeInTheDocument();
    expect(screen.getByText("Harassment")).toBeInTheDocument();
    expect(screen.getByText("Sexual content")).toBeInTheDocument();
    expect(screen.getByText("Spam")).toBeInTheDocument();
    expect(screen.getByText("Underage")).toBeInTheDocument();
    expect(screen.getByText("Offensive behavior")).toBeInTheDocument();
  });
});

describe("ReportModal — submit button state", () => {
  it("submit button is disabled when no reason is selected", () => {
    renderModal();

    const submitBtn = screen.getByRole("button", { name: /report/i });
    expect(submitBtn).toBeDisabled();
  });

  it("submit button is enabled after selecting a reason", () => {
    renderModal();

    fireEvent.click(screen.getByText("Spam"));

    const submitBtn = screen.getByRole("button", { name: /report/i });
    expect(submitBtn).not.toBeDisabled();
  });
});

describe("ReportModal — submission", () => {
  it("calls reportUserAction with correct targetUserId and reason on submit", async () => {
    mockReportUserAction.mockResolvedValue({ success: true });
    renderModal({ targetUserId: "u99" });

    fireEvent.click(screen.getByText("Harassment"));
    fireEvent.click(screen.getByRole("button", { name: /report/i }));

    await waitFor(() => {
      expect(mockReportUserAction).toHaveBeenCalledWith("u99", "HARASSMENT");
    });
  });

  it("shows success toast and closes modal on success", async () => {
    mockReportUserAction.mockResolvedValue({ success: true });
    const { onOpenChange } = renderModal();

    fireEvent.click(screen.getByText("Spam"));
    fireEvent.click(screen.getByRole("button", { name: /report/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Report submitted");
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows already-reported toast on already_reported error and closes the modal", async () => {
    mockReportUserAction.mockResolvedValue({ error: "already_reported" });
    const { onOpenChange } = renderModal();

    fireEvent.click(screen.getByText("Fake profile"));
    fireEvent.click(screen.getByRole("button", { name: /report/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "You already reported this user"
      );
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows generic error toast on unknown error", async () => {
    mockReportUserAction.mockResolvedValue({ error: "auth" });
    renderModal();

    fireEvent.click(screen.getByText("Underage"));
    fireEvent.click(screen.getByRole("button", { name: /report/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Something went wrong");
    });
  });

  it("submit button is disabled while submitting", async () => {
    // Never resolves during test — keeps component in submitting state
    mockReportUserAction.mockReturnValue(new Promise(() => {}));
    renderModal();

    fireEvent.click(screen.getByText("Spam"));
    // Button text is "Report" before submitting — click it
    fireEvent.click(screen.getByRole("button", { name: /^report$/i }));

    // After click, component enters submitting state: button text changes to "Submitting…"
    // and it becomes disabled — verify by finding the button by its new label
    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
  });
});
