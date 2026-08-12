/**
 * Browser-side preparation for Facebook Pack images.
 *
 * Facebook photos and full-page screenshots are often several megabytes each.
 * The vision request has a 20 MB raw-image ceiling, so accepting twelve files
 * at their original size makes the advertised item limit largely fictional.
 * Files above the per-item target are resized and encoded as WebP before they
 * ever reach Convex storage. Small files are left byte-for-byte unchanged.
 */

import {
  PACK_ANALYSIS_MAX_TOTAL_BYTES,
  PACK_MAX_IMAGE_ITEMS,
} from "./facebookPack";

/** Leaves roughly 2 MB of headroom across a full twelve-image pack. */
export const PACK_UPLOAD_TARGET_BYTES = Math.floor(
  (PACK_ANALYSIS_MAX_TOTAL_BYTES - 2 * 1024 * 1024) / PACK_MAX_IMAGE_ITEMS,
);

const MAX_EDGE_PX = 2048;
const MIN_EDGE_PX = 720;
const WEBP_QUALITIES = [0.84, 0.74, 0.64, 0.54] as const;

export type PreparedPackImage = {
  file: File;
  optimized: boolean;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`${file.name || "Image"} could not be decoded.`));
    };
    image.src = url;
  });
}

function encodeWebp(
  image: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not prepare the image.");
  context.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("This browser could not compress the image.")),
      "image/webp",
      quality,
    );
  });
}

export async function preparePackImage(file: File): Promise<PreparedPackImage> {
  if (file.size <= PACK_UPLOAD_TARGET_BYTES) {
    return { file, optimized: false };
  }

  const image = await loadImage(file);
  const originalEdge = Math.max(image.naturalWidth, image.naturalHeight);
  let scale = Math.min(1, MAX_EDGE_PX / originalEdge);
  let best: Blob | null = null;

  while (Math.round(originalEdge * scale) >= MIN_EDGE_PX) {
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    for (const quality of WEBP_QUALITIES) {
      const blob = await encodeWebp(image, width, height, quality);
      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= PACK_UPLOAD_TARGET_BYTES) {
        best = blob;
        break;
      }
    }
    if (best && best.size <= PACK_UPLOAD_TARGET_BYTES) break;
    scale *= 0.8;
  }

  if (!best || best.size >= file.size) {
    return { file, optimized: false };
  }

  const stem = (file.name || "facebook-pack-image").replace(/\.[^.]+$/, "");
  return {
    file: new File([best], `${stem}.webp`, {
      type: "image/webp",
      lastModified: file.lastModified,
    }),
    optimized: true,
  };
}
