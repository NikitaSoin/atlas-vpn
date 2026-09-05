import { NextRequest, NextResponse } from "next/server";
import { sameCode } from "@/lib/admin";
import { getStore, usingMemoryStore } from "@/lib/db";
import { getPanel, usingMockPanel } from "@/lib/panel";
import { mailConfigured } from "@/lib/mail";
import { telegramConfigured } from "@/lib/telegram";
import { siteUrl } from "@/lib/site";

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
  return NextResponse.json({
    db,
    panel,
    mail: mailConfigured(),
    telegram: telegramConfigured(),
    siteUrl: siteUrl(),
    ssl_ca_set: Boolean(process.env.DATABASE_SSL_CA),
    ms: Date.now() - t0,
  });
}
