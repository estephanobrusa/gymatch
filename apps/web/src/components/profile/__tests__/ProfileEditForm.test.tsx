// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Mock } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { ProfileUser } from "@gymatch/core";

// ── Mocks (must be before component imports) ───────────────────────────────

vi.mock("@/lib/profile/actions", () => ({
  updateProfileAction: vi.fn(),
  updateScheduleSlotsAction: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "https://example.com/photo.jpg" } })),
      })),
    },
  })),
}));

vi.mock("@/components/gym/GymSearch", () => ({
  GymSearch: ({
    value,
    onChange,
  }: {
    value?: { id: string; name: string } | null;
    onChange?: (g: { id: string; name: string } | null) => void;
  }) => (
    <div data-testid="gym-search">
      {value?.name ?? "Select a gym"}
      <button type="button" onClick={() => onChange?.(null)}>
        Clear gym
      </button>
    </div>
  ),
}));

// ── Imports after mocks ───────────────────────────────────────────────────

import { ProfileEditForm } from "../ProfileEditForm";
import { updateProfileAction, updateScheduleSlotsAction } from "@/lib/profile/actions";

const mockUpdate = updateProfileAction as Mock;
const mockScheduleUpdate = updateScheduleSlotsAction as Mock;

// ── Fixtures ──────────────────────────────────────────────────────────────

