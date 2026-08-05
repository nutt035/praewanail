import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { confirmDataReview, getDataReviewData } from "@/lib/server/data-review";
import { getOwnerUser } from "@/lib/server/owner-auth";
import { writeAuditLog } from "@/lib/server/audit-log";

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const policySchema = z.string().trim().min(10).max(2000);
const confirmSchema = z.object({
  weekdayOpen: timeSchema,
  weekdayClose: timeSchema,
  weekendOpen: timeSchema,
  weekendClose: timeSchema,
  depositAmount: z.number().int().min(0).max(10000),
  bookingPolicy: policySchema,
  cancellationPolicy: policySchema,
  walkInPolicy: policySchema,
  repairPolicy: policySchema,
});

function minutes(value: string) {
  const [hours, minute] = value.split(":").map(Number);
  return hours * 60 + minute;
}

function hasValidOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

export async function GET() {
  const owner = await getOwnerUser();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json({ review: await getDataReviewData() });
  } catch (error) {
    console.error("[DATA_REVIEW_GET_ERROR]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "โหลดข้อมูลตรวจสอบไม่สำเร็จ" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasValidOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });

  const parsed = confirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ โดยนโยบายแต่ละข้ออย่างน้อย 10 ตัวอักษร" }, { status: 400 });
  }
  if (minutes(parsed.data.weekdayClose) <= minutes(parsed.data.weekdayOpen)
    || minutes(parsed.data.weekendClose) <= minutes(parsed.data.weekendOpen)) {
    return NextResponse.json({ error: "เวลาปิดร้านต้องอยู่หลังเวลาเปิดร้าน" }, { status: 400 });
  }

  try {
    const before = await getDataReviewData();
    const result = await confirmDataReview(parsed.data, owner.email || "owner");
    const after = await getDataReviewData();

    await writeAuditLog({
      action: "shop.data_review.confirmed",
      actorType: "owner",
      actorUserId: owner.id,
      actorEmail: owner.email,
      entityType: "shop_data_review",
      entityId: "current",
      beforeData: { values: before.values, isConfirmed: before.isConfirmed },
      afterData: { values: after.values, isConfirmed: after.isConfirmed },
      metadata: { serviceCount: result.services.length, version: 1 },
      request,
    });

    return NextResponse.json({ success: true, review: after });
  } catch (error) {
    console.error("[DATA_REVIEW_CONFIRM_ERROR]", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "ยืนยันข้อมูลไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
