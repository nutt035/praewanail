import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { hasOwnerSession } from "@/lib/server/owner-auth";
import { resolveTelegramConfig } from "@/lib/server/telegram-config";
import { sendTelegramMessage } from "@/lib/telegram";
import { hasSameOrigin, takeRateLimit } from "@/lib/server/request-security";

const telegramMessageSchema = z.object({
  message: z.string().trim().min(1).max(4096),
});

async function loadTelegramConfig() {
  const environmentConfig = resolveTelegramConfig();
  if (environmentConfig) return environmentConfig;

  const { data, error } = await supabase
    .from("shop_settings")
    .select("key,value")
    .in("key", ["telegram_bot_token", "telegram_chat_id"]);

  if (error) throw new Error("Could not load Telegram configuration");

  return resolveTelegramConfig(
    Object.fromEntries((data || []).map((item) => [item.key, item.value])),
  );
}

export async function GET() {
  if (!(await hasOwnerSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await loadTelegramConfig();
  return NextResponse.json({
    configured: Boolean(config),
    source: config?.source || null,
  });
}

export async function POST(request: NextRequest) {
  if (!(await hasOwnerSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const rate = takeRateLimit(request, "owner-telegram", 20, 10 * 60 * 1000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many Telegram requests" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  }

  const parsed = telegramMessageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid Telegram message" }, { status: 400 });
  }

  try {
    const config = await loadTelegramConfig();
    if (!config) {
      return NextResponse.json({ error: "Telegram is not configured" }, { status: 503 });
    }

    const results = await sendTelegramMessage(
      config.token,
      config.chatIds,
      parsed.data.message,
    );
    const failed = results.some((result) => !result.ok);

    return NextResponse.json(
      {
        success: !failed,
        results: results.map(({ ok, status, error }) => ({
          ok,
          status,
          ...(error ? { error } : {}),
        })),
      },
      { status: failed ? 502 : 200 },
    );
  } catch (error) {
    console.error("[TELEGRAM_NOTIFY_ERROR]", error);
    return NextResponse.json({ error: "Telegram notification failed" }, { status: 500 });
  }
}
