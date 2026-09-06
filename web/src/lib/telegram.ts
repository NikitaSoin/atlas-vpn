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

/**
 * Запасной путь к Bot API — ретранслятор на Cloudflare Workers.
 * Из российских ЦОД `api.telegram.org` недоступен: вебхуки приходят (их шлёт
 * Telegram), а отправка молча не проходит. Адрес не секрет, задан здесь,
 * чтобы всё работало без правки переменных. Переопределяется
 * TELEGRAM_API_BASE, отключается значением "off".
 */
const TELEGRAM_PROXY_DEFAULT = "https://irek-telegram-proxy.nikitasoin.workers.dev";
const TELEGRAM_DIRECT = "https://api.telegram.org";

/** Адрес, который сработал последним, — чтобы не ходить дважды каждый раз. */
let activeBase = process.env.TELEGRAM_API_BASE?.trim() || TELEGRAM_DIRECT;

function telegramBases(): string[] {
  const proxy = (process.env.TELEGRAM_API_BASE ?? TELEGRAM_PROXY_DEFAULT).trim();
  const fallback = proxy && proxy !== "off" ? proxy.replace(/\/$/, "") : null;
  return fallback && fallback !== activeBase ? [activeBase, fallback] : [activeBase];
}

export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;
  for (const base of telegramBases()) {
    try {
      const res = await fetch(`${base}/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(8000),
      });
      if (base !== activeBase) {
        console.log(`[telegram] переключился на ${base}`);
        activeBase = base;
      }
      // Ответ пришёл — это уже не сетевая проблема, вторую попытку не делаем.
      if (!res.ok) console.error("[telegram]", res.status, (await res.text()).slice(0, 200));
      return res.ok;
    } catch {
      // Сеть не пустила — пробуем следующий адрес.
    }
  }
  console.error("[telegram] недоступен ни напрямую, ни через ретранслятор");
  return false;
}
