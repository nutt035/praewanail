import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, imageUrl, to, messages: customMessages } = body;

    if (!message && !customMessages) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 1. Fetch shop settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("shop_settings")
      .select("*");

    if (settingsError || !settingsData) {
      return NextResponse.json({ error: "Could not fetch settings" }, { status: 500 });
    }

    const settings = settingsToMap(settingsData);

    // 2. Telegram Logic (Keep for admin)
    const telegramToken = settings.telegram_bot_token;
    const telegramChatId = settings.telegram_chat_id;

    if (telegramToken && telegramChatId && !to) { // Only send to admin if no specific recipient 'to'
      const chatIds = String(telegramChatId).split(",").map((id: string) => id.trim()).filter(Boolean);
      await Promise.all(chatIds.map(async (id) => {
        const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: id,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true
          })
        });
      }));
    }

    // 3. LINE Logic (Support both admin and specific user 'to')
    const channelToken = settings.line_channel_token;
    if (!channelToken) return NextResponse.json({ error: "No LINE token" }, { status: 400 });

    // กำหนดผู้รับ: ถ้ามี 'to' ให้ส่งคนนั้น ถ้าไม่มีให้ส่ง admin
    const recipients = to ? [to] : (settings.admin_line_uid || "").split(",").map((s: string) => s.trim()).filter(Boolean);

    if (recipients.length === 0) return NextResponse.json({ success: true, message: "No recipients" });

    // กำหนดข้อความ: ถ้ามี customMessages ให้ใช้เลย ถ้าไม่มีให้สร้างจาก message
    const lineMessages = customMessages || [{ type: "text", text: message }];
    if (!customMessages && imageUrl) {
      lineMessages.push({ type: "image", originalContentUrl: imageUrl, previewImageUrl: imageUrl });
    }

    const results = await Promise.all(recipients.map(async (target: string) => {
      try {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${channelToken}`,
          },
          body: JSON.stringify({ to: target, messages: lineMessages }),
        });
        return { uid: target, ok: res.ok, status: res.status };
      } catch (err) { return { uid: target, ok: false, error: err }; }
    }));

    return NextResponse.json({ success: true, results });

  } catch (error) {
    console.error("Notify Dispatcher Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Helper to flatten shop_settings table (since it's key-value pairs)
function settingsToMap(data: any[]) {
  const map: Record<string, any> = {};
  data.forEach(item => {
    map[item.key] = item.value;
  });
  return map;
}
