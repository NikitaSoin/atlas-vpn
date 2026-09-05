/** Публичный адрес сайта — для ссылок в письмах и сообщениях бота. */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
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
