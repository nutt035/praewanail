import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { message, token, chatId } = await request.json();

    if (!token || !chatId) {
      return NextResponse.json({ error: "Missing Telegram configuration" }, { status: 400 });
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    
    // รองรับการส่งเข้าหลายห้องแชท (คั่นด้วยคอมม่า)
    const chatIds = String(chatId).split(",").map(id => id.trim()).filter(Boolean);
    
    const results = await Promise.all(chatIds.map(async (id) => {
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

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("Telegram Notify Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
