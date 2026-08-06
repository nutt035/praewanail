import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getOrCreateChatUser, saveChatMessage } from "@/lib/chat-service";

const facebookPayloadSchema = z.object({
  object: z.literal("page"),
  entry: z.array(z.object({
    messaging: z.array(z.object({
      sender: z.object({ id: z.string().min(1).max(255) }),
      message: z.object({ text: z.string().max(5000).optional() }).optional(),
    })).max(100),
  })).max(100),
});

function hasValidFacebookSignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const receivedHex = signature.slice(7);
  if (!/^[a-f0-9]{64}$/i.test(receivedHex)) return false;
  const expected = Buffer.from(createHmac("sha256", appSecret).update(rawBody).digest("hex"));
  const received = Buffer.from(receivedHex.toLowerCase());
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(req: NextRequest) {
  const verifyToken = process.env.FB_VERIFY_TOKEN;
  if (!verifyToken) return new NextResponse("Facebook webhook is not configured", { status: 503 });

  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const appSecret = process.env.FB_APP_SECRET;
  if (!appSecret) return NextResponse.json({ error: "Facebook webhook is not configured" }, { status: 503 });

  try {
    const rawBody = await req.text();
    if (!hasValidFacebookSignature(rawBody, req.headers.get("x-hub-signature-256"), appSecret)) {
      return NextResponse.json({ error: "Invalid Facebook signature" }, { status: 401 });
    }
    const parsed = facebookPayloadSchema.safeParse(JSON.parse(rawBody));
    if (!parsed.success) return NextResponse.json({ error: "Invalid Facebook payload" }, { status: 400 });
    const body = parsed.data;

    for (const entry of body.entry) {
      for (const webhookEvent of entry.messaging) {
        const senderPsid = webhookEvent.sender.id;

        if (webhookEvent.message) {
          const text = webhookEvent.message.text;
          
          if (text) {
            // เราอาจต้องเรียก FB Graph API เพื่อดึงชื่อรูป (ถ้าจำเป็น)
            const chatUserId = await getOrCreateChatUser("facebook", senderPsid, "ลูกค้า Facebook");
            
            if (chatUserId) {
              await saveChatMessage(chatUserId, "inbound", text);
            }
          }
        }
      }
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[FB_WEBHOOK_ERROR]:", error instanceof Error ? error.message : "Unknown webhook error");
    return NextResponse.json({ error: "Invalid Facebook webhook request" }, { status: 400 });
  }
}
