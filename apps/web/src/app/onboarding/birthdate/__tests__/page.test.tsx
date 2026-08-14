// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mock server action ─────────────────────────────────────────────────────
vi.mock("@/lib/auth/actions", () => ({
  updateBirthDate: vi.fn(),
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
import BirthdatePage from "../page";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("BirthdatePage — back navigation", () => {
  it("renders a back link pointing to /onboarding/username", () => {
    render(<BirthdatePage />);

    const backLink = screen.getByRole("link", { name: /back/i });
    expect(backLink).toHaveAttribute("href", "/onboarding/username");
  });
});
