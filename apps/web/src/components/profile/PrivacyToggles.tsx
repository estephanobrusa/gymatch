"use client";

import { useState, useTransition } from "react";
import { EyeOff, Ghost } from "lucide-react";
import { setHideProfileAction, setIncognitoModeAction } from "@/lib/profile/actions";

interface PrivacyTogglesProps {
  initialHideProfile: boolean;
  initialIncognitoMode: boolean;
}

interface ToggleRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}

function ToggleRow({ icon, label, description, checked, disabled, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-muted-foreground">{icon}</span>
        <div>
          <p className="text-sm font-medium leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 ${
          checked ? "bg-brand-500" : "bg-muted"
        }`}
      >
        <span
          className={`block w-4 h-4 rounded-full bg-white shadow-sm absolute top-1 transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

export function PrivacyToggles({ initialHideProfile, initialIncognitoMode }: PrivacyTogglesProps) {
  const [hideProfile, setHideProfile] = useState(initialHideProfile);
  const [incognitoMode, setIncognitoMode] = useState(initialIncognitoMode);
  const [isPending, startTransition] = useTransition();

  function handleHideProfile(next: boolean) {
    setHideProfile(next);
    startTransition(async () => {
      const result = await setHideProfileAction(next);
      if ("error" in result) {
        // Roll back on error
        setHideProfile(!next);
      }
    });
  }

  function handleIncognito(next: boolean) {
    setIncognitoMode(next);
    startTransition(async () => {
      const result = await setIncognitoModeAction(next);
      if ("error" in result) {
        setIncognitoMode(!next);
      }
    });
  }

  return (
    <div className="w-full flex flex-col">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        Privacy
      </p>
      <div className="divide-y divide-border">
        <ToggleRow
          icon={<EyeOff size={16} />}
          label="Hide profile"
          description="Pause discovery without deleting your account. You can still browse and chat."
          checked={hideProfile}
          disabled={isPending}
          onChange={handleHideProfile}
        />
        <ToggleRow
          icon={<Ghost size={16} />}
          label="Incognito mode"
          description="Browse without appearing in other users' views, gymbro lists, or event attendees."
          checked={incognitoMode}
          disabled={isPending}
          onChange={handleIncognito}
        />
      </div>
    </div>
  );
}
