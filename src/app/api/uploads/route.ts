import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { getOwnerUser } from "@/lib/server/owner-auth";
import { hasSameOrigin, takeRateLimit } from "@/lib/server/request-security";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function hasExpectedSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

  const rate = takeRateLimit(req, "owner-upload", 20, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many uploads" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    const extension = MIME_EXTENSIONS[file.type];
    if (!extension || file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "รองรับเฉพาะ JPG, PNG หรือ WebP ขนาดไม่เกิน 8 MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedSignature(buffer, file.type)) {
      return NextResponse.json({ error: "ชนิดไฟล์ไม่ตรงกับเนื้อหา" }, { status: 400 });
    }
    
    // Generate unique filename
    const filename = `${crypto.randomBytes(16).toString("hex")}${extension}`;
    const folderPath = path.join(UPLOAD_DIR, "gallery");
    await fs.mkdir(folderPath, { recursive: true });

    // Save to persistent storage mounted by Docker.
    const filePath = path.join(folderPath, filename);
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/gallery/${filename}`;

    return NextResponse.json({ url, success: true });
  } catch (error: unknown) {
    console.error("Upload error:", error instanceof Error ? error.message : "Unknown upload error");
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
