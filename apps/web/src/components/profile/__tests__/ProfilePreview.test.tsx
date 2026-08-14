// @vitest-environment jsdom

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProfilePreview } from "../ProfilePreview";
import type { DiscoveryCard } from "@/lib/swipe/types";

const card: DiscoveryCard = {
  id: "user-1",
  name: "Ana",
  city: "Buenos Aires",
  gymName: "Iron Temple",
  fitnessGoals: ["STRENGTH"],
  disciplines: ["CROSSFIT"],
  experienceLevel: "INTERMEDIATE",
  photos: [{ url: "/photo1.jpg", position: 0 }],
};

describe("ProfilePreview", () => {
  it("renders the preview banner with profile facts", () => {
    render(<ProfilePreview card={card} />);

    expect(screen.getByText("Discover preview")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Buenos Aires · Iron Temple")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /How others see you/ })).toBeInTheDocument();
  });

  it("opens the full preview drawer on click and closes it", () => {
    render(<ProfilePreview card={card} />);

    fireEvent.click(screen.getByRole("button", { name: /How others see you/ }));

    // Drawer modal content appears (disciplines section from ProfileDrawer)
    expect(screen.getByText("Disciplines")).toBeInTheDocument();

    // Close via backdrop
    fireEvent.click(document.querySelector(".bg-black\\/60") as HTMLElement);
    expect(screen.queryByText("Disciplines")).not.toBeInTheDocument();
  });

  it("shows an initial fallback when there is no photo", () => {
    const noPhoto: DiscoveryCard = { ...card, photos: [] };
    render(<ProfilePreview card={noPhoto} />);

    expect(screen.getByText("A")).toBeInTheDocument();
  });
});