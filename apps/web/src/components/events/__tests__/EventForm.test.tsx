// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ── Mocks (must be before component imports) ───────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/events/actions", () => ({
  createEventAction: vi.fn(),
  updateEventAction: vi.fn(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────

import { EventForm } from "../EventForm";
import { createEventAction } from "@/lib/events/actions";

const mockCreate = createEventAction as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EventForm — create mode", () => {
  it("renders the required fields", () => {
    render(<EventForm mode="create" userGymId={null} />);

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.getByLabelText("Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Starts")).toBeInTheDocument();
    expect(screen.getByLabelText("Price")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create event" })).toBeInTheDocument();
  });

  it("requires a location when the user has no gym", async () => {
    mockCreate.mockResolvedValue({ success: true, eventId: "event-1" });

    render(<EventForm mode="create" userGymId={null} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    });

    // Location input should be submitted (server validates it as required)
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "",
        location: "",
        gymId: null,
      })
    );
  });

  it("submits the form with a gym when the 'At my gym' toggle is on", async () => {
    mockCreate.mockResolvedValue({ success: true, eventId: "event-1" });

    render(<EventForm mode="create" userGymId="gym-1" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        gymId: "gym-1",
        location: null,
      })
    );
  });

  it("warns when the start time is in the past", () => {
    render(<EventForm mode="create" userGymId={null} />);

    fireEvent.change(screen.getByLabelText("Starts"), {
      target: { value: "2020-01-01T10:00" },
    });

    expect(
      screen.getByText("This event is in the past and won't appear in upcoming events.")
    ).toBeInTheDocument();
  });

  it("does not warn for a future start time", () => {
    render(<EventForm mode="create" userGymId={null} />);

    fireEvent.change(screen.getByLabelText("Starts"), {
      target: { value: "2099-01-01T10:00" },
    });

    expect(
      screen.queryByText("This event is in the past and won't appear in upcoming events.")
    ).not.toBeInTheDocument();
  });

  it("prefills interest chips from the creator's disciplines and submits them", async () => {
    mockCreate.mockResolvedValue({ success: true, eventId: "event-1" });

    render(<EventForm mode="create" userGymId={null} userDisciplines={["CROSSFIT"]} />);

    // CROSSFIT chip pre-selected via aria-pressed, Yoga starts unpressed
    expect(screen.getByRole("button", { name: "CrossFit" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Yoga" })).toHaveAttribute("aria-pressed", "false");

    // Toggling Yoga on adds it; toggling CrossFit off removes it
    fireEvent.click(screen.getByRole("button", { name: "Yoga" }));
    fireEvent.click(screen.getByRole("button", { name: "CrossFit" }));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Create event" }));
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        disciplines: ["YOGA"],
      })
    );
  });

  it("prefills interest chips from the event in edit mode", () => {
    render(
      <EventForm
        mode="edit"
        initial={{
          id: "event-1",
          title: "Sunday open mat",
          type: "OPEN_MAT",
          startsAt: new Date("2099-01-01T10:00:00"),
          endsAt: null,
          description: null,
          location: "123 Main St",
          gymId: null,
          capacity: null,
          price: 0,
          disciplines: ["MARTIAL_ARTS"],
        }}
        userGymId={null}
      />
    );

    expect(screen.getByRole("button", { name: "Martial Arts" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Yoga" })).toHaveAttribute("aria-pressed", "false");
  });
});