export async function sendAdminTelegramNotification(message: string): Promise<void> {
  const response = await fetch("/api/notify/telegram", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = payload?.error || "Telegram notification failed";
    throw new Error(error);
  }
}
