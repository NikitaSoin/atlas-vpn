import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/session";
import { applyPromoDays } from "@/lib/subscription";
import { track } from "@/lib/analytics";
import { absoluteUrl } from "@/lib/site";

/**
 * Погашение промокода.
 *
 * Код приводим к верхнему регистру и убираем пробелы: люди переписывают их с
 * картинок и из сообщений, и «abc 123» должно сработать так же, как «ABC123».
 *
 * Причину отказа не уточняем: не найден, исчерпан, просрочен и «уже
 * применяли» — один ответ. Иначе форма превращается в способ перебирать чужие
 * коды и узнавать, какие из них существуют.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const raw = String(form.get("code") ?? "");
  const code = raw.replace(/\s+/g, "").toUpperCase();
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const back = (ok: boolean) =>
    NextResponse.redirect(absoluteUrl(req, `/account?promo=${ok ? "ok" : "bad"}`), { status: 303 });

  if (!token || code.length < 4) return back(false);
  const store = getStore();
  const sub = await store.findSubByToken(token);
  if (!sub) return back(false);

  const days = await store.usePromo(code, sub.email);
  if (!days) {
    await track(req.headers, "promo_failed");
    return back(false);
  }
  await applyPromoDays(sub.email, days);
  await track(req.headers, "promo_used");
  return back(true);
}