const MOCK_PROFILE: ProfileUser = {
  id: "user-1",
  name: "Jane Doe",
  username: "janedoe",
  bio: "Fitness enthusiast",
  birthDate: null,
  minAge: 18,
  maxAge: 50,
  city: null,
  gender: null,
  maxDistance: null,
  height: null,
  weight: null,
  weeklyFrequency: 3,
  experienceLevel: "INTERMEDIATE",
  fitnessGoals: ["MUSCLE_GAIN"],
  disciplines: ["CROSSFIT"],
  schedule: ["MORNING"],
  scheduleSlots: [],
  lookingFor: [],
  gymId: null,
  hideProfile: false,
  incognitoMode: false,
  gym: null,
  photos: [],
};

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockScheduleUpdate.mockResolvedValue({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────
// Test 1 — Bio textarea initial value
// ─────────────────────────────────────────────────────────────────────────

describe("ProfileEditForm — bio field", () => {
  it("renders the bio textarea with the profile's initial value", () => {
    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    const textarea = screen.getByDisplayValue("Fitness enthusiast");
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  // Triangulation: profile with null bio shows empty textarea
  it("renders an empty textarea when bio is null", () => {
    render(<ProfileEditForm profile={{ ...MOCK_PROFILE, bio: null }} />);

    // Should still have a textarea, just empty
    const textareas = screen.getAllByRole("textbox");
    expect(textareas.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Test 2 — Discipline pills
// ─────────────────────────────────────────────────────────────────────────

describe("ProfileEditForm — discipline pills", () => {
  it("renders discipline pills and marks the profile disciplines as selected", () => {
    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    // CrossFit is in the profile — should be selected (aria-pressed=true)
    const crossfitBtn = screen.getByRole("button", { name: "CrossFit", pressed: true });
    expect(crossfitBtn).toBeInTheDocument();

    // Weightlifting is NOT in the profile — should be unselected
    const weightliftingBtn = screen.getByRole("button", {
      name: "Weightlifting",
      pressed: false,
    });
    expect(weightliftingBtn).toBeInTheDocument();
  });

  // Triangulation: clicking a pill toggles it
  it("toggles a discipline when its pill is clicked", async () => {
    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    // Initially Yoga is not selected
    const yogaBtn = screen.getByRole("button", { name: "Yoga", pressed: false });
    expect(yogaBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(yogaBtn);
    });

    // After click, Yoga should be selected
    expect(screen.getByRole("button", { name: "Yoga", pressed: true })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Test 3 — Fitness goal pills
// ─────────────────────────────────────────────────────────────────────────

describe("ProfileEditForm — fitnessGoals pills", () => {
  it("renders fitness goal pills and marks profile goals as selected", () => {
    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    // MUSCLE_GAIN is in the profile — selected
    const muscleGainBtn = screen.getByRole("button", { name: "Muscle Gain", pressed: true });
    expect(muscleGainBtn).toBeInTheDocument();

    // FAT_LOSS is not — unselected
    const fatLossBtn = screen.getByRole("button", { name: "Fat Loss", pressed: false });
    expect(fatLossBtn).toBeInTheDocument();
  });

  // Triangulation: profile with no goals shows all pills unselected
  it("shows all goal pills unselected when profile has no fitnessGoals", () => {
    render(<ProfileEditForm profile={{ ...MOCK_PROFILE, fitnessGoals: [] }} />);

    const muscleGainBtn = screen.getByRole("button", { name: "Muscle Gain", pressed: false });
    expect(muscleGainBtn).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Test 4 — Experience level pills
// ─────────────────────────────────────────────────────────────────────────

describe("ProfileEditForm — experienceLevel pills", () => {
  it("renders experience level pills and marks the current level as selected", () => {
    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    // INTERMEDIATE is selected
    const intermediateBtn = screen.getByRole("button", {
      name: "Intermediate",
      pressed: true,
    });
    expect(intermediateBtn).toBeInTheDocument();

    // BEGINNER is not
    const beginnerBtn = screen.getByRole("button", { name: "Beginner", pressed: false });
    expect(beginnerBtn).toBeInTheDocument();
  });

  // Triangulation: clicking a different level changes selection
  it("selects a new experience level when a different pill is clicked", async () => {
    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    const advancedBtn = screen.getByRole("button", { name: "Advanced", pressed: false });

    await act(async () => {
      fireEvent.click(advancedBtn);
    });

    expect(screen.getByRole("button", { name: "Advanced", pressed: true })).toBeInTheDocument();
    // Previous selection should be deselected
    expect(
      screen.getByRole("button", { name: "Intermediate", pressed: false })
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Test 5 — Weekly frequency stepper
// ─────────────────────────────────────────────────────────────────────────

describe("ProfileEditForm — weeklyFrequency stepper", () => {
  it("renders the frequency value with − and + buttons", () => {
    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    // Profile has weeklyFrequency = 3
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "−" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument();
  });

  // Triangulation: + increments the value
  it("increments the frequency when + is clicked", async () => {
    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "+" }));
    });

    expect(screen.getByText("4")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Test 6 — Submit calls updateProfileAction
// ─────────────────────────────────────────────────────────────────────────

describe("ProfileEditForm — submit behaviour", () => {
  it("calls updateProfileAction with the current form values when submitted", async () => {
    mockUpdate.mockResolvedValue({ success: true });

    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save profile/i }));
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        disciplines: ["CROSSFIT"],
        fitnessGoals: ["MUSCLE_GAIN"],
        experienceLevel: "INTERMEDIATE",
        weeklyFrequency: 3,
      })
    );
  });

  // Triangulation: submitting with updated values sends the right data
  it("sends updated weekly frequency when + was clicked before submit", async () => {
    mockUpdate.mockResolvedValue({ success: true });

    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "+" }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save profile/i }));
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ weeklyFrequency: 4 })
    );
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 7 — Saving... state
  // ─────────────────────────────────────────────────────────────────────

  it("disables the submit button with 'Saving...' text while the action is pending", async () => {
    // Never-resolving promise — keeps the component in "saving" state
    mockUpdate.mockReturnValue(new Promise(() => {}));

    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save profile/i }));
    });

    const savingBtn = screen.getByRole("button", { name: "Saving..." });
    expect(savingBtn).toBeInTheDocument();
    expect(savingBtn).toBeDisabled();
  });

  // ─────────────────────────────────────────────────────────────────────
  // Test 8 — Success message
  // ─────────────────────────────────────────────────────────────────────

  it("shows 'Profile updated!' after a successful submit", async () => {
    mockUpdate.mockResolvedValue({ success: true });

    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save profile/i }));
    });

    expect(screen.getByText("Profile updated!")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Test 9 — Weekly training schedule
// ─────────────────────────────────────────────────────────────────────────

describe("ProfileEditForm — weekly training schedule", () => {
  it("renders the 'Weekly training schedule' heading", () => {
    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    expect(screen.getByText("Weekly training schedule")).toBeInTheDocument();
  });

  it("adds a slot row for a day when '+ Add slot' is clicked", async () => {
    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    // No slots in the profile yet — no activity inputs
    expect(screen.queryAllByPlaceholderText("BJJ").length).toBe(0);

    const addButtons = screen.getAllByRole("button", { name: /add slot/i });
    await act(async () => {
      fireEvent.click(addButtons[0]!); // Mon
    });

    // A brand-new slot shows "Other" + the custom activity input
    expect(screen.getAllByPlaceholderText("BJJ").length).toBe(1);
    expect(screen.getByRole("combobox", { name: /activity mon/i })).toBeInTheDocument();
  });

  it("shows a custom activity input for a new slot and toggles it via the dropdown", async () => {
    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /add slot/i })[0]!);
    });

    const select = screen.getByRole("combobox", { name: /activity mon/i });
    // New slot (activity "") is custom → text input visible
    expect(screen.getByPlaceholderText("BJJ")).toBeInTheDocument();

    // Picking a known option hides the custom input
    await act(async () => {
      fireEvent.change(select, { target: { value: "BJJ" } });
    });
    expect(screen.queryByPlaceholderText("BJJ")).not.toBeInTheDocument();

    // Picking "Other" shows the custom input again (empty)
    await act(async () => {
      fireEvent.change(select, { target: { value: "__custom__" } });
    });
    expect(screen.getByPlaceholderText("BJJ")).toBeInTheDocument();
  });

  it("calls updateScheduleSlotsAction when submitting a new slot", async () => {
    mockUpdate.mockResolvedValue({ success: true });

    render(<ProfileEditForm profile={MOCK_PROFILE} />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /add slot/i })[0]!);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /save profile/i }));
    });

    expect(mockScheduleUpdate).toHaveBeenCalledOnce();
    // New slot defaults to Mon 18:00; no gym in the profile, so gymId null
    expect(mockScheduleUpdate).toHaveBeenCalledWith({
      slots: [
        expect.objectContaining({
          day: "MONDAY",
          startTime: "18:00",
          endTime: null,
          gymId: null,
        }),
      ],
    });
  });
});
