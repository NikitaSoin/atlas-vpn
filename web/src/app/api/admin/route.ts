import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { ADMIN_COOKIE, isAdmin, sameCode } from "@/lib/admin";
import { getStore } from "@/lib/db";
import { grantUnlimited, revokeUnlimited } from "@/lib/subscription";

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

  /*
    Бесплатный доступ для своих. Отдельным действием, а не правкой базы руками:
    выдача должна снимать лимит и в панели, иначе человек упрётся в пробные
    десять гигабайт и не поймёт почему.
  */
  if (action === "grant_unlimited" || action === "revoke_unlimited") {
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const done =
      action === "grant_unlimited" ? await grantUnlimited(email) : await revokeUnlimited(email);
    return NextResponse.redirect(
      absoluteUrl(req, `/admin?${done ? "ok" : "fail"}=${encodeURIComponent(email)}`),
      { status: 303 },
    );
  }

  /*
    Создание промокода. Если код не задан — генерируем сами: люди придумывают
    предсказуемые коды, а предсказуемый код подбирается перебором.
  */
  if (action === "create_promo") {
    // Своё число дней важнее выбора из списка, если оно заполнено.
    const custom = Number(form.get("days_custom") ?? 0);
    const chosen = custom > 0 ? custom : Number(form.get("days") ?? 7);
    const days = Math.max(1, Math.min(365, Math.round(chosen) || 7));
    const uses = Math.max(1, Math.min(10000, Math.round(Number(form.get("uses") ?? 1)) || 1));
    // Дата «до» — включительно, по московскому времени.
    const expiresRaw = String(form.get("expires") ?? "").trim();
    const expiresAt = /^\d{4}-\d{2}-\d{2}$/.test(expiresRaw)
      ? new Date(`${expiresRaw}T23:59:59+03:00`)
      : null;
    const wanted = String(form.get("code") ?? "").replace(/\s+/g, "").toUpperCase().slice(0, 32);
    const code =
      wanted ||
      "IREK" +
        Array.from(crypto.getRandomValues(new Uint8Array(4)))
          .map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32])
          .join("");
    const ok = await getStore().createPromo(code, days, uses, expiresAt);
    return NextResponse.redirect(
      absoluteUrl(req, `/admin?${ok ? "promo" : "promoerr"}=${encodeURIComponent(code)}`),
      { status: 303 },
    );
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
