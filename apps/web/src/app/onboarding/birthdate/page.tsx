import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { updateBirthDate } from "@/lib/auth/actions";

/**
 * Onboarding step 2 — birth date.
 *
 * Server component with a date input bound to the updateBirthDate Server Action.
 * On valid submission: action validates 18+ years and redirects to /onboarding/photo.
 */
export default function BirthdatePage() {
  // Max date = today minus 18 years (browser-side hint; server also validates)
  const today = new Date();
  const maxDate = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate()
  )
    .toISOString()
    .split("T")[0];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/onboarding/username"
        aria-label="Back"
        className="self-start text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </Link>
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold">When were you born?</h1>
        <p className="text-sm text-gray-500">You must be at least 18 years old.</p>
      </div>

      <form action={updateBirthDate} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="birthDate" className="text-sm font-medium text-gray-700">
            Date of birth
          </label>
          <input
            id="birthDate"
            name="birthDate"
            type="date"
            required
            max={maxDate}
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
