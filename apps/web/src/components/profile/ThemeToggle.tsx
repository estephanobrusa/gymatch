"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";

const THEMES = [
  { value: "system", icon: Monitor, label: "System" },
  { value: "light", icon: Sun, label: "Light" },
  { value: "dark", icon: Moon, label: "Dark" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-muted">
      {THEMES.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          aria-label={label}
          className={`p-2 rounded-full transition-colors ${
            theme === value
              ? "bg-white dark:bg-zinc-800 text-brand-600 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>
  );
}
