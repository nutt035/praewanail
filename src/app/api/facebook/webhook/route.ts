import { NextRequest, NextResponse } from "next/server";
import { getOrCreateChatUser, saveChatMessage, getChatSessionStatus } from "@/lib/chat-service";
import { supabase } from "@/lib/supabase";

const VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || "antonette_nail_secret";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object === "page") {
      for (const entry of body.entry) {
        const webhookEvent = entry.messaging[0];
        const senderPsid = webhookEvent.sender.id;

        if (webhookEvent.message) {
          const text = webhookEvent.message.text;
          
          if (text) {
            // เราอาจต้องเรียก FB Graph API เพื่อดึงชื่อรูป (ถ้าจำเป็น)
            const chatUserId = await getOrCreateChatUser("facebook", senderPsid, "ลูกค้า Facebook");
            
            if (chatUserId) {
              await saveChatMessage(chatUserId, "inbound", text);

              if (text.includes("ติดต่อพนักงาน") || text.includes("แอดมิน")) {
                await supabase.from("chat_sessions").update({ status: "human" }).eq("chat_user_id", chatUserId);
                await sendFacebookMessage(senderPsid, "เปลี่ยนเป็นระบบพนักงานแล้วค่ะ แอดมินจะรีบมาตอบนะคะ 👩‍💻");
                await saveChatMessage(chatUserId, "outbound", "เปลี่ยนเป็นระบบพนักงานแล้วค่ะ แอดมินจะรีบมาตอบนะคะ 👩‍💻");
                continue;
              }
            }
          }
        }
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }
    return NextResponse.json({ success: false }, { status: 404 });
  } catch (error) {
    console.error("[FB_WEBHOOK_ERROR]:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

async function sendFacebookMessage(senderPsid: string, text: string) {
  const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!PAGE_ACCESS_TOKEN) return;

  await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: senderPsid },
      message: { text }
    })
  });
}
