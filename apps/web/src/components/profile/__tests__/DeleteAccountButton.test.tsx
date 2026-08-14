// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

// ── Mock next/navigation ──────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

// ── Mock deleteAccountAction ──────────────────────────────────────────────
vi.mock("@/lib/auth/actions", () => ({
  deleteAccountAction: vi.fn(),
}));

// ── Mock sonner toast ─────────────────────────────────────────────────────
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Mock ShadCN AlertDialog ───────────────────────────────────────────────
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
import { DeleteAccountButton } from "../DeleteAccountButton";
import { deleteAccountAction } from "@/lib/auth/actions";
import { toast } from "sonner";
import type { Mock } from "vitest";

const mockDeleteAccountAction = deleteAccountAction as Mock;
const mockToastSuccess = toast.success as Mock;
const mockToastError = toast.error as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe("DeleteAccountButton", () => {
  it("renders the destructive trigger button", () => {
    render(<DeleteAccountButton />);

    expect(
      screen.getByRole("button", { name: "Delete account" })
    ).toBeInTheDocument();
  });

  it("opens the dialog on click and shows strong warning copy", async () => {
    render(<DeleteAccountButton />);

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));

    expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent(
      "Delete account?"
    );
    const description = screen.getByTestId("alert-dialog-description");
    expect(description).toHaveTextContent("permanently");
    expect(description).toHaveTextContent("cannot be undone");
    expect(description).toHaveTextContent("photos");
    expect(description).toHaveTextContent("matches");
    expect(description).toHaveTextContent("messages");
  });

  it("calls deleteAccountAction on confirm", async () => {
    mockDeleteAccountAction.mockResolvedValue({ success: true });
    render(<DeleteAccountButton />);

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockDeleteAccountAction).toHaveBeenCalledTimes(1);
    });
  });

  it("shows success toast after successful deletion", async () => {
    mockDeleteAccountAction.mockResolvedValue({ success: true });
    render(<DeleteAccountButton />);

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Account deleted. See you around!"
      );
    });
  });

  it("shows generic error toast on failed deletion", async () => {
    mockDeleteAccountAction.mockResolvedValue({ error: "failed" });
    render(<DeleteAccountButton />);

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Something went wrong");
    });
  });

  it("confirm button is disabled while pending", async () => {
    mockDeleteAccountAction.mockReturnValue(new Promise(() => {}));
    render(<DeleteAccountButton />);

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByTestId("alert-dialog-action"));

    expect(screen.getByTestId("alert-dialog-action")).toBeDisabled();
  });

  it("cancel closes the dialog without deleting", () => {
    render(<DeleteAccountButton />);

    fireEvent.click(screen.getByRole("button", { name: "Delete account" }));
    fireEvent.click(screen.getByTestId("alert-dialog-cancel"));

    expect(mockDeleteAccountAction).not.toHaveBeenCalled();
  });
});
