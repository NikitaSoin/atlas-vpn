import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/db";
import { clearSession, SESSION_COOKIE } from "@/lib/session";

/** Действия кабинета: выход, отвязка Telegram. Вход — через /api/signup. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const action = String(form.get("action") ?? "");

  if (action === "logout") {
    const res = NextResponse.redirect(absoluteUrl(req, "/"), { status: 303 });
    clearSession(res);
    return res;
  }

  if (action === "unlink_telegram") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (token) await getStore().setTelegram(token, null);
    return NextResponse.redirect(absoluteUrl(req, "/account"), { status: 303 });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
