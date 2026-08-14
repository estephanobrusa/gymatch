// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ── Mocks ─────────────────────────────────────────────────────────────────

vi.mock("@/lib/gym/actions", () => ({
  searchGymsAction: vi.fn(),
  saveGymAction: vi.fn(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────

import { GymSearch } from "../GymSearch";
import { searchGymsAction, saveGymAction } from "@/lib/gym/actions";

const mockSearch = searchGymsAction as Mock;
const mockSave = saveGymAction as Mock;

// ── Fixtures ──────────────────────────────────────────────────────────────

const GYM_1 = { placeId: "place-1", name: "Gold's Gym", address: "123 Main St" };
const GYM_2 = { placeId: "place-2", name: "CrossFit Palermo", address: "456 Av. Santa Fe" };

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

// ─────────────────────────────────────────────────────────────────────────
// Test 1: Renders input when no value
// ─────────────────────────────────────────────────────────────────────────

describe("GymSearch — initial state", () => {
  it("renders an input when no value is provided", () => {
    render(<GymSearch />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 2: Shows selected gym when value has data
  // ─────────────────────────────────────────────────────────────────────

  it("shows the selected gym name when value is provided", () => {
    render(
      <GymSearch value={{ id: "place-1", name: "Gold's Gym", address: "123 Main St" }} />
    );
    expect(screen.getByText("Gold's Gym")).toBeInTheDocument();
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 3: Clicking × calls onChange(null)
  // ─────────────────────────────────────────────────────────────────────

  it("calls onChange(null) when the × button is clicked", () => {
    const onChange = vi.fn();
    render(
      <GymSearch value={{ id: "place-1", name: "Gold's Gym" }} onChange={onChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: "×" }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Test 4: No search with fewer than 2 characters
// ─────────────────────────────────────────────────────────────────────────

describe("GymSearch — debounce and minimum chars", () => {
  it("does not call searchGymsAction when input has fewer than 2 characters", async () => {
    render(<GymSearch />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "g" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  // Triangulation: empty string also does not search
  it("does not call searchGymsAction when input is empty", async () => {
    render(<GymSearch />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 5: Shows "Searching..." while loading
  // ─────────────────────────────────────────────────────────────────────

  it("shows 'Searching...' text while a search is in progress", async () => {
    // Promise that never resolves — simulates a pending network call
    mockSearch.mockReturnValue(new Promise(() => {}));

    render(<GymSearch />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "gym" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("Searching...")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Test 6: Shows results when searchGymsAction returns data
// ─────────────────────────────────────────────────────────────────────────

describe("GymSearch — search results", () => {
  it("shows a list of results when searchGymsAction resolves with data", async () => {
    mockSearch.mockResolvedValue([GYM_1, GYM_2]);

    render(<GymSearch />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "gym" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("Gold's Gym")).toBeInTheDocument();
    expect(screen.getByText("CrossFit Palermo")).toBeInTheDocument();
  });

  // Triangulation: empty results → "No gyms found"
  it("shows 'No gyms found' when searchGymsAction returns an empty array", async () => {
    mockSearch.mockResolvedValue([]);

    render(<GymSearch />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "xyz" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText("No gyms found")).toBeInTheDocument();
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 7: Clicking a result calls saveGymAction + onChange
  // ─────────────────────────────────────────────────────────────────────

  it("calls saveGymAction and onChange with correct args when a result is clicked", async () => {
    mockSearch.mockResolvedValue([GYM_1]);
    mockSave.mockResolvedValue({ success: true });
    const onChange = vi.fn();

    render(<GymSearch onChange={onChange} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "gym" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Gold's Gym"));
    });

    expect(mockSave).toHaveBeenCalledWith("place-1", "Gold's Gym", "123 Main St");
    expect(onChange).toHaveBeenCalledWith({
      id: "place-1",
      name: "Gold's Gym",
      address: "123 Main St",
    });
  });

  // Triangulation: dropdown closes after selection
  it("closes the results list after a gym is selected", async () => {
    mockSearch.mockResolvedValue([GYM_1]);
    mockSave.mockResolvedValue({ success: true });

    render(<GymSearch onChange={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "gym" } });

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    // List is open — result is visible
    expect(screen.getByText("Gold's Gym")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByText("Gold's Gym"));
    });

    // List must be closed — result no longer in DOM
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});
