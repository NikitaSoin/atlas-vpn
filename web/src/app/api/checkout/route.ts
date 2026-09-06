import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { absoluteUrl } from "@/lib/site";
import { findPlan, priceKopecks } from "@/lib/plans";
import { getStore } from "@/lib/db";
import { setSession } from "@/lib/session";
import { applyPayment } from "@/lib/subscription";
import { notify } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { acquiringConfigured, initPayment } from "@/lib/acquiring";
import { brand } from "@/lib/brand";

/**
 * Начало оплаты.
 *
 * Есть реквизиты Т-Кассы — создаём платёж и уводим человека на форму банка;
 * доступ выдаст вебхук, увидев подтверждённый статус. Возврат человека на
 * сайт оплатой не считается: эту страницу легко открыть руками.
 *
 * Реквизитов нет — прежнее поведение: подписка выдаётся сразу, чтобы можно
 * было пройти весь сценарий на стенде.
 *
 * Сумма считается ТОЛЬКО здесь, из тарифа по идентификатору: из браузера
 * приходит лишь его название. Одноразовый ключ формы гасит двойной клик.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const planId = String(form.get("plan") ?? "");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const autoRenew = form.get("autoRenew") === "on";

  const store = getStore();
  const nonce = String(form.get("nonce") ?? "");
  if (!nonce || !(await store.consumeNonce(nonce))) {
    await track(req.headers, "checkout_duplicate");
    return NextResponse.redirect(absoluteUrl(req, "/account"), { status: 303 });
  }

  const plan = findPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Неизвестный тариф" }, { status: 400 });
  }
  if (!email.includes("@") || email.length > 200) {
    return NextResponse.json({ error: "Некорректная почта" }, { status: 400 });
  }

  const existing = await store.findSubByEmail(email);
  const event = existing
    ? existing.isTrial
      ? "checkout_after_trial"
      : "checkout_renewal"
    : "checkout_new";

  if (acquiringConfigured()) {
    const orderId = `irek-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const amount = priceKopecks(plan);
    await store.createPayment({
      orderId,
      paymentId: null,
      email,
      planId: plan.id,
      amount,
      autoRenew,
      status: "NEW",
      paymentUrl: null,
    });
    try {
      const r = await initPayment({
        orderId,
        amountKopecks: amount,
        description: `${brand.name} — доступ на ${plan.title.toLowerCase()}`,
        email,
        notificationUrl: absoluteUrl(req, "/api/payments/notification").toString(),
      });
      if (!r.Success || !r.PaymentURL) {
        await store.updatePayment(orderId, { status: `INIT_FAILED_${r.ErrorCode ?? "?"}` });
        console.error("[оплата] Init отклонён:", r.ErrorCode, r.Message, r.Details);
        await track(req.headers, "checkout_init_failed");
        // 501 «терминал не найден» — проблема настройки, а не денег клиента:
        // человеку про «попробуйте ещё раз» писать нечестно.
        const kind = r.ErrorCode === "501" ? "terminal" : "bank";
        return NextResponse.redirect(
          absoluteUrl(req, `/checkout?plan=${plan.id}&err=${kind}`),
          { status: 303 },
        );
      }
      await store.updatePayment(orderId, {
        paymentId: r.PaymentId ?? null,
        status: r.Status ?? "NEW",
        paymentUrl: r.PaymentURL,
      });
      // В лог — номер заказа и сумма, без персональных данных: почту к
      // заказу всегда можно поднять из базы.
      console.log(`[оплата] заказ ${orderId}: ${amount} коп., статус ${r.Status}`);
      await track(req.headers, event);
      return NextResponse.redirect(r.PaymentURL, { status: 303 });
    } catch (e) {
      await store.updatePayment(orderId, { status: "INIT_ERROR" });
      console.error("[оплата]", (e as Error).message);
      await track(req.headers, "checkout_init_error");
      return NextResponse.redirect(
        absoluteUrl(req, `/checkout?plan=${plan.id}&err=bank`),
        { status: 303 },
      );
    }
  }

  // Стендовый режим без реквизитов банка: выдаём доступ сразу.
  await track(req.headers, event);
  const sub = await applyPayment(email, plan, autoRenew);
  notify(sub, "paid").catch(() => {});
  const res = NextResponse.redirect(absoluteUrl(req, "/account?paid=1"), { status: 303 });
  setSession(res, sub.token);
  return res;
}
