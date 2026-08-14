"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { addPhotoAction } from "@/lib/profile/actions";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const BUCKET = "profile-photos";

/**
 * PhotoUploader — client component.
 *
 * Flow:
 *   1. User selects a file (jpeg/png/webp, max 5 MB)
 *   2. On submit: uploads the file to Supabase Storage (profile-photos bucket)
 *   3. Retrieves the public URL and the storage path within the bucket
 *   4. Calls addPhotoAction(url, storagePath) which creates the DB record
 *   5. Redirects to / on success
 *
 * Error handling is done via local state — errors are shown inline.
 */
export function PhotoUploader() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError("File size must be 5 MB or less.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Please select a photo first.");
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed.");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError("File size must be 5 MB or less.");
      return;
    }

    setUploading(true);

    try {
      const supabase = createClient();

      // Build a unique path: {userId-timestamp}.{ext}
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

      if (!urlData?.publicUrl) {
        throw new Error("Could not retrieve public URL after upload.");
      }

      // Save URL and storage path — storagePath enables future deletion from bucket
      const result = await addPhotoAction(urlData.publicUrl, path);
      if ("error" in result) {
        throw new Error(result.error);
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* File input */}
      <div className="flex flex-col gap-1">
        <label htmlFor="photo" className="text-sm font-medium text-gray-700">
          Profile photo
        </label>
        <input
          ref={inputRef}
          id="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          onChange={handleFileChange}
          className="text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-600 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-brand-700"
        />
        <p className="text-xs text-gray-400">JPEG, PNG, or WebP — max 5 MB</p>
      </div>

      {/* Preview */}
      {preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Preview"
          className="h-40 w-40 rounded-full object-cover self-center border-2 border-gray-200"
        />
      )}

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={uploading}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? "Uploading…" : "Upload photo"}
      </button>
    </form>
  );
}
