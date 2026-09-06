import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { findPlan } from "@/lib/plans";
import { getStore } from "@/lib/db";
import { setSession } from "@/lib/session";
import { applyPayment } from "@/lib/subscription";
import { notify } from "@/lib/notify";
import { track } from "@/lib/analytics";

/**
 * Приём оплаты и выдача доступа.
 *
 * Платёж пока не проводится: форма сразу создаёт или продлевает подписку,
 * чтобы можно было пройти весь путь. Следующий шаг — эквайринг Т-Кассы:
 * здесь появится создание платежа и редирект на платёжную форму, а
 * applyPayment переедет в вебхук об успешной оплате. Галочка автопродления
 * сохраняется уже сейчас — реальное списание заработает вместе с
 * рекуррентными платежами Т-Кассы.
 *
 * Одноразовый ключ формы (`nonce`) обязателен: без него двойной клик по
 * подвисшей странице продлевал подписку дважды. Ключ гасится при первой
 * отправке, повторная просто возвращает человека в кабинет.
 *
 * Модель: 1 аккаунт (email) = 1 подписка. Повторная оплата тем же email
 * продлевает существующую подписку (в том числе триал) — токен и ссылка не
 * меняются, заново ничего импортировать не нужно.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const planId = String(form.get("plan") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const autoRenew = form.get("autoRenew") === "on";

  const store = getStore();
  const nonce = String(form.get("nonce") ?? "");
  if (!nonce || !(await store.consumeNonce(nonce))) {
    // Повтор той же формы: ничего не списываем, показываем текущее состояние.
    await track(req.headers, "checkout_duplicate");
    return NextResponse.redirect(absoluteUrl(req, "/account"), { status: 303 });
  }

  const plan = findPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });
  }
  if (!email.includes("@") || email.length > 200) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
  }

  const existing = await store.findSubByEmail(email);
  await track(
    req.headers,
    existing ? (existing.isTrial ? "checkout_after_trial" : "checkout_renewal") : "checkout_new",
    plan.id,
  );

  const sub = await applyPayment(email, plan, autoRenew);
  notify(sub, "paid").catch(() => {});

  const res = NextResponse.redirect(absoluteUrl(req, `/setup/${sub.token}`), {
    status: 303,
  });
  setSession(res, sub.token);
  return res;
}
