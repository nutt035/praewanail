import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { LineClient } from "@/lib/line-client";
import { resolveLineConfig } from "@/lib/server/line-config";
import { resolveTelegramConfig } from "@/lib/server/telegram-config";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";

function validCronAuthorization(header: string | null, secret: string) {
  if (!header?.startsWith("Bearer ")) return false;
  const received = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error("[CRON_NOT_CONFIGURED]");
      return NextResponse.json({ error: "Cron is not configured" }, { status: 503 });
    }
    const authHeader = req.headers.get("authorization");
    if (!validCronAuthorization(authHeader, cronSecret)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const supabase = createSupabaseAdminClient();
    const lineConfig = resolveLineConfig();
    const telegramConfig = resolveTelegramConfig();

    // 2. ดึงคิวที่จะถึงใน 60-75 นาทีข้างหน้า และยังไม่ส่งแจ้งเตือน (แต่เราไม่ได้ทำคอลัมน์ reminder_sent ไว้)
    // วิธีแก้เบื้องต้น: เราเช็คว่าเริ่มใน 60-75 นาที (ถ้า cron รันทุก 15 นาที มันจะเจอคิวนี้แค่รอบเดียว)
    const now = new Date();
    const in60mins = new Date(now.getTime() + 60 * 60 * 1000);
    const in75mins = new Date(now.getTime() + 75 * 60 * 1000);

    const { data: upcomingBookings } = await supabase
      .from("bookings")
      .select("*, customers(name, line_id)")
      .eq("status", "confirmed") // แจ้งเตือนเฉพาะคิวที่ยืนยันแล้ว
      .gte("start_time", in60mins.toISOString())
      .lt("start_time", in75mins.toISOString());

    if (!upcomingBookings || upcomingBookings.length === 0) {
      return NextResponse.json({ message: "No upcoming bookings" }, { status: 200 });
    }

    let notifiedCount = 0;
    const lineClient = lineConfig ? new LineClient(lineConfig.accessToken) : null;

    for (const booking of upcomingBookings) {
      const customerName = booking.customers?.name || "ลูกค้า";
      const startTime = new Date(booking.start_time).toLocaleTimeString("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit" });
      
      // 3. แจ้งแอดมินทาง Telegram
      if (telegramConfig) {
        const adminMsg = `⏰ <b>อีก 1 ชั่วโมง!</b>\n\nคิวของคุณ ${customerName} เวลา ${startTime} น.\nเตรียมตัวได้เลยค่ะ ✨`;
        const url = `https://api.telegram.org/bot${telegramConfig.token}/sendMessage`;
        const chatIds = String(telegramConfig.chatIds).split(",").map(id => id.trim()).filter(Boolean);
        
        await Promise.all(chatIds.map(id => 
          fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: id, text: adminMsg, parse_mode: "HTML" })
          }).catch(() => {})
        ));
      }

      // 4. แจ้งลูกค้าทาง LINE (ถ้าลูกค้าเคยผูก LINE)
      const customerLineId = booking.customers?.line_id;
      if (lineClient && customerLineId) {
        const custMsg = `🔔 แจ้งเตือนคิวทำเล็บค่ะ!\n\nคุณ ${customerName} มีคิวทำเล็บเวลา ${startTime} น. นี้นะคะ\nร้านเราอยู่ [รออัพเดทแผนที่] \nเดินทางมาปลอดภัยนะคะ 💕`;
        await lineClient.pushMessage(customerLineId, custMsg).catch(() => {});
      }

      notifiedCount++;
    }

    return NextResponse.json({ success: true, notified: notifiedCount }, { status: 200 });

  } catch (err: unknown) {
    console.error("[CRON_ERROR]:", err instanceof Error ? err.message : "Unknown cron error");
    return NextResponse.json({ error: "Reminder job failed" }, { status: 500 });
  }
}
