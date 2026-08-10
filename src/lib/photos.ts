import type { AreaPhoto } from "./types";

const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.72;
const MAX_PHOTOS_PER_AREA = 12;

export function maxPhotosPerArea(): number {
  return MAX_PHOTOS_PER_AREA;
}

function newPhotoId(): string {
  return `photo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read ${file.name}`));
    };
    img.src = url;
  });
}

/** Resize + JPEG-compress a file for offline draft storage */
export async function compressImageFile(file: File): Promise<AreaPhoto> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(img, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return {
    id: newPhotoId(),
    name: file.name || "photo.jpg",
    dataUrl,
    addedAt: new Date().toISOString(),
  };
}

export async function compressImageFiles(files: FileList | File[]): Promise<{
  photos: AreaPhoto[];
  errors: string[];
}> {
  const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
  const photos: AreaPhoto[] = [];
  const errors: string[] = [];
  for (const file of list) {
    try {
      photos.push(await compressImageFile(file));
    } catch (err) {
      errors.push(
        err instanceof Error ? err.message : `Failed to add ${file.name}`,
      );
    }
  }
  return { photos, errors };
}

export function mergeAreaPhotos(
  existing: AreaPhoto[],
  incoming: AreaPhoto[],
  max = MAX_PHOTOS_PER_AREA,
): { photos: AreaPhoto[]; truncated: number } {
  const merged = [...existing, ...incoming];
  if (merged.length <= max) return { photos: merged, truncated: 0 };
  return {
    photos: merged.slice(0, max),
    truncated: merged.length - max,
  };
}
