import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { saveChatMessage } from "@/lib/chat-service";
import { LineClient } from "@/lib/line-client";

export async function POST(req: NextRequest) {
  try {
    const { chatUserId, text } = await req.json();

    if (!chatUserId || !text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. ดึงข้อมูล User
    const { data: user, error } = await supabase
      .from("chat_users")
      .select("*")
      .eq("id", chatUserId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. ส่งข้อความตาม Platform
    if (user.platform === "line") {
      const { data: settingsData } = await supabase.from("shop_settings").select("*");
      const settingsToMap = (data: any[]) => data.reduce((acc: any, item: any) => ({ ...acc, [item.key]: item.value }), {});
      const settings = settingsToMap(settingsData || []);
      
      const channelToken = settings.line_channel_token || process.env.LINE_CHANNEL_ACCESS_TOKEN;
      if (!channelToken) throw new Error("Missing LINE Token");

      const line = new LineClient(channelToken);
      await line.pushMessage(user.platform_user_id, text);

    } else if (user.platform === "facebook") {
      const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
      if (!PAGE_ACCESS_TOKEN) throw new Error("Missing FB Token");

      await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: { id: user.platform_user_id },
          message: { text }
        })
      });
    }

    // 3. บันทึกลง DB
    await saveChatMessage(chatUserId, "outbound", text);

    // 4. บังคับให้เปลี่ยนสถานะเป็น human เพราะแอดมินพิมพ์เอง
    await supabase.from("chat_sessions").update({ status: "human" }).eq("chat_user_id", chatUserId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[CHAT_REPLY_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
