import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateUsername } from "@/lib/auth/actions";

/**
 * Onboarding step 1 — username selection.
 *
 * Server component that renders a form bound to the updateUsername Server Action.
 * On valid submission: action redirects to /onboarding/birthdate.
 *
 * Constraints: 3–30 chars, alphanumeric + underscores only.
 */
export default function UsernamePage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/login"
        aria-label="Back"
        className="self-start text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </Link>
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold">Choose your username</h1>
        <p className="text-sm text-gray-500">
          3–30 characters. Letters, numbers, and underscores only.
        </p>
      </div>

      <form action={updateUsername} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="username" className="text-sm font-medium text-gray-700">
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            required
            minLength={3}
            maxLength={30}
            pattern="[a-zA-Z0-9_]+"
            placeholder="gym_beast_42"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
