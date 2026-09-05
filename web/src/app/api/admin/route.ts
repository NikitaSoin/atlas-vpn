import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { ADMIN_COOKIE, isAdmin, sameCode } from "@/lib/admin";
import { getStore } from "@/lib/db";

/**
 * Действия админки одним роутом: вход, ответ в обращении, смена статуса.
 * Все действия, кроме входа, требуют cookie с верным кодом.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const action = String(form.get("action") ?? "");

  if (action === "login") {
    const code = String(form.get("code") ?? "");
    if (!sameCode(code)) {
      return NextResponse.redirect(absoluteUrl(req, "/admin?err=1"), { status: 303 });
    }
    const res = NextResponse.redirect(absoluteUrl(req, "/admin"), { status: 303 });
    res.cookies.set(ADMIN_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const store = getStore();
  const id = Number(form.get("id"));
  const ticket = Number.isFinite(id) ? await store.getTicketById(id) : null;
  if (!ticket) {
    return NextResponse.json({ error: "Обращение не найдено" }, { status: 404 });
  }

  if (action === "reply") {
    const body = String(form.get("message") ?? "").trim().slice(0, 4000);
    if (body) await store.addMessage(ticket.id, "admin", body);
  } else if (action === "close") {
    await store.setTicketStatus(ticket.id, "closed");
  } else if (action === "reopen") {
    await store.setTicketStatus(ticket.id, "open");
  }

  return NextResponse.redirect(absoluteUrl(req, `/admin/t/${ticket.id}`), {
    status: 303,
  });
}
