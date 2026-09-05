import { NextRequest, NextResponse } from "next/server";
import { findPlan } from "@/lib/plans";
import { getPanel } from "@/lib/panel";

/**
 * Приём оплаты и выдача доступа.
 *
 * Сейчас платёж не проводится: форма сразу создаёт подписку, чтобы можно было
 * пройти весь пользовательский путь. Когда подключим эквайер, здесь появится
 * редирект на его платёжную страницу, а создание подписки переедет в вебхук
 * об успешной оплате.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const planId = String(form.get("plan") ?? "");
  const email = String(form.get("email") ?? "").trim();

  const plan = findPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
  }

  const subscription = await getPanel().createSubscription({
    email,
    months: plan.months,
  });

  return NextResponse.redirect(
    new URL(`/setup/${subscription.token}`, req.url),
    { status: 303 },
  );
}
