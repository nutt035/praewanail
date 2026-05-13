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
      if (event.type === "message" && event.message.type === "image") {
        await handleImageMessage(line, supabase, userId, event.message.id);
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
async function handleImageMessage(
  line: LineClient,
  db: any,
  userId: string,
  messageId: string
) {
  try {
    // หา customer จาก line_accounts (PK = line_user_id)
    let customerId: string | null = null;

    const { data: lineAccount } = await db
      .from("line_accounts")
      .select("customer_id")
      .eq("line_user_id", userId)
      .single();

    if (lineAccount) {
      customerId = lineAccount.customer_id;
    } else {
      // fallback: ค้นหาจาก customers.line_id
      const { data: cust } = await db
        .from("customers")
        .select("id")
        .eq("line_id", userId)
        .single();
      if (cust) customerId = cust.id;
    }

    if (!customerId) {
      return;
    }

    // หา booking ล่าสุด
    const { data: booking } = await db
      .from("bookings")
      .select("id, status, deposit_paid, booking_code, start_time, customers(name, phone)")
      .eq("customer_id", customerId)
      .neq("status", "cancelled")
      .neq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!booking) {
      return;
    }

    // ถ้ายังไม่ชำระมัดจำ → ลองตรวจสลิป
    if (!booking.deposit_paid) {
      // ดึง SlipOK settings
      const { data: settings } = await db
        .from("shop_settings")
        .select("key, value")
        .in("key", ["slipok_branch_id", "slipok_api_key"]);

      const settingsMap: Record<string, string> = {};
      (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

      if (settingsMap.slipok_branch_id && settingsMap.slipok_api_key) {
        const imageBuffer = await line.getMessageContent(messageId);
        if (imageBuffer) {
          const result = await verifySlip(
            imageBuffer,
            settingsMap.slipok_branch_id,
            settingsMap.slipok_api_key
          );

          if (result.success && result.data) {
            // บันทึก payment
            await db.from("payments").insert([{
              booking_id: booking.id,
              amount: result.data.amount,
              payment_type: "deposit",
              payment_status: "verified",
              slip_verified: true,
              transaction_id: result.data.transRef,
            }]);

            await db.from("bookings").update({
              deposit_paid: true,
              deposit: result.data.amount,
              payment_method: "promptpay",
            }).eq("id", booking.id);

            await db.from("transactions").insert([{
              type: "income",
              amount: result.data.amount,
              category: "มัดจำ (LINE)",
              booking_id: booking.id,
            }]);

            const cName = booking.customers?.name || "ลูกค้า";
            const cPhone = booking.customers?.phone || "ไม่ระบุเบอร์";
            const sDate = new Date(booking.start_time).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
            const sTime = new Date(booking.start_time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });

            await line.sendPaymentConfirmation(userId, cName, cPhone, sDate, sTime);
            return;
          }
        }
      }

      return;
    }

    // ถ้าชำระแล้ว → เป็นรูปแบบเล็บ (แอดมินจะมาดูเอง ไม่ต้องให้บอทตอบ)
    await db.from("bookings").update({
      design_image_url: `line:${messageId}`,
    }).eq("id", booking.id);

  } catch (e: any) {
    console.error("[LINE_IMAGE_ERROR]:", e);
  }
}
