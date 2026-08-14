"use client";

import { useState, useEffect } from "react";
import { searchGymsAction, saveGymAction } from "@/lib/gym/actions";
import type { GymSearchResult } from "@/lib/gym/actions";

// ── Types ──────────────────────────────────────────────────────────────────

interface GymValue {
  id: string;
  name: string;
  address?: string;
}

interface GymSearchProps {
  value?: GymValue | null;
  onChange?: (gym: GymValue | null) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function GymSearch({ value, onChange }: GymSearchProps) {
  const [inputValue, setInputValue] = useState("");
  const [results, setResults] = useState<GymSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // ── Debounced search ─────────────────────────────────────────────────────

  useEffect(() => {
    if (inputValue.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setIsOpen(true);
      const found = await searchGymsAction(inputValue);
      setResults(found.slice(0, 5));
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleSelect(gym: GymSearchResult) {
    await saveGymAction(gym.placeId, gym.name, gym.address);
    onChange?.({ id: gym.placeId, name: gym.name, address: gym.address });
    setIsOpen(false);
    setInputValue("");
    setResults([]);
  }

  function handleClear() {
    onChange?.(null);
    setInputValue("");
    setResults([]);
    setIsOpen(false);
  }

  // ── Selected state (pill) ─────────────────────────────────────────────────

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 text-brand-700 rounded-lg text-sm">
        <span>{value.name}</span>
        <button
          type="button"
          aria-label="×"
          onClick={handleClear}
          className="flex items-center justify-center w-6 h-6 rounded-full text-brand-700 hover:bg-brand-100 transition-colors"
        >
          ×
        </button>
      </div>
    );
  }

  // ── Search state ──────────────────────────────────────────────────────────

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <div aria-live="polite">
        {isOpen && (
          <ul className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-md max-h-48 overflow-y-auto">
            {isLoading ? (
              <li className="px-4 py-2 text-sm">Searching...</li>
            ) : results.length > 0 ? (
              results.map((gym) => (
                <li
                  key={gym.placeId}
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-muted"
                  onClick={() => {
                    void handleSelect(gym);
                  }}
                >
                  {gym.name}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-sm">No gyms found</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
