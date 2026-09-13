import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/db";
import { clearRefCookie, REF_COOKIE, setSession } from "@/lib/session";
import { createAccount, startTrial } from "@/lib/subscription";
import { notify } from "@/lib/notify";
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
  // «3 дня бесплатно» выбрано до регистрации: включаем сразу, не заставляя
  // выбирать доступ второй раз уже в кабинете.
  const wantsTrial = form.get("intent") === "trial";
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

  // Второй шаг входа: аккаунт уже есть, пароль проверен на первом шаге.
  if (pending.kind === "2fa") {
    if (!sub) {
      return NextResponse.redirect(absoluteUrl(req, "/start?mode=login"), { status: 303 });
    }
    await track(req.headers, "login");
    const res = NextResponse.redirect(absoluteUrl(req, "/account"), { status: 303 });
    setSession(res, sub.token);
    return res;
  }

  if (!sub) {
    if (pending.kind === "reset") {
      // Восстанавливать нечего: аккаунт не найден. Ведём на регистрацию.
      return NextResponse.redirect(absoluteUrl(req, "/start?mode=signup"), { status: 303 });
    }
    // Пришёл по ссылке друга: связь запоминаем сейчас, бонус пригласившему
    // будет только за первую оплату. Свой же код не считается.
    const refCode = req.cookies.get(REF_COOKIE)?.value;
    const inviter = refCode ? await store.findSubByRefCode(refCode) : null;
    const referredBy = inviter && inviter.email !== email ? inviter.token : null;
    sub = await createAccount(email, pending.passwordHash, referredBy);
    isNew = true;
    await track(req.headers, "account_created");
    if (referredBy) await track(req.headers, "ref_signup");
    if (wantsTrial) {
      const started = await startTrial(sub);
      if (started) {
        sub = started;
        await track(req.headers, "trial_started");
        notify(started, "trial").catch(() => {});
      }
    }
  } else if (pending.passwordHash) {
    await store.setPassword(sub.token, pending.passwordHash);
    await track(req.headers, "password_reset");
  }

  const res = NextResponse.redirect(absoluteUrl(req, isNew ? "/account?new=1" : "/account"), {
    status: 303,
  });
  setSession(res, sub.token);
  if (isNew) clearRefCookie(res);
  return res;
}
