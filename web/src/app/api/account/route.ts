import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { clearSession, setSession } from "@/lib/session";
import { mailConfigured, sendMail } from "@/lib/mail";
import { brand } from "@/lib/brand";
import { siteUrl } from "@/lib/site";
import { track } from "@/lib/analytics";

const LOGIN_TTL_MIN = 30;

/**
 * Кабинет: вход по ссылке из письма, выход, отвязка Telegram.
 * Ответ на запрос ссылки одинаков, есть email в базе или нет — чтобы по
 * форме нельзя было проверить, кто наш клиент.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const store = getStore();

  if (action === "logout") {
    const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
    clearSession(res);
    return res;
  }

  if (action === "login") {
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    if (!email.includes("@")) {
      return NextResponse.redirect(new URL("/account?err=email", req.url), { status: 303 });
    }
    if (!mailConfigured()) {
      return NextResponse.redirect(new URL("/account?err=nomail", req.url), { status: 303 });
    }
    const sub = await store.findSubByEmail(email);
    if (sub) {
      const token = await store.createLoginToken(email, LOGIN_TTL_MIN);
      await sendMail(
        email,
        `${brand.name}: вход в кабинет`,
        `Ссылка для входа (действует ${LOGIN_TTL_MIN} минут):\n${siteUrl()}/account?login=${token}\n\n` +
          `Если вы не запрашивали вход — просто не открывайте её.`,
      );
    }
    await track(req.headers, "login_link_requested");
    return NextResponse.redirect(new URL("/account?sent=1", req.url), { status: 303 });
  }

  if (action === "unlink_telegram") {
    const token = req.cookies.get("irek_session")?.value;
    if (token) await store.setTelegram(token, null);
    return NextResponse.redirect(new URL("/account", req.url), { status: 303 });
  }

  return NextResponse.json({ error: "Неизвестное действие" }, { status: 400 });
}

/** Переход по ссылке из письма: /api/account?login=TOKEN */
export async function GET(req: NextRequest) {
  const loginToken = req.nextUrl.searchParams.get("login") ?? "";
  const email = loginToken ? await getStore().consumeLoginToken(loginToken) : null;
  const sub = email ? await getStore().findSubByEmail(email) : null;
  if (!sub) {
    return NextResponse.redirect(new URL("/account?err=link", req.url), { status: 303 });
  }
  const res = NextResponse.redirect(new URL("/account", req.url), { status: 303 });
  setSession(res, sub.token);
  return res;
}
