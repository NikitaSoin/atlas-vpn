import { NextRequest, NextResponse } from "next/server";
import { sameCode } from "@/lib/admin";
import { getStore, normalizePem, usingMemoryStore } from "@/lib/db";
import { X509Certificate } from "node:crypto";
import { panelProxyUrl, usingMockPanel } from "@/lib/panel";
import { mailConfigured } from "@/lib/mail";
import {
  acquiringConfigured,
  acquiringDemo,
  credentialsShape,
  probePayments,
  taxationCode,
  vatCode,
} from "@/lib/acquiring";
import { telegramConfigured } from "@/lib/telegram";
import { siteUrl } from "@/lib/site";
import { connect } from "node:net";
import { lookup } from "node:dns/promises";

/** Открыт ли исходящий TCP до хоста:порта (хостинг может резать 25/465/587). */
function probe(host: string, port: number, ms = 5000): Promise<{ ok: boolean; error?: string }> {
  return new Promise((resolve) => {
    const sock = connect({ host, port });
    const done = (ok: boolean, error?: string) => {
      sock.destroy();
      resolve(error ? { ok, error } : { ok });
    };
    sock.setTimeout(ms, () => done(false, "timeout — порт, скорее всего, закрыт хостингом"));
    sock.once("connect", () => done(true));
    sock.once("error", (e) => done(false, e.message));
  });
}

/** Разбирается ли сертификат из DATABASE_SSL_CA после нормализации. */
function caInfo() {
  const raw = process.env.DATABASE_SSL_CA;
  if (!raw) return { set: false };
  try {
    const cert = new X509Certificate(normalizePem(raw));
    return { set: true, ok: true, subject: cert.subject.split("\n").pop(), validTo: cert.validTo };
  } catch (e) {
    return { set: true, ok: false, error: (e as Error).message, length: raw.length };
  }
}

/** Строка подключения с замаскированным паролем — чтобы видеть, что реально попало в панель. */
function maskedDbUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return { set: false };
  const masked = raw.replace(/(:\/\/[^:\/]+:)([^@]*)(@)/, (_m, a, pw, c) => `${a}${"*".repeat(Math.min(pw.length, 12))}${c}`);
  const suspicious = {
    leadingOrTrailingSpace: raw !== raw.trim(),
    hasQuotes: /["'«»]/.test(raw),
    hasCyrillic: /[А-Яа-яЁё]/.test(raw),
    hasNewline: /[\r\n]/.test(raw),
    startsWithScheme: /^postgres(ql)?:\/\//.test(raw.trim()),
  };
  return { set: true, length: raw.length, masked, suspicious };
}

