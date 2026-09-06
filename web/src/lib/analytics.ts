import { createHash } from "node:crypto";
import { getStore } from "./db";

/**
 * Своя аналитика воронки. Сторонних счётчиков (Яндекс.Метрика, Google
 * Analytics) намеренно нет: они увозят данные посетителей третьим лицам,
 * требуют баннера о cookie и отдельного согласия. Здесь данные не покидают
 * нашу базу в РФ, поэтому в Политике достаточно уведомления.
 *
 * Роботов (краулеры, мониторинги, curl и headless-браузеры) отсекаем по
 * User-Agent до записи — они не попадают в статистику вообще.
 *
 * IP-адрес не сохраняется. Вместо него — необратимый отпечаток: соль плюс
 * адрес, SHA-256, первые 16 символов. Считать посетителей и ловить
 * злоупотребления этого достаточно, а восстановить адрес по отпечатку нельзя.
 * Соль задаётся ANALYTICS_SALT и должна быть постоянной для одного проекта.
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

/** Необратимый отпечаток посетителя вместо самого адреса. */
export function visitorHash(headers: Headers): string {
  const ip = clientIp(headers);
  if (!ip) return "";
  const salt = process.env.ANALYTICS_SALT ?? "irek-vpn-analytics";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 16);
}

/**
 * Браузер и платформа вместо полной строки User-Agent: для воронки нужно
 * знать «iPhone, Safari», а не точную сборку, по которой узнают устройство.
 */
export function shortAgent(ua: string): string {
  const platform = /iPhone|iPad/i.test(ua)
    ? "iOS"
    : /Android/i.test(ua)
      ? "Android"
      : /Macintosh|Mac OS X/i.test(ua)
        ? "macOS"
        : /Windows/i.test(ua)
          ? "Windows"
          : /Linux|X11/i.test(ua)
            ? "Linux"
            : "прочее";
  const browser = /YaBrowser/i.test(ua)
    ? "Яндекс"
    : /Edg\//i.test(ua)
      ? "Edge"
      : /OPR\//i.test(ua)
        ? "Opera"
        : /Firefox/i.test(ua)
          ? "Firefox"
          : /Chrome/i.test(ua)
            ? "Chrome"
            : /Safari/i.test(ua)
              ? "Safari"
              : "прочий";
  return `${platform} · ${browser}`;
}

/** Только домен источника перехода: adres страницы не нужен и лишний. */
function refHost(headers: Headers): string {
  const ref = headers.get("referer") ?? "";
  if (!ref) return "";
  try {
    const host = new URL(ref).hostname;
    return host === headers.get("host") ? "" : host.slice(0, 100);
  } catch {
    return "";
  }
}

export async function track(headers: Headers, event: string, path = ""): Promise<void> {
  try {
    const ua = headers.get("user-agent") ?? "";
    if (isBot(ua)) return;
    await getStore().addEvent({
      event,
      path: path.slice(0, 200),
      ip: visitorHash(headers),
      ua: shortAgent(ua),
      ref: refHost(headers),
    });
  } catch {
    // Аналитика никогда не должна ломать основной сценарий.
  }
}
