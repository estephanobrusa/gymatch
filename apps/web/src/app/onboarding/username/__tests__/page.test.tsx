// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mock server action ─────────────────────────────────────────────────────
vi.mock("@/lib/auth/actions", () => ({
  updateUsername: vi.fn(),
}));

// ── Mock next/link ─────────────────────────────────────────────────────────
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

// ── Import after mocks ─────────────────────────────────────────────────────
import UsernamePage from "../page";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("UsernamePage — back navigation", () => {
  it("renders a back link pointing to /login", () => {
    render(<UsernamePage />);

    const backLink = screen.getByRole("link", { name: /back/i });
    expect(backLink).toHaveAttribute("href", "/login");
  });
});
