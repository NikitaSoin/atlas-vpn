import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/db";
import { mailConfigured, sendMail } from "@/lib/mail";
import { brand } from "@/lib/brand";
import { track, visitorHash } from "@/lib/analytics";
import { currentVersions } from "@/lib/legal";

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
    return NextResponse.redirect(absoluteUrl(req, "/start?err=email"), { status: 303 });
  }
  // Галочки проверяем на сервере, а не только в браузере: без этого акцепт
  // легко отправить в обход формы, и доказывать его будет нечем.
  const acceptedTerms = form.get("acceptTerms") === "on";
  const acceptedPrivacy = form.get("acceptPrivacy") === "on";
  if (!acceptedTerms || !acceptedPrivacy) {
    return NextResponse.redirect(absoluteUrl(req, "/start?err=consent"), { status: 303 });
  }
  if (!mailConfigured()) {
    return NextResponse.redirect(absoluteUrl(req, "/start?err=nomail"), { status: 303 });
  }

  const store = getStore();
  const code = await store.createEmailCode(email, CODE_TTL_MIN);
  // Фиксируем обе галочки с редакциями документов — это и есть доказательство.
  const visitor = visitorHash(req.headers);
  const versions = currentVersions();
  await store.addConsent({ email, kind: "offer_and_rules", versions, visitor });
  await store.addConsent({ email, kind: "personal_data", versions, visitor });
  const sent = await sendMail(
    email,
    `${code} — код подтверждения ${brand.name}`,
    `Ваш код: ${code}\n\nВведите его на сайте, чтобы подтвердить почту. Код действует ${CODE_TTL_MIN} минут.\n` +
      `Если вы ничего не запрашивали — просто удалите это письмо.`,
  );
  await track(req.headers, sent ? "code_sent" : "code_send_failed");
  if (!sent) {
    return NextResponse.redirect(absoluteUrl(req, "/start?err=send"), { status: 303 });
  }
  return NextResponse.redirect(
    absoluteUrl(req, `/start/verify?email=${encodeURIComponent(email)}`),
    { status: 303 },
  );
}
