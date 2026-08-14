// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mock server action ─────────────────────────────────────────────────────
vi.mock("@/lib/auth/actions", () => ({
  saveFitnessProfileAction: vi.fn(),
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
import FitnessPage from "../page";

// ── Tests ──────────────────────────────────────────────────────────────────

describe("FitnessPage — disciplines pills", () => {
  it("renders CrossFit discipline pill", () => {
    render(<FitnessPage />);
    expect(
      screen.getByRole("button", { name: /crossfit/i })
    ).toBeInTheDocument();
  });

  it("renders Weightlifting discipline pill", () => {
    render(<FitnessPage />);
    expect(
      screen.getByRole("button", { name: /weightlifting/i })
    ).toBeInTheDocument();
  });
});

describe("FitnessPage — fitness goal pills", () => {
  it("renders Muscle Gain goal pill", () => {
    render(<FitnessPage />);
    expect(
      screen.getByRole("button", { name: /muscle gain/i })
    ).toBeInTheDocument();
  });

  it("renders Strength goal pill", () => {
    render(<FitnessPage />);
    expect(
      screen.getByRole("button", { name: /strength/i })
    ).toBeInTheDocument();
  });
});

describe("FitnessPage — experience level pills", () => {
  it("renders BEGINNER option", () => {
    render(<FitnessPage />);
    expect(
      screen.getByRole("button", { name: /beginner/i })
    ).toBeInTheDocument();
  });

  it("renders ADVANCED option", () => {
    render(<FitnessPage />);
    expect(
      screen.getByRole("button", { name: /advanced/i })
    ).toBeInTheDocument();
  });
});

describe("FitnessPage — weekly frequency stepper", () => {
  it("renders the current frequency value (default 3)", () => {
    render(<FitnessPage />);
    // The stepper shows a numeric value
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders increment and decrement buttons for the stepper", () => {
    render(<FitnessPage />);
    expect(screen.getByRole("button", { name: /increase frequency/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /decrease frequency/i })).toBeInTheDocument();
  });
});

describe("FitnessPage — back navigation", () => {
  it("renders a back link pointing to /onboarding/photo", () => {
    render(<FitnessPage />);
    const backLink = screen.getByRole("link", { name: /back/i });
    expect(backLink).toHaveAttribute("href", "/onboarding/photo");
  });
});

describe("FitnessPage — submit disabled without selections", () => {
  it("Continue button is disabled when no disciplines are selected", () => {
    render(<FitnessPage />);
    const btn = screen.getByRole("button", { name: /continue/i });
    expect(btn).toBeDisabled();
  });
});
