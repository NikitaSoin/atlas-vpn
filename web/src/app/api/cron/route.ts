import { NextRequest, NextResponse } from "next/server";
import { sameCode } from "@/lib/admin";
import { runReminders } from "@/lib/notify";
import { provisionPending, reconcilePanel } from "@/lib/subscription";

/** Ручной запуск прохода напоминаний: GET /api/cron?key=ADMIN_CODE */
export async function GET(req: NextRequest) {
  if (!sameCode(req.nextUrl.searchParams.get("key"))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const provisioned = await provisionPending();
  const reconciled = await reconcilePanel();
  const sent = await runReminders();
  return NextResponse.json({ ok: true, provisioned, reconciled, sent });
}
