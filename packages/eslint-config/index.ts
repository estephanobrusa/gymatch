import type { Linter } from "eslint";
import nextPlugin from "@next/eslint-plugin-next";

/**
 * Base flat config for all TypeScript projects.
 * Compose this in every workspace package's eslint.config.mjs.
 */
export const base: Linter.Config[] = [
  {
    rules: {
      "no-console": "warn",
      "no-debugger": "error",
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];

/**
 * Next.js-specific flat config.
 * Includes Next.js plugin rules + React rules.
 * Consume: import { next } from '@gymatch/eslint-config'
 */
export const next: Linter.Config[] = [
  ...base,
  {
    plugins: {
      "@next/next": nextPlugin,
    } as unknown as Linter.Config["plugins"],
    rules: {
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];

/**
 * React-specific flat config (non-Next.js React apps).
 * Consume: import { react } from '@gymatch/eslint-config'
 */
export const react: Linter.Config[] = [
  ...base,
  {
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
