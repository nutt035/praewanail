import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

export async function POST(req: NextRequest) {
  try {
    const { path: filePath } = await req.json();

    if (!filePath) return NextResponse.json({ error: "No path" }, { status: 400 });

    const fullPath = path.join(UPLOAD_DIR, filePath);
    
    // ป้องกัน Path Traversal
    if (!fullPath.startsWith(UPLOAD_DIR)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    await unlink(fullPath);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete error:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
