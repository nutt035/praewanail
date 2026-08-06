import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { hasOwnerSession } from "@/lib/server/owner-auth";
import { readLatestBookingSlip } from "@/lib/server/slip-storage";

const bookingIdSchema = z.string().uuid();

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await hasOwnerSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const parsedId = bookingIdSchema.safeParse(id);
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
  }

  const slip = await readLatestBookingSlip(parsedId.data);
  if (!slip) {
    return NextResponse.json({ error: "ยังไม่มีสลิปสำหรับคิวนี้" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(slip.bytes), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": "inline",
      "Content-Type": slip.mimeType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
