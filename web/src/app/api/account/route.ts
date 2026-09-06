import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/db";
import { getPanel } from "@/lib/panel";
import { clearSession, SESSION_COOKIE } from "@/lib/session";
import { track } from "@/lib/analytics";
import { hashPassword, passwordProblem, verifyPassword } from "@/lib/password";

/** Действия кабинета: выход, отвязка Telegram. Вход — через /api/signup. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const action = String(form.get("action") ?? "");

  if (action === "logout") {
    const res = NextResponse.redirect(absoluteUrl(req, "/"), { status: 303 });
    clearSession(res);
    return res;
  }

  if (action === "two_factor") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const store = getStore();
    const sub = token ? await store.findSubByToken(token) : null;
    if (!sub) return NextResponse.redirect(absoluteUrl(req, "/start?mode=login"), { status: 303 });
    const enable = form.get("enable") === "on";
    // Без пароля второй шаг бессмысленен: входить было бы нечем на первом шаге.
    if (enable && !sub.passwordHash) {
      return NextResponse.redirect(absoluteUrl(req, "/account/settings?err=nopass"), { status: 303 });
    }
    await store.setTwoFactor(sub.token, enable);
    await track(req.headers, enable ? "2fa_enabled" : "2fa_disabled");
    return NextResponse.redirect(absoluteUrl(req, `/account/settings?2fa=${enable ? "on" : "off"}`), {
      status: 303,
    });
  }

  if (action === "change_password") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    const store = getStore();
    const sub = token ? await store.findSubByToken(token) : null;
    if (!sub) return NextResponse.redirect(absoluteUrl(req, "/start"), { status: 303 });

    const current = String(form.get("current") ?? "");
    const next = String(form.get("next") ?? "");
    // Старый пароль спрашиваем всегда, когда он задан: иначе чужой человек,
    // добравшийся до открытой вкладки, сменил бы пароль и забрал аккаунт.
    if (sub.passwordHash && !(await verifyPassword(current, sub.passwordHash))) {
      return NextResponse.redirect(absoluteUrl(req, "/account/settings?err=oldpass"), { status: 303 });
    }
    if (passwordProblem(next)) {
      return NextResponse.redirect(absoluteUrl(req, "/account/settings?err=newpass"), { status: 303 });
    }
    if (next !== String(form.get("next2") ?? "")) {
      return NextResponse.redirect(absoluteUrl(req, "/account/settings?err=match"), { status: 303 });
    }
    await store.setPassword(sub.token, await hashPassword(next));
    await track(req.headers, "password_changed");
    return NextResponse.redirect(absoluteUrl(req, "/account/settings?pass=1"), { status: 303 });
  }

  if (action === "delete_account") {
    // Подтверждение словом «удалить» — защита от случайного нажатия.
    const confirm = String(form.get("confirm") ?? "").trim().toLowerCase();
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (!token) return NextResponse.redirect(absoluteUrl(req, "/start"), { status: 303 });
    if (confirm !== "удалить") {
      return NextResponse.redirect(absoluteUrl(req, "/account/settings?err=confirm"), { status: 303 });
    }
    const store = getStore();
    const sub = await store.deleteAccount(token);
    // Доступ в панели отзываем после удаления записи: даже если панель
    // недоступна, данные на сайте уже удалены — это обязанность по закону.
    if (sub?.panelToken) {
      getPanel()
        .deleteSubscription(sub.panelToken)
        .catch((e) => console.error("[аккаунт] отзыв доступа:", (e as Error).message));
    }
    await track(req.headers, "account_deleted");
    const res = NextResponse.redirect(absoluteUrl(req, "/?deleted=1"), { status: 303 });
    clearSession(res);
    return res;
  }

  if (action === "unlink_telegram") {
    const token = req.cookies.get(SESSION_COOKIE)?.value;
    if (token) await getStore().setTelegram(token, null);
    return NextResponse.redirect(absoluteUrl(req, "/account/settings"), { status: 303 });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}
