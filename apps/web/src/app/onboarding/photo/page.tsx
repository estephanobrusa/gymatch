import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PhotoUploader } from "@/components/onboarding/PhotoUploader";

/**
 * Onboarding step 3 — profile photo upload.
 *
 * Server component shell — the actual upload logic lives in the
 * PhotoUploader client component (needs browser APIs for file selection).
 */
export default function PhotoPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/onboarding/birthdate"
        aria-label="Back"
        className="self-start text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={20} aria-hidden="true" />
      </Link>
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold">Add a profile photo</h1>
        <p className="text-sm text-gray-500">
          At least one photo is required. You can add more later.
        </p>
      </div>

      <PhotoUploader />
    </div>
  );
}
