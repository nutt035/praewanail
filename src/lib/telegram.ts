export type TelegramDeliveryResult = {
  chatId: string;
  ok: boolean;
  status: number;
  error?: string;
};

type TelegramApiResponse = {
  ok?: boolean;
  description?: string;
};

export async function sendTelegramMessage(
  token: string,
  chatIdsValue: string,
  message: string,
): Promise<TelegramDeliveryResult[]> {
  const chatIds = String(chatIdsValue)
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!token || chatIds.length === 0) {
    return [];
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  return Promise.all(
    chatIds.map(async (chatId) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });

        const responseBody = (await response
          .json()
          .catch(() => ({}))) as TelegramApiResponse;

        if (!response.ok || responseBody.ok === false) {
          const error = responseBody.description || `Telegram returned HTTP ${response.status}`;
          console.error("[TELEGRAM_API_ERROR]", {
            status: response.status,
            error,
          });

          return { chatId, ok: false, status: response.status, error };
        }

        return { chatId, ok: true, status: response.status };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Telegram request failed";
        console.error("[TELEGRAM_FETCH_ERROR]", { error: message });
        return { chatId, ok: false, status: 0, error: message };
      }
    }),
  );
}
