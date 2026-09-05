import type { NextRequest } from "next/server";

/**
 * Абсолютный адрес для редиректа. За прокси хостинга `req.url` смотрит на
 * внутренний адрес (localhost:порт), и редирект «на себя» уводит пользователя
 * на localhost. Берём внешний хост из заголовков прокси, затем SITE_URL,
 * и только потом — то, что видит сам сервер.
 */
export function absoluteUrl(req: NextRequest, path: string): URL {
  const fwdHost = req.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const fwdProto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  if (fwdHost) return new URL(path, `${fwdProto ?? "https"}://${fwdHost}`);
  if (process.env.SITE_URL) return new URL(path, siteUrl());
  return new URL(path, req.url);
}

/** Публичный адрес сайта — для ссылок в письмах и сообщениях бота. */
export function siteUrl(): string {
  const raw = (process.env.SITE_URL ?? "http://localhost:3000").trim().replace(/\/$/, "");
  // В панели адрес легко вписать без схемы — тогда ссылки в письмах не кликаются.
  return /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
}

/**
 * Пришёл ли посетитель через наш VPN: его внешний адрес совпадает с адресом
 * ноды. Список нод — VPN_EXIT_IPS через запятую.
 */
export function viaOurVpn(headers: Headers): boolean {
  const exits = (process.env.VPN_EXIT_IPS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (exits.length === 0) return false;
  const xff = headers.get("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0] : headers.get("x-real-ip") ?? "").trim();
  return exits.includes(ip);
}
