/**
 * Telegram-бот через официальный Bot API. Нужны TELEGRAM_BOT_TOKEN (от
 * @BotFather) и TELEGRAM_BOT_USERNAME (без @) — для ссылки «привязать».
 * Вебхук: /api/telegram, защищён секретом TELEGRAM_WEBHOOK_SECRET, который
 * Telegram присылает в заголовке при каждом апдейте.
 */
export const telegramConfigured = () =>
  Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);

/** Ссылка «Подключить уведомления»: /start с токеном подписки. */
export function telegramLinkUrl(token: string): string | null {
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  return bot ? `https://t.me/${bot}?start=${encodeURIComponent(token)}` : null;
}

export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;
  try {
    // TELEGRAM_API_BASE — адрес ретранслятора, если прямой доступ к
    // api.telegram.org закрыт (из российских ЦОД он обычно недоступен).
    const base = (process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org").replace(/\/$/, "");
    const res = await fetch(`${base}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("[telegram]", res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error("[telegram]", (e as Error).message);
    return false;
  }
}
