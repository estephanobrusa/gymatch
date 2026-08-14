// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mock PhotoUploader (client component with browser APIs) ────────────────
vi.mock("@/components/onboarding/PhotoUploader", () => ({
  PhotoUploader: () => <div data-testid="photo-uploader" />,
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
import PhotoPage from "../page";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("PhotoPage — back navigation", () => {
  it("renders a back link pointing to /onboarding/birthdate", () => {
    render(<PhotoPage />);

    const backLink = screen.getByRole("link", { name: /back/i });
    expect(backLink).toHaveAttribute("href", "/onboarding/birthdate");
  });
});
