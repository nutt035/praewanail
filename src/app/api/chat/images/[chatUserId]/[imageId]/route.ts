import { NextResponse } from "next/server";
import { z } from "zod";
import { getOwnerUser } from "@/lib/server/owner-auth";
import { readLineImage } from "@/lib/server/line-image-storage";

const paramsSchema = z.object({ chatUserId: z.string().uuid(), imageId: z.string().uuid() });

export async function GET(_request: Request, context: { params: Promise<{ chatUserId: string; imageId: string }> }) {
  if (!await getOwnerUser()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) return NextResponse.json({ error: "Invalid image" }, { status: 400 });
  const image = await readLineImage(parsed.data.chatUserId, parsed.data.imageId);
  if (!image) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(image.bytes), {
    headers: { "Content-Type": image.mimeType, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" },
  });
}
