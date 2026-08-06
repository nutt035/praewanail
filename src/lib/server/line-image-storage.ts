import "server-only";

import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export type LineImageMime = "image/jpeg" | "image/png" | "image/webp";

const extensionByMime: Record<LineImageMime, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
};

function root() {
  return path.join(process.env.PRIVATE_UPLOAD_DIR?.trim() || path.join(process.cwd(), "private_uploads"), "line-chat");
}

export function detectLineImageMime(buffer: Buffer): LineImageMime {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return "image/jpeg";
}

export async function storeLineImage(chatUserId: string, buffer: Buffer, mimeType: LineImageMime) {
  const imageId = crypto.randomUUID();
  const directory = path.join(root(), chatUserId);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(directory, `${imageId}.${extensionByMime[mimeType]}`), buffer, { mode: 0o600, flag: "wx" });
  return { imageId, url: `/api/chat/images/${chatUserId}/${imageId}` };
}

export async function readLineImage(chatUserId: string, imageId: string) {
  for (const mimeType of Object.keys(extensionByMime) as LineImageMime[]) {
    try {
      const bytes = await fs.readFile(path.join(root(), chatUserId, `${imageId}.${extensionByMime[mimeType]}`));
      return { bytes, mimeType };
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
    }
  }
  return null;
}
