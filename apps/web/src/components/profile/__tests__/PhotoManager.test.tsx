// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── Mocks (must be before component imports) ───────────────────────────────

vi.mock("@/lib/profile/actions", () => ({
  addPhotoAction: vi.fn(),
  deletePhotoAction: vi.fn(),
  reorderPhotosAction: vi.fn(),
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

// ── Imports after mocks ───────────────────────────────────────────────────

import { PhotoManager } from "../PhotoManager";

// ── Fixtures ──────────────────────────────────────────────────────────────

function makePhotos(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `photo-${i + 1}`,
    url: `https://example.com/photo-${i + 1}.jpg`,
    storagePath: `user-1/${i + 1}.jpg`,
    position: i,
  }));
}

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────
// Scenario B-3: PhotoManager UI hides add slot after 6 photos
// ─────────────────────────────────────────────────────────────────────────

describe("PhotoManager — add photo slot visibility", () => {
  it("does NOT render the add photo slot when photos.length === 6 (MAX_PHOTOS)", () => {
    render(<PhotoManager photos={makePhotos(6)} userId="user-1" />);

    expect(screen.queryByText("Add photo")).not.toBeInTheDocument();
  });

  it("renders the add photo slot when photos.length === 5 (below MAX_PHOTOS)", () => {
    render(<PhotoManager photos={makePhotos(5)} userId="user-1" />);

    expect(screen.getByText("Add photo")).toBeInTheDocument();
  });
});
