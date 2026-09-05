import { NextRequest, NextResponse } from "next/server";
import { findPlan } from "@/lib/plans";
import { getPanel } from "@/lib/panel";
import { getStore } from "@/lib/db";
import { track } from "@/lib/analytics";

/**
 * Приём оплаты и выдача доступа.
 *
 * Платёж пока не проводится: форма сразу создаёт или продлевает подписку,
 * чтобы можно было пройти весь путь. Следующий шаг — эквайринг Т-Кассы:
 * здесь появится создание платежа и редирект на платёжную форму, а выдача
 * доступа переедет в вебхук об успешной оплате. Галочка автопродления
 * сохраняется уже сейчас — реальное списание заработает вместе с
 * рекуррентными платежами Т-Кассы.
 *
 * Модель: 1 аккаунт (email) = 1 подписка. Повторная оплата тем же email
 * продлевает существующую подписку — токен и ссылка не меняются, заново
 * ничего импортировать не нужно.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const planId = String(form.get("plan") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const autoRenew = form.get("autoRenew") === "on";

  const plan = findPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
  }

  const store = getStore();
  const existing = await store.findSubByEmail(email);

  await track(req.headers, existing ? "checkout_renewal" : "checkout_new", plan.id);

  let token: string;
  if (existing) {
    await store.extendSub(existing.token, plan.months, autoRenew);
    // Панель — источник правды для VPN-доступа: продлеваем и там.
    await getPanel().extendSubscription(existing.token, plan.months);
    token = existing.token;
  } else {
    const panelSub = await getPanel().createSubscription({
      email,
      months: plan.months,
    });
    await store.createSub({
      token: panelSub.token,
      email,
      planId: plan.id,
      months: plan.months,
      autoRenew,
      expiresAt: panelSub.expiresAt,
    });
    token = panelSub.token;
  }

  return NextResponse.redirect(new URL(`/setup/${token}`, req.url), {
    status: 303,
  });
}
