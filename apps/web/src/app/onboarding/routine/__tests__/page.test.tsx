// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mock server actions ────────────────────────────────────────────────────
vi.mock("@/lib/routine/actions", () => ({
  saveRoutineAction: vi.fn(),
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
import RoutinePage from "../page";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("RoutinePage — template cards", () => {
  it("renders Push/Pull/Legs template option", () => {
    render(<RoutinePage />);
    // Use getAllByText because description also contains the words
    const matches = screen.getAllByText(/push.*pull.*legs/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Bro Split template option", () => {
    render(<RoutinePage />);
    expect(screen.getByText(/bro split/i)).toBeInTheDocument();
  });
});

describe("RoutinePage — back navigation", () => {
  it("renders a back link pointing to /onboarding/fitness", () => {
    render(<RoutinePage />);
    const backLink = screen.getByRole("link", { name: /back/i });
    expect(backLink).toHaveAttribute("href", "/onboarding/fitness");
  });
});
