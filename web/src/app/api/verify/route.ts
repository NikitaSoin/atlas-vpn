import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/db";
import { setSession } from "@/lib/session";
import { createAccount } from "@/lib/subscription";
import { track } from "@/lib/analytics";

/**
 * Проверка кода из письма.
 *
 * Для регистрации: создаём аккаунт с паролем, который был задан на первом шаге.
 * Для восстановления: заменяем пароль существующего аккаунта.
 * В обоих случаях сразу открываем сессию — человек уже подтвердил владение
 * почтой, просить его входить заново незачем.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const mode = String(form.get("mode") ?? "signup");
  const back = `/start/verify?email=${encodeURIComponent(email)}&mode=${mode}`;

  if (!email.includes("@") || code.length !== 6) {
    return NextResponse.redirect(absoluteUrl(req, `${back}&err=code`), { status: 303 });
  }
  const store = getStore();
  const pending = await store.consumeEmailCode(email, code);
  if (!pending) {
    await track(req.headers, "code_wrong");
    return NextResponse.redirect(absoluteUrl(req, `${back}&err=code`), { status: 303 });
  }

  let sub = await store.findSubByEmail(email);
  let isNew = false;

  if (!sub) {
    if (pending.kind === "reset") {
      // Восстанавливать нечего: аккаунт не найден. Ведём на регистрацию.
      return NextResponse.redirect(absoluteUrl(req, "/start?mode=signup"), { status: 303 });
    }
    sub = await createAccount(email, pending.passwordHash);
    isNew = true;
    await track(req.headers, "account_created");
  } else if (pending.passwordHash) {
    await store.setPassword(sub.token, pending.passwordHash);
    await track(req.headers, "password_reset");
  }

  const res = NextResponse.redirect(absoluteUrl(req, isNew ? "/account?new=1" : "/account"), {
    status: 303,
  });
  setSession(res, sub.token);
  return res;
}
