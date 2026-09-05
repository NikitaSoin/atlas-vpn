import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { setSession } from "@/lib/session";
import { startTrial } from "@/lib/subscription";
import { notify } from "@/lib/notify";
import { track } from "@/lib/analytics";

/**
 * Пробный период без платёжки: email → подписка на TRIAL_DAYS дней → экран
 * настройки. Один триал на email: если подписка уже есть, токен не выдаём
 * (иначе любой, кто знает чужой email, получил бы чужую ссылку) — отправляем
 * в кабинет, где можно войти по ссылке из письма.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@") || email.length > 200) {
    return NextResponse.redirect(new URL("/start?err=email", req.url), { status: 303 });
  }

  const existing = await getStore().findSubByEmail(email);
  if (existing) {
    await track(req.headers, "trial_repeat");
    return NextResponse.redirect(
      new URL(`/account?exists=1&email=${encodeURIComponent(email)}`, req.url),
      { status: 303 },
    );
  }

  const sub = await startTrial(email);
  await track(req.headers, "trial_started");
  // Письмо с личной ссылкой, чтобы было куда вернуться. Ошибка не мешает.
  notify(sub, "trial").catch(() => {});

  const res = NextResponse.redirect(new URL(`/setup/${sub.token}?new=1`, req.url), {
    status: 303,
  });
  setSession(res, sub.token);
  return res;
}
