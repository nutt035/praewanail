import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, imageUrl } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 1. Fetch shop settings to determine notification channel
    const { data: settingsData, error: settingsError } = await supabase
      .from("shop_settings")
      .select("*");

    if (settingsError || !settingsData) {
      console.error("Failed to fetch shop settings:", settingsError);
      return NextResponse.json({ error: "Could not determine notification channel" }, { status: 500 });
    }

    const settings = settingsToMap(settingsData);

    // 2. Check for Telegram Configuration First (Priority)
    const telegramToken = settings.telegram_bot_token;
    const telegramChatId = settings.telegram_chat_id;

    if (telegramToken && telegramChatId) {
      const chatIds = String(telegramChatId).split(",").map((id: string) => id.trim()).filter(Boolean);

      const results = await Promise.all(chatIds.map(async (id) => {
        const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: id,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true
          })
        });
        return { id, ok: res.ok };
      }));

      const allOk = results.every(r => r.ok);
      if (allOk) {
        return NextResponse.json({ success: true, channel: "telegram", results });
      }
      console.error("Telegram notification partially failed:", results);
    }

    // 3. Fallback to LINE if Telegram is not configured or failed
    const channelToken = settings.line_channel_token;
    const adminUid = settings.admin_line_uid;

    if (!channelToken || !adminUid) {
      return NextResponse.json({ error: "No valid notification channel configured" }, { status: 400 });
    }

    const uids = adminUid.split(",").map((s: string) => s.trim()).filter((s: string) => s !== "");

    const lineMessages = [{ type: "text", text: message }];
    if (imageUrl) {
      lineMessages.push({
        type: "image",
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
      });
    }

    const results = await Promise.all(uids.map(async (to: string) => {
      try {
        const res = await fetch("https://api.line.me/v2/bot/message/push", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${channelToken}`,
          },
          body: JSON.stringify({ to, messages: lineMessages }),
        });
        return { uid: to, ok: res.ok, status: res.status };
      } catch (err) {
        return { uid: to, ok: false, error: err };
      }
    }));

    return NextResponse.json({ success: true, channel: "line", results });

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
