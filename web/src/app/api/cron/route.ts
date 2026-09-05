import { NextRequest, NextResponse } from "next/server";
import { sameCode } from "@/lib/admin";
import { runReminders } from "@/lib/notify";

/** Ручной запуск прохода напоминаний: GET /api/cron?key=ADMIN_CODE */
export async function GET(req: NextRequest) {
  if (!sameCode(req.nextUrl.searchParams.get("key"))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const sent = await runReminders();
  return NextResponse.json({ ok: true, sent });
}