/** Реальный запрос к панели с таймаутом — getSubscription ошибки глотает. */
async function panelProbe() {
  const mode = usingMockPanel ? "mock" : "remnawave";
  if (usingMockPanel) return { ok: true, mode };
  const base = (process.env.PANEL_URL ?? "").replace(/\/$/, "");
  const t0 = Date.now();
  try {
    const res = await fetch(`${base}/api/users?size=1&start=0`, {
      headers: {
        Authorization: `Bearer ${process.env.PANEL_TOKEN}`,
        "X-Forwarded-Proto": "https",
        "X-Forwarded-For": "127.0.0.1",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return { ok: res.ok, mode, url: base, status: res.status, ms: Date.now() - t0 };
  } catch (e) {
    // Прямой адрес не ответил — проверяем, спасает ли ретранслятор.
    const proxy = panelProxyUrl();
    if (proxy) {
      try {
        const res = await fetch(`${proxy}/api/users?size=1&start=0`, {
          headers: {
            Authorization: `Bearer ${process.env.PANEL_TOKEN}`,
            "X-Forwarded-Proto": "https",
            "X-Forwarded-For": "127.0.0.1",
          },
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
        });
        return { ok: res.ok, mode, url: proxy, via: "ретранслятор", status: res.status, ms: Date.now() - t0 };
      } catch (e2) {
        return { ok: false, mode, url: base, proxy, error: (e2 as Error).message, ms: Date.now() - t0 };
      }
    }
    return { ok: false, mode, url: base, error: (e as Error).message, ms: Date.now() - t0 };
  }
}

/** DNS и TCP до панели по отдельности — чтобы отличить «не резолвится» от «порт закрыт». */
async function panelNetProbe() {
  const base = process.env.PANEL_URL;
  if (!base) return null;
  try {
    const u = new URL(base);
    const port = Number(u.port || (u.protocol === "https:" ? 443 : 80));
    const t0 = Date.now();
    let dns: { ok: boolean; address?: string; error?: string; ms: number };
    try {
      const r = await lookup(u.hostname);
      dns = { ok: true, address: r.address, ms: Date.now() - t0 };
    } catch (e) {
      dns = { ok: false, error: (e as Error).message, ms: Date.now() - t0 };
    }
    const t1 = Date.now();
    const tcp = dns.ok ? { ...(await probe(dns.address!, port)), ms: Date.now() - t1 } : null;
    // Какие порты хоста панели вообще достижимы отсюда — чтобы выбрать рабочий.
    const ports = dns.ok
      ? Object.fromEntries(
          await Promise.all(
            [22, 80, 443, 3000, 8443].map(async (p) => [p, (await probe(dns.address!, p, 4000)).ok]),
          ),
        )
      : null;
    return { host: u.hostname, port, dns, tcp, ports };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

function smtpTarget(): { host: string; port: number } | null {
  const url = process.env.SMTP_URL;
  if (!url || url === "log") return null;
  try {
    const u = new URL(url);
    return { host: u.hostname, port: Number(u.port || (u.protocol === "smtps:" ? 465 : 587)) };
  } catch {
    return null;
  }
}

/**
 * Диагностика зависимостей: GET /api/diag?key=ADMIN_CODE.
 * Показывает, живы ли база и панель, и какие каналы настроены — чтобы не
 * лазить в логи хостинга при каждом «страница недоступна».
 */
export async function GET(req: NextRequest) {
  if (!sameCode(req.nextUrl.searchParams.get("key"))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const t0 = Date.now();
  const db = await getStore()
    .listSubs(1)
    .then((rows) => ({ ok: true, mode: usingMemoryStore ? "memory" : "postgres", sample: rows.length }))
    .catch((e: Error) => ({ ok: false, mode: usingMemoryStore ? "memory" : "postgres", error: e.message }));
  const panel = await panelProbe();
  const panelNet = await panelNetProbe();
  // Проба создаёт НАСТОЯЩИЙ платёж на рубль. На демо-терминале это безобидно,
  // на боевом — мусор в кабинете банка при каждом запросе диагностики.
  // Поэтому на боевом терминале пробуем только по явному запросу: ?pay=1
  const wantPay = req.nextUrl.searchParams.get("pay") === "1";
  const payments =
    acquiringConfigured() && (acquiringDemo() || wantPay)
      ? await probePayments()
      : acquiringConfigured()
        ? { skipped: "боевой терминал, проба по запросу: добавьте &pay=1" }
        : null;
  // Куда сайт вообще дотягивается — чтобы понять, через что пускать запросы к панели.
  const reach = Object.fromEntries(
    await Promise.all(
      [
        ["telegram-api", "api.telegram.org"],
        ["cloudflare", "cloudflare.com"],
        ["workers.dev", "workers.dev"],
        ["github", "api.github.com"],
        // Сервер в Риге удалён 08.09.2026, панель и узел живут в Нидерландах.
        ["node-direct", "185.234.9.173"],
      ].map(async ([name, host]) => [name, (await probe(host, 443, 6000)).ok]),
    ),
  );
  const smtp = smtpTarget();
  const smtpPort = smtp ? { ...smtp, ...(await probe(smtp.host, smtp.port)) } : null;
  return NextResponse.json({
    db,
    panel,
    panelNet,
    reach,
    mail: mailConfigured(),
    acquiring: acquiringConfigured() ? (acquiringDemo() ? "демо-терминал" : "боевой терминал") : false,
    // Попадает в фискальный чек — проверяется глазами, а не угадывается.
    чек: { налогообложение: taxationCode(), ндс: vatCode() },
    payments,
    tbankReceived: credentialsShape(),
    smtpPort,
    telegram: telegramConfigured(),
    siteUrl: siteUrl(),
    ssl_ca: caInfo(),
    databaseUrl: maskedDbUrl(),
    ms: Date.now() - t0,
  });
}
