import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LineClient } from "@/lib/line-client";
import { getOrCreateChatUser, saveChatMessage, setChatSessionStatus } from "@/lib/chat-service";
import { rememberLineReplyToken } from "@/lib/server/line-reply-cache";
import { createSupabaseAdminClient } from "@/lib/server/supabase-admin";
import { detectLineImageMime, readLineImage, storeLineImage } from "@/lib/server/line-image-storage";
import { resolveTelegramConfig } from "@/lib/server/telegram-config";
import { sendTelegramPhoto } from "@/lib/telegram";

const EXTENSION_QUESTION = "ได้รับรูปแบบเล็บแล้วค่ะ 💅 ลูกค้าต้องการต่อเล็บด้วยไหมคะ";
const PRICE_REVIEW_MESSAGE = "รับข้อมูลเรียบร้อยค่ะ รอช่างประเมินราคาสักครู่นะคะ ✨";
const MAX_LINE_IMAGE_BYTES = 10 * 1024 * 1024;

type LineWebhookEvent = {
  type?: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { id?: string; type?: string; text?: string };
};

function hasValidLineSignature(rawBody: string, signature: string | null) {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelSecret || !signature) return false;
  const expected = Buffer.from(createHmac("sha256", channelSecret).update(rawBody).digest("base64"));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function deliverText(line: LineClient, userId: string, replyToken: string | undefined, text: string) {
  const replied = replyToken ? await line.replyMessage(replyToken, text) : false;
  if (!replied && !await line.pushMessage(userId, text)) throw new Error("LINE delivery failed");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    if (!hasValidLineSignature(rawBody, req.headers.get("x-line-signature"))) {
      return NextResponse.json({ error: "Invalid LINE signature" }, { status: 401 });
    }

    let body: { events?: LineWebhookEvent[] };
    try { body = JSON.parse(rawBody); } catch {
      return NextResponse.json({ error: "Invalid LINE payload" }, { status: 400 });
    }
    if (!Array.isArray(body.events)) return NextResponse.json({ message: "OK" });

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token) return NextResponse.json({ message: "OK" });
    const line = new LineClient(token);
    const supabase = createSupabaseAdminClient();

    for (const event of body.events) {
      const userId = event.source?.userId;
      if (!userId || event.type !== "message") continue;
      const profile = await line.getProfile(userId).catch(() => null);
      const chatUserId = await getOrCreateChatUser("line", userId, profile?.displayName, profile?.pictureUrl);
      if (!chatUserId) continue;

      if (event.message?.type === "text") {
        const text = event.message.text?.trim();
        if (!text) continue;
        await saveChatMessage(chatUserId, "inbound", text);
        if (event.replyToken) rememberLineReplyToken(chatUserId, event.replyToken);

        const bookingCode = text.match(/BKG-([A-Z0-9]{4})/i)?.[0]?.toUpperCase();
        if (bookingCode) {
          await handleBookingLink(line, supabase, userId, chatUserId, event.replyToken, bookingCode);
          continue;
        }

        const handledReference = await handleReferenceAnswer(
          line, supabase, userId, chatUserId, event.replyToken, text, profile?.displayName || "ลูกค้า",
        );
        if (handledReference) continue;
      }

      if (event.message?.type === "image" && event.message.id) {
        const imageBuffer = await line.getMessageContent(event.message.id);
        if (!imageBuffer || imageBuffer.byteLength > MAX_LINE_IMAGE_BYTES) continue;
        const mimeType = detectLineImageMime(imageBuffer);
        const stored = await storeLineImage(chatUserId, imageBuffer, mimeType);
        await saveChatMessage(chatUserId, "inbound", "รูปอ้างอิงจากลูกค้า", "image", stored.url);
        await deliverText(line, userId, event.replyToken, EXTENSION_QUESTION);
        await saveChatMessage(chatUserId, "outbound", EXTENSION_QUESTION);
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[LINE_WEBHOOK_ERROR]", error);
    return NextResponse.json({ message: "OK" });
  }
}

