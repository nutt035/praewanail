import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { LineClient } from "@/lib/line-client";
import { ShopSettings, settingsToMap } from "@/lib/types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // ป้องกันการยิง API มั่วๆ (ถ้ามี Cron Secret ให้เช็ค)
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // 1. ดึง settings
    const { data: settingsData } = await supabase.from("shop_settings").select("*");
    const settings = settingsToMap(settingsData as ShopSettings[]);

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
    const lineClient = settings.line_channel_token ? new LineClient(settings.line_channel_token) : null;

    for (const booking of upcomingBookings) {
      const customerName = booking.customers?.name || "ลูกค้า";
      const startTime = new Date(booking.start_time).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
      
      // 3. แจ้งแอดมินทาง Telegram
      if (settings.telegram_bot_token && settings.telegram_chat_id) {
        const adminMsg = `⏰ <b>อีก 1 ชั่วโมง!</b>\n\nคิวของคุณ ${customerName} เวลา ${startTime} น.\nเตรียมตัวได้เลยค่ะ ✨`;
        const url = `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`;
        const chatIds = String(settings.telegram_chat_id).split(",").map(id => id.trim()).filter(Boolean);
        
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

  } catch (err: any) {
    console.error("[CRON_ERROR]:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
