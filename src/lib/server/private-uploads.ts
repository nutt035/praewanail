import "server-only";

import path from "node:path";

export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export const extensionByMimeType: Record<ImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function privateUploadsRoot(): string {
  return process.env.PRIVATE_UPLOAD_DIR?.trim() || path.join(process.cwd(), "private_uploads");
}
