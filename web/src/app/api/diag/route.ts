import { NextRequest, NextResponse } from "next/server";
import { sameCode } from "@/lib/admin";
import { getStore, usingMemoryStore } from "@/lib/db";
import { getPanel, usingMockPanel } from "@/lib/panel";
import { mailConfigured } from "@/lib/mail";
import { telegramConfigured } from "@/lib/telegram";
import { siteUrl } from "@/lib/site";
import { connect } from "node:net";

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
  const panel = await getPanel()
    .getSubscription("diag-nonexistent")
    .then(() => ({ ok: true, mode: usingMockPanel ? "mock" : "remnawave" }))
    .catch((e: Error) => ({ ok: false, mode: usingMockPanel ? "mock" : "remnawave", error: e.message }));
  const smtp = smtpTarget();
  const smtpPort = smtp ? { ...smtp, ...(await probe(smtp.host, smtp.port)) } : null;
  return NextResponse.json({
    db,
    panel,
    mail: mailConfigured(),
    smtpPort,
    telegram: telegramConfigured(),
    siteUrl: siteUrl(),
    ssl_ca_set: Boolean(process.env.DATABASE_SSL_CA),
    ms: Date.now() - t0,
  });
}
