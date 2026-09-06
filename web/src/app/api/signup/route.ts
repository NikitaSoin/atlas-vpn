import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/db";
import { mailConfigured, sendMail } from "@/lib/mail";
import { brand } from "@/lib/brand";
import { track, visitorHash } from "@/lib/analytics";
import { currentVersions } from "@/lib/legal";
import { hashPassword, passwordProblem } from "@/lib/password";

export const CODE_TTL_MIN = 10;

/**
 * Регистрация: почта, пароль и согласия → код подтверждения на почту.
 * Аккаунт создаётся только после ввода кода (`/api/verify`), поэтому пароль
 * до этого момента живёт в записи кода — уже в виде хеша, не в открытом виде.
 *
 * Этот же путь используется для восстановления пароля: `mode=reset`.
 * Ответ одинаков независимо от того, есть такая почта в базе или нет, чтобы
 * по форме нельзя было проверить, кто наш клиент.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const mode = String(form.get("mode") ?? "signup");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const back = mode === "reset" ? "/start?mode=reset" : "/start?mode=signup";

  if (!email.includes("@") || email.length > 200) {
    return NextResponse.redirect(absoluteUrl(req, `${back}&err=email`), { status: 303 });
  }
  if (!mailConfigured()) {
    return NextResponse.redirect(absoluteUrl(req, `${back}&err=nomail`), { status: 303 });
  }

  const store = getStore();
  const password = String(form.get("password") ?? "");
  const problem = passwordProblem(password);
  if (problem) {
    return NextResponse.redirect(absoluteUrl(req, `${back}&err=password`), { status: 303 });
  }
  if (password !== String(form.get("password2") ?? "")) {
    return NextResponse.redirect(absoluteUrl(req, `${back}&err=match`), { status: 303 });
  }

  if (mode === "signup") {
    // Галочки проверяем на сервере: браузеру доверять нельзя.
    if (form.get("acceptTerms") !== "on" || form.get("acceptPrivacy") !== "on") {
      return NextResponse.redirect(absoluteUrl(req, `${back}&err=consent`), { status: 303 });
    }
    const existing = await store.findSubByEmail(email);
    if (existing) {
      // Аккаунт есть: молча уводим на вход, не подтверждая факт регистрации.
      return NextResponse.redirect(absoluteUrl(req, "/start?mode=login&err=exists"), {
        status: 303,
      });
    }
    const visitor = visitorHash(req.headers);
    const versions = currentVersions();
    await store.addConsent({ email, kind: "offer_and_rules", versions, visitor });
    await store.addConsent({ email, kind: "personal_data", versions, visitor });
  }

  const passwordHash = await hashPassword(password);
  const code = await store.createEmailCode(email, CODE_TTL_MIN, { passwordHash, kind: mode });
  const subject =
    mode === "reset"
      ? `${code} — код для смены пароля ${brand.name}`
      : `${code} — код подтверждения ${brand.name}`;
  const sent = await sendMail(
    email,
    subject,
    `Ваш код: ${code}\n\nВведите его на сайте, чтобы ${
      mode === "reset" ? "задать новый пароль" : "подтвердить почту"
    }. Код действует ${CODE_TTL_MIN} минут.\n` +
      `Если вы ничего не запрашивали — просто удалите это письмо, пароль останется прежним.`,
  );
  await track(req.headers, sent ? "code_sent" : "code_send_failed");
  if (!sent) {
    return NextResponse.redirect(absoluteUrl(req, `${back}&err=send`), { status: 303 });
  }
  return NextResponse.redirect(
    absoluteUrl(req, `/start/verify?email=${encodeURIComponent(email)}&mode=${mode}`),
    { status: 303 },
  );
}
