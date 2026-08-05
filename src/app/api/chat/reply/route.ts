import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { saveChatMessage } from "@/lib/chat-service";
import { LineClient } from "@/lib/line-client";
import { writeAuditLog } from "@/lib/server/audit-log";
import { resolveLineConfig } from "@/lib/server/line-config";
import { getOwnerUser } from "@/lib/server/owner-auth";
import { hasSameOrigin, takeRateLimit } from "@/lib/server/request-security";
import { takeLineReplyToken } from "@/lib/server/line-reply-cache";

const replySchema = z.object({
  chatUserId: z.string().trim().min(1).max(100),
  text: z.string().trim().min(1).max(5000),
});

async function loadLineConfig() {
  const environmentConfig = resolveLineConfig();
  if (environmentConfig) return environmentConfig;

  const { data, error } = await supabase
    .from("shop_settings")
    .select("key,value")
    .in("key", ["line_channel_token", "admin_line_uid"]);

  if (error) throw new Error("Could not load LINE configuration");

  return resolveLineConfig(
    Object.fromEntries((data || []).map((item) => [item.key, item.value])),
  );
}

export async function POST(req: NextRequest) {
  const owner = await getOwnerUser();
  if (!owner) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const rate = takeRateLimit(req, "owner-chat-reply", 60, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many chat replies" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

  const parsed = replySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reply request" }, { status: 400 });
  }

  try {
    const { chatUserId, text } = parsed.data;
    const { data: user, error } = await supabase
      .from("chat_users")
      .select("id,platform,platform_user_id")
      .eq("id", chatUserId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.platform === "line") {
      const lineConfig = await loadLineConfig();
      if (!lineConfig) throw new Error("LINE is not configured");

      const line = new LineClient(lineConfig.accessToken);
      const replyToken = takeLineReplyToken(chatUserId);
      let deliveryMode: "reply" | "push" = "push";
      let delivered = false;
      if (replyToken) {
        delivered = await line.replyMessage(replyToken, text);
        if (delivered) deliveryMode = "reply";
      }
      if (!delivered) delivered = await line.pushMessage(user.platform_user_id, text);
      if (!delivered) throw new Error("LINE delivery failed");

      await saveChatMessage(chatUserId, "outbound", text);
      await supabase.from("chat_sessions").update({ status: "human" }).eq("chat_user_id", chatUserId);
      await writeAuditLog({
        action: "chat.reply.sent", actorType: "owner", actorUserId: owner.id,
        actorEmail: owner.email, entityType: "chat_user", entityId: chatUserId,
        metadata: { platform: user.platform, messageLength: text.length, deliveryMode }, request: req,
      });
      return NextResponse.json({ success: true, deliveryMode });
    } else if (user.platform === "facebook") {
      const pageAccessToken = process.env.FB_PAGE_ACCESS_TOKEN;
      if (!pageAccessToken) throw new Error("Facebook is not configured");

      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: { id: user.platform_user_id },
            message: { text },
          }),
        },
      );
      if (!response.ok) throw new Error("Facebook delivery failed");
    } else {
      return NextResponse.json({ error: "Unsupported chat platform" }, { status: 400 });
    }

    await saveChatMessage(chatUserId, "outbound", text);
    await supabase
      .from("chat_sessions")
      .update({ status: "human" })
      .eq("chat_user_id", chatUserId);

    await writeAuditLog({
      action: "chat.reply.sent",
      actorType: "owner",
      actorUserId: owner.id,
      actorEmail: owner.email,
      entityType: "chat_user",
      entityId: chatUserId,
      metadata: {
        platform: user.platform,
        messageLength: text.length,
      },
      request: req,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CHAT_REPLY_ERROR]", error);
    return NextResponse.json({ error: "Could not send reply" }, { status: 500 });
  }
}
