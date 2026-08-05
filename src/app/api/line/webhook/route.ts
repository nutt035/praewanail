import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { LineClient } from "@/lib/line-client";
import { getOrCreateChatUser, saveChatMessage } from "@/lib/chat-service";
import { getSharedShopSettings } from "@/lib/server/shop-context";
import { getDepositAmount } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

type LineWebhookEvent = {
  type?: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
};

function hasValidLineSignature(rawBody: string, signature: string | null): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret || !signature) return false;

  const expected = Buffer.from(
    createHmac("sha256", channelSecret).update(rawBody).digest("base64"),
  );
  const received = Buffer.from(signature);

  return expected.length === received.length && timingSafeEqual(expected, received);
}

/** LINE Webhook Handler */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-line-signature");

    if (!hasValidLineSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid LINE signature" }, { status: 401 });
    }

    let body: { events?: LineWebhookEvent[] };
    try {
      body = JSON.parse(rawBody) as { events?: LineWebhookEvent[] };
    } catch {
      return NextResponse.json({ error: "Invalid LINE payload" }, { status: 400 });
    }

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
      if (event.type === "message" && event.message?.type === "text") {
        const text = event.message.text?.trim();
        if (!text) continue;
        
        // 1. จัดการระบบ Chat (เก็บข้อความ)
        const profile = await line.getProfile(userId).catch(() => null);
        const chatUserId = await getOrCreateChatUser("line", userId, profile?.displayName, profile?.pictureUrl);
        if (chatUserId) {
          await saveChatMessage(chatUserId, "inbound", text);
        }

        // 2. ระบบจองคิว
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
      if (event.type === "message" && event.message?.type === "image") {
        continue;
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[LINE_WEBHOOK_ERROR]:", error);
    return NextResponse.json({ message: "OK" }, { status: 200 });
  }
}

/** ผูก LINE กับ booking */
async function handleBookingLink(
  line: LineClient,
  db: SupabaseClient,
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

    const bookingCustomer = Array.isArray(booking.customers)
      ? booking.customers[0]
      : booking.customers;
    const customerName = bookingCustomer?.name || displayName;

    if (booking.deposit_paid) {
      // ชำระแล้ว → ขอรูปแบบเล็บ
      await line.sendWelcomeDesignRequest(userId, customerName);
    } else {
      // ยังไม่ชำระ → แจ้งให้ชำระก่อน
      const sharedSettings = await getSharedShopSettings();
      const depositAmount = getDepositAmount(sharedSettings);
      await line.pushMessage(userId,
        `สวัสดีค่ะ คุณ${customerName}! 💅\n\nยืนยันตัวตนเรียบร้อยแล้วค่ะ\n\nกรุณาชำระมัดจำ ฿${depositAmount.toLocaleString("th-TH")} ก่อนนะคะ แล้วส่งรูปแบบเล็บที่ต้องการมาได้เลย ✨${sharedSettings.booking_policy ? `\n\n${sharedSettings.booking_policy}` : ""}`
      );
    }
  } catch (e) {
    console.error("[LINE_LINK_ERROR]:", e);
    await line.pushMessage(userId, "เกิดข้อผิดพลาด กรุณาแจ้งแอดมินค่ะ");
  }
}

/** รับรูปจาก LINE (แบบเล็บ หรือ สลิป) */

