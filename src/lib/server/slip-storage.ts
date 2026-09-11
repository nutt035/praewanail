import "server-only";

import crypto from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { extensionByMimeType, privateUploadsRoot, type ImageMimeType } from "./private-uploads";

export type SlipMimeType = ImageMimeType;

const mimeTypeByExtension: Record<string, SlipMimeType> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function bookingDirectory(bookingId: string): string {
  return path.join(privateUploadsRoot(), "slips", bookingId);
}

export async function storeBookingSlip(
  bookingId: string,
  imageBuffer: Buffer,
  mimeType: SlipMimeType,
): Promise<void> {
  const directory = bookingDirectory(bookingId);
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });

  const extension = extensionByMimeType[mimeType];
  const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  await fs.writeFile(path.join(directory, filename), imageBuffer, { mode: 0o600, flag: "wx" });

  const storedFiles = (await fs.readdir(directory))
    .filter((entry) => mimeTypeByExtension[path.extname(entry).toLowerCase()])
    .sort();

  await Promise.all(
    storedFiles.slice(0, -5).map((entry) => fs.unlink(path.join(directory, entry))),
  );
}

export async function readLatestBookingSlip(
  bookingId: string,
): Promise<{ bytes: Buffer; mimeType: SlipMimeType } | null> {
  const directory = bookingDirectory(bookingId);

  let entries: string[];
  try {
    entries = await fs.readdir(directory);
  } catch (error: unknown) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }

  const filename = entries
    .filter((entry) => mimeTypeByExtension[path.extname(entry).toLowerCase()])
    .sort()
    .at(-1);

  if (!filename) return null;

  const extension = path.extname(filename).toLowerCase();
  return {
    bytes: await fs.readFile(path.join(directory, filename)),
    mimeType: mimeTypeByExtension[extension],
  };
}
