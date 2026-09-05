import { getStore } from "./db";

/**
 * Аналитика по живым людям. Роботов (краулеры, мониторинги, curl и
 * headless-браузеры) отсекаем по User-Agent до записи — они не попадают
 * в статистику вообще.
 */
const BOT_UA =
  /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor|python-|curl|wget|httpclient|go-http|scrapy|facebookexternal|whatsapp|telegrambot/i;

export function isBot(ua: string | null | undefined): boolean {
  if (!ua || ua.length < 12) return true; // пустой или подозрительно короткий UA
  return BOT_UA.test(ua);
}

/** Первый адрес из X-Forwarded-For — реальный клиент за прокси хостинга. */
function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim().slice(0, 45);
  return headers.get("x-real-ip")?.slice(0, 45) ?? "";
}

export async function track(
  headers: Headers,
  event: string,
  path = "",
): Promise<void> {
  try {
    const ua = headers.get("user-agent") ?? "";
    if (isBot(ua)) return;
    await getStore().addEvent({
      event,
      path: path.slice(0, 200),
      ip: clientIp(headers),
      ua: ua.slice(0, 300),
      ref: (headers.get("referer") ?? "").slice(0, 300),
    });
  } catch {
    // Аналитика никогда не должна ломать основной сценарий.
  }
}
