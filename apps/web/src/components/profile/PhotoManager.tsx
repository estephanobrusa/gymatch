"use client";

import { useState, useRef } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addPhotoAction,
  deletePhotoAction,
  reorderPhotosAction,
} from "@/lib/profile/actions";

interface Photo {
  id: string;
  url: string;
  storagePath?: string | null;
  position: number;
}

interface PhotoManagerProps {
  photos: Array<{ id: string; url: string; storagePath?: string | null; position: number }>;
  userId: string;
}

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function PhotoManager({ photos: initialPhotos, userId }: PhotoManagerProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Drag state ────────────────────────────────────────────────────────────
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleDragStart(index: number) {
    dragIndexRef.current = index;
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const reordered = [...photos];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved!);

    setPhotos(reordered);
    setDragOverIndex(null);
    dragIndexRef.current = null;

    void reorderPhotosAction(reordered.map((p) => p.id));
  }

  function handleDragEnd() {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  }

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("File must be under 5 MB.");
      e.target.value = "";
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only JPEG, PNG, and WebP images are allowed.");
      e.target.value = "";
      return;
    }

    setIsUploading(true);

    const storagePath = `${userId}/${Date.now()}-${file.name}`;
    const supabase = createClient();

    const { error } = await supabase.storage
      .from("profile-photos")
      .upload(storagePath, file);

    if (error) {
      setUploadError("Upload failed. Please try again.");
      setIsUploading(false);
      e.target.value = "";
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("profile-photos")
      .getPublicUrl(storagePath);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Photo = { id: tempId, url: publicUrl, storagePath, position: photos.length };
    setPhotos((prev) => [...prev, optimistic]);

    const result = await addPhotoAction(publicUrl, storagePath);

    if ("error" in result) {
      setPhotos((prev) => prev.filter((p) => p.id !== tempId));
      setUploadError(result.error);
    } else {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === tempId
            ? { id: result.photo.id, url: result.photo.url, storagePath, position: result.photo.position }
            : p
        )
      );
    }

    setIsUploading(false);
    e.target.value = "";
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(photoId: string) {
    setDeletingId(photoId);
    const snapshot = photos;
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    const result = await deletePhotoAction(photoId);
    if ("error" in result) setPhotos(snapshot);
    setDeletingId(null);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {uploadError && (
        <p className="text-sm text-destructive mb-2" role="alert">{uploadError}</p>
      )}

      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragOver={(e) => handleDragOver(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onDragEnd={handleDragEnd}
            className={`relative cursor-grab active:cursor-grabbing transition-opacity ${
              dragOverIndex === i ? "opacity-50 ring-2 ring-brand-500 rounded-xl" : ""
            }`}
          >
            {/* Main badge */}
            {i === 0 && (
              <span className="absolute top-1 left-1 z-10 px-1.5 py-0.5 text-[10px] font-semibold bg-brand-500 text-white rounded-full">
                Main
              </span>
            )}

            <img
              src={photo.url}
              alt={`Profile photo ${i + 1}`}
              className="w-full aspect-square object-cover rounded-xl select-none"
              draggable={false}
            />

            {/* Delete button — centered X */}
            <button
              type="button"
              aria-label="Delete photo"
              onClick={() => void handleDelete(photo.id)}
              disabled={deletingId === photo.id}
              className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-black/80 transition-colors"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        ))}

        {/* Add photo slot */}
        {photos.length < MAX_PHOTOS && (
          <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-brand-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => void handleUpload(e)}
              disabled={isUploading}
            />
            <span className="text-2xl text-muted-foreground mb-1">+</span>
            <span className="text-xs text-muted-foreground text-center px-1">
              {isUploading ? "Uploading..." : "Add photo"}
            </span>
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground mt-2">Drag photos to reorder</p>
    </div>
  );
}
