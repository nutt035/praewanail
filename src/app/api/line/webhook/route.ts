import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LineClient } from "@/lib/line-client";
import { verifySlip } from "@/lib/slipok";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

/** LINE Webhook Handler */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json({ message: "OK" }, { status: 200 });
    }

    const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!channelToken) {
      console.error("[LINE_WEBHOOK]: Missing LINE_CHANNEL_ACCESS_TOKEN");
      return NextResponse.json({ message: "OK" }, { status: 200 });
    }

    const line = new LineClient(channelToken);

    for (const event of events) {
      const userId = event.source?.userId;
      if (!userId) continue;

      // === Text Messages ===
      if (event.type === "message" && event.message.type === "text") {
        const text = event.message.text.trim();
        const bookingMatch = text.match(/BKG-([A-Z0-9]{4})/i);

        if (bookingMatch) {
          const bookingCode = bookingMatch[0].toUpperCase();
          await handleBookingLink(line, supabase, userId, bookingCode);
          continue;
        }

        // เอา auto-reply ออกทั้งหมดตามคำขอ เพื่อไม่ให้รบกวนแอดมินตอนแชท
        continue;
      }

      // === Image Messages ===
      // ลูกค้าบอกว่าให้บอทตอบแค่รหัสจองพอ (เอา SlipOK และการจัดการรูปออกทั้งหมด)
      if (event.type === "message" && event.message.type === "image") {
        continue;
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("[LINE_WEBHOOK_ERROR]:", error);
    return NextResponse.json({ message: "OK" }, { status: 200 });
  }
}

/** ผูก LINE กับ booking */
async function handleBookingLink(
  line: LineClient,
  db: any,
  userId: string,
  bookingCode: string
) {
  try {
    // ดึง booking
    const { data: booking } = await db
      .from("bookings")
      .select("id, customer_id, deposit_paid, status, customers(name)")
      .eq("booking_code", bookingCode)
      .single();

    if (!booking) {
      await line.pushMessage(userId, `ขออภัยค่ะ ไม่พบรหัสการจอง ${bookingCode}`);
      return;
    }

    // ดึง profile
    const profile = await line.getProfile(userId);
    const displayName = profile?.displayName || "ลูกค้า";

    // บันทึก line_accounts
    await db.from("line_accounts").upsert({
      line_user_id: userId,
      customer_id: booking.customer_id,
      display_name: displayName,
      picture_url: profile?.pictureUrl || null,
      linked_at: new Date().toISOString(),
    }, { onConflict: "line_user_id" });

    // อัพเดต customer
    await db.from("customers")
      .update({ line_id: userId })
      .eq("id", booking.customer_id);

    // อัพเดต booking
    await db.from("bookings")
      .update({ has_line_linked: true })
      .eq("id", booking.id);

    const customerName = booking.customers?.name || displayName;

    if (booking.deposit_paid) {
      // ชำระแล้ว → ขอรูปแบบเล็บ
      await line.sendWelcomeDesignRequest(userId, customerName);
    } else {
      // ยังไม่ชำระ → แจ้งให้ชำระก่อน
      await line.pushMessage(userId,
        `สวัสดีค่ะ คุณ${customerName}! 💅\n\nยืนยันตัวตนเรียบร้อยแล้วค่ะ\n\nกรุณาชำระมัดจำก่อนนะคะ แล้วส่งรูปแบบเล็บที่ต้องการมาได้เลย ✨`
      );
    }
  } catch (e: any) {
    console.error("[LINE_LINK_ERROR]:", e);
    await line.pushMessage(userId, "เกิดข้อผิดพลาด กรุณาแจ้งแอดมินค่ะ");
  }
}

/** รับรูปจาก LINE (แบบเล็บ หรือ สลิป) */