async function handleBookingLink(
  line: LineClient,
  db: SupabaseClient,
  userId: string,
  chatUserId: string,
  replyToken: string | undefined,
  bookingCode: string,
) {
  const { data: booking } = await db.from("bookings")
    .select("id,customer_id,customers(name)").eq("booking_code", bookingCode).maybeSingle();
  if (!booking) {
    const message = `ขออภัยค่ะ ไม่พบรหัสการจอง ${bookingCode}`;
    await deliverText(line, userId, replyToken, message);
    await saveChatMessage(chatUserId, "outbound", message);
    return;
  }

  const profile = await line.getProfile(userId).catch(() => null);
  await db.from("line_accounts").upsert({
    line_user_id: userId, customer_id: booking.customer_id,
    display_name: profile?.displayName || "ลูกค้า", picture_url: profile?.pictureUrl || null,
    linked_at: new Date().toISOString(),
  }, { onConflict: "line_user_id" });
  await db.from("customers").update({ line_id: userId }).eq("id", booking.customer_id);
  await db.from("bookings").update({ has_line_linked: true }).eq("id", booking.id);

  const customer = Array.isArray(booking.customers) ? booking.customers[0] : booking.customers;
  const customerName = customer?.name || profile?.displayName || "ลูกค้า";
  const message = `สวัสดีค่ะ คุณ${customerName}! 💅\n\nยืนยันตัวตนกับคิว ${bookingCode} เรียบร้อยแล้วค่ะ\nส่งรูปแบบเล็บที่ต้องการมาได้เลยนะคะ ✨`;
  await deliverText(line, userId, replyToken, message);
  await saveChatMessage(chatUserId, "outbound", message);
}

async function handleReferenceAnswer(
  line: LineClient,
  db: SupabaseClient,
  userId: string,
  chatUserId: string,
  replyToken: string | undefined,
  answer: string,
  displayName: string,
) {
  const { data: recent } = await db.from("chat_messages")
    .select("direction,message_type,content,image_url,created_at")
    .eq("chat_user_id", chatUserId).order("created_at", { ascending: false }).limit(3);
  const question = recent?.[1];
  const reference = recent?.[2];
  if (question?.direction !== "outbound" || question.content !== EXTENSION_QUESTION
    || reference?.direction !== "inbound" || reference.message_type !== "image" || !reference.image_url) return false;

  await deliverText(line, userId, replyToken, PRICE_REVIEW_MESSAGE);
  await saveChatMessage(chatUserId, "outbound", PRICE_REVIEW_MESSAGE);
  await setChatSessionStatus(chatUserId, "human");

  const imageId = reference.image_url.split("/").at(-1);
  const image = imageId ? await readLineImage(chatUserId, imageId) : null;
  const telegram = resolveTelegramConfig();
  if (image && telegram) {
    const { data: account } = await db.from("line_accounts").select("customer_id")
      .eq("line_user_id", userId).maybeSingle();
    const { data: booking } = account?.customer_id
      ? await db.from("bookings").select("booking_code").eq("customer_id", account.customer_id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle()
      : { data: null };
    const caption = `💅 <b>รอประเมินราคาจากรูป</b>\nลูกค้า: ${escapeHtml(displayName)}\nคิว: ${escapeHtml(booking?.booking_code || "ยังไม่พบคิวที่เชื่อม")}`
      + `\nคำตอบเรื่องต่อเล็บ: ${escapeHtml(answer)}\n\nกรุณาเปิดหน้า Admin → แชท เพื่อตอบราคา`;
    const deliveries = await sendTelegramPhoto(telegram.token, telegram.chatIds, image.bytes, image.mimeType, caption);
    if (deliveries.some((delivery) => !delivery.ok)) console.error("[LINE_REFERENCE_TELEGRAM_FAILED]");
  }
  return true;
}
