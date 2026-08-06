import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "estimations";

    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
    const folderPath = path.join(UPLOAD_DIR, folder);

    // สร้าง folder ถ้ายังไม่มี
    await mkdir(folderPath, { recursive: true });

    const filePath = path.join(folderPath, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const publicUrl = `${BASE_URL}/uploads/${folder}/${fileName}`;
    const storagePath = `${folder}/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl, path: storagePath });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
