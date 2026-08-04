import "server-only";

export type TelegramConfig = {
  token: string;
  chatIds: string;
  source: "environment" | "database-fallback";
};

type TelegramFallbackSettings = {
  telegram_bot_token?: unknown;
  telegram_chat_id?: unknown;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function resolveTelegramConfig(
  fallback?: TelegramFallbackSettings,
): TelegramConfig | null {
  const environmentToken = clean(process.env.TELEGRAM_BOT_TOKEN);
  const environmentChatIds = clean(process.env.TELEGRAM_CHAT_ID);

  if (environmentToken && environmentChatIds) {
    return {
      token: environmentToken,
      chatIds: environmentChatIds,
      source: "environment",
    };
  }

  const fallbackToken = clean(fallback?.telegram_bot_token);
  const fallbackChatIds = clean(fallback?.telegram_chat_id);

  if (fallbackToken && fallbackChatIds) {
    console.warn("[TELEGRAM_CONFIG_DATABASE_FALLBACK]");
    return {
      token: fallbackToken,
      chatIds: fallbackChatIds,
      source: "database-fallback",
    };
  }

  return null;
}
