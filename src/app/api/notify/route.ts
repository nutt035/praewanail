import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { hasOwnerSession } from "@/lib/server/owner-auth";
import { resolveTelegramConfig } from "@/lib/server/telegram-config";
import { sendTelegramMessage } from "@/lib/telegram";

const notifySchema = z.object({
  message: z.string().trim().min(1).max(4096).optional(),
  imageUrl: z.string().url().max(2048).optional(),
  to: z.string().trim().min(1).max(255).optional(),
  messages: z.array(z.unknown()).min(1).max(5).optional(),
}).refine((body) => Boolean(body.message || body.messages), {
  message: "A message is required",
});

export async function POST(request: Request) {
  if (!(await hasOwnerSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = notifySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid notification request" }, { status: 400 });
    }

    const body = parsed.data;
    const { message, imageUrl, to, messages: customMessages } = body;

    // 1. Fetch shop settings
    const { data: settingsData, error: settingsError } = await supabase
      .from("shop_settings")
      .select("*");

    if (settingsError || !settingsData) {
      return NextResponse.json({ error: "Could not fetch settings" }, { status: 500 });
    }

    const settings = settingsToMap(settingsData);

    // 2. Telegram Logic (Always send to admin if configured)
    const telegramConfig = resolveTelegramConfig(settings);
    const telegramToken = telegramConfig?.token;
    const telegramChatId = telegramConfig?.chatIds;

    const telegramResults = telegramToken && telegramChatId && message
      ? await sendTelegramMessage(telegramToken, telegramChatId, message)
      : [];
    const telegramFailed = telegramResults.some((result) => !result.ok);
    const telegramSummary = telegramResults.map(({ ok, status, error }) => ({
      ok,
      status,
      ...(error ? { error } : {}),
    }));

    // 3. LINE Logic
    const channelToken = settingString(settings, "line_channel_token");
    if (!channelToken) {
      return NextResponse.json(
        {
          success: !telegramFailed,
          telegram: telegramSummary,
          warning: "No LINE token configured",
        },
        { status: telegramFailed ? 502 : 200 },
      );
    }

    // ผู้รับ: ถ้ามี 'to' (ส่งลูกค้า) แต่ถ้าไม่มี 'to' ให้ส่ง admin LINE (เฉพาะกรณีไม่มี Telegram)
    const recipients = to ? [to] : (telegramToken ? [] : settingString(settings, "admin_line_uid").split(",").map((s) => s.trim()).filter(Boolean));

    if (recipients.length === 0) {
      return NextResponse.json(
        {
          success: !telegramFailed,
          telegram: telegramSummary,
          message: "No LINE recipients needed",
        },
        { status: telegramFailed ? 502 : 200 },
      );
    }

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
        
        let errorBody = null;
        if (!res.ok) {
          errorBody = await res.json().catch(() => null);
          console.error(`[LINE_API_ERROR] Status: ${res.status}`, errorBody);
        }

        return { 
          uid: target, 
          ok: res.ok, 
          status: res.status,
          error: errorBody
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : "LINE request failed";
        console.error(`[LINE_FETCH_ERROR]`, { error: message });
        return { uid: target, ok: false, error: message };
      }
    }));

    const lineFailed = results.some((result) => !result.ok);
    const failed = telegramFailed || lineFailed;

    return NextResponse.json(
      { success: !failed, telegram: telegramSummary, line: results },
      { status: failed ? 502 : 200 },
    );

  } catch (error) {
    console.error("Notify Dispatcher Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Helper to flatten shop_settings table (since it's key-value pairs)
function settingsToMap(data: Array<{ key: string; value: unknown }>) {
  const map: Record<string, unknown> = {};
  data.forEach(item => {
    map[item.key] = item.value;
  });
  return map;
}

function settingString(settings: Record<string, unknown>, key: string): string {
  const value = settings[key];
  return typeof value === "string" ? value.trim() : "";
}
