import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { mailConfigured, sendMail } from "@/lib/mail";
import { brand } from "@/lib/brand";
import { track } from "@/lib/analytics";

export const CODE_TTL_MIN = 10;

/**
 * Регистрация и вход — один сценарий: email → код на почту → /start/verify.
 * Если аккаунта ещё нет, после подтверждения он создаётся с пробным
 * доступом; если есть — просто открывается кабинет.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@") || email.length > 200) {
    return NextResponse.redirect(new URL("/start?err=email", req.url), { status: 303 });
  }
  if (!mailConfigured()) {
    return NextResponse.redirect(new URL("/start?err=nomail", req.url), { status: 303 });
  }

  const code = await getStore().createEmailCode(email, CODE_TTL_MIN);
  const sent = await sendMail(
    email,
    `${code} — код подтверждения ${brand.name}`,
    `Ваш код: ${code}\n\nВведите его на сайте, чтобы подтвердить почту. Код действует ${CODE_TTL_MIN} минут.\n` +
      `Если вы ничего не запрашивали — просто удалите это письмо.`,
  );
  await track(req.headers, sent ? "code_sent" : "code_send_failed");
  if (!sent) {
    return NextResponse.redirect(new URL("/start?err=send", req.url), { status: 303 });
  }
  return NextResponse.redirect(
    new URL(`/start/verify?email=${encodeURIComponent(email)}`, req.url),
    { status: 303 },
  );
}
