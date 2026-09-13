import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { absoluteUrl } from "@/lib/site";
import { findPlan, priceKopecks } from "@/lib/plans";
import { getStore } from "@/lib/db";
import { REF_COOKIE, setSession } from "@/lib/session";
import { applyPayment, grantReferralBonus } from "@/lib/subscription";
import { notify, notifyReferralBonus } from "@/lib/notify";
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
  // Код приглашения едет с платежом: вебхук банка cookie не увидит, а бонус
  // пригласившему положен и при оплате без регистрации.
  const refCode = req.cookies.get(REF_COOKIE)?.value ?? null;

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
      refCode,
    });
    try {
      const r = await initPayment({
        orderId,
        amountKopecks: amount,
        description: `${brand.name} — доступ на ${plan.title.toLowerCase()}`,
        // Наименование в фискальном чеке. Отдельно от описания платежа:
        // в чеке нужна услуга, а не рекламная строка.
        itemName: `Доступ к сервису ${brand.name}, ${plan.title.toLowerCase()}`,
        email,
        // Куда ЮKassa вернёт человека после оплаты. Адрес уведомлений задаётся
        // не здесь, а один раз в личном кабинете ЮKassa — в отличие от Т-Кассы,
        // где он передавался с каждым платежом.
        returnUrl: absoluteUrl(req, "/account?paid=1").toString(),
      });
      if (!r.ok || !r.confirmationUrl) {
        await store.updatePayment(orderId, { status: `INIT_FAILED_${r.errorCode ?? "?"}` });
        console.error("[оплата] платёж не создан:", r.errorCode, r.message);
        await track(req.headers, "checkout_init_failed");
        // Неверные реквизиты магазина — наша проблема настройки, а не денег
        // клиента: писать ему «попробуйте ещё раз» нечестно.
        const kind =
          r.errorCode === "invalid_credentials" || r.errorCode === "401" ? "terminal" : "bank";
        return NextResponse.redirect(
          absoluteUrl(req, `/checkout?plan=${plan.id}&err=${kind}`),
          { status: 303 },
        );
      }
      await store.updatePayment(orderId, {
        paymentId: r.paymentId ?? null,
        status: r.status ?? "pending",
        paymentUrl: r.confirmationUrl,
      });
      // В лог — номер заказа и сумма, без персональных данных: почту к
      // заказу всегда можно поднять из базы.
      console.log(`[оплата] заказ ${orderId}: ${amount} коп., статус ${r.status}`);
      await track(req.headers, event);
      return NextResponse.redirect(r.confirmationUrl, { status: 303 });
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

  /*
    Стендовый режим: без реквизитов эквайринга доступ выдаётся сразу, чтобы
    сценарий проходился на машине разработчика.

    🔴 На боевом сайте это недопустимо. 10.09.2026 при переезде с Т-Кассы на
    ЮKassa возникло окно, когда старые реквизиты уже убрали, а новые ещё не
    вписали, — и сайт выдал восемнадцать месяцев доступа бесплатно по двум
    нажатиям кнопки «Оплатить». Поэтому режим включается только явным
    ALLOW_FREE_CHECKOUT=1, а без него человек видит честное «оплата временно
    недоступна» вместо подарка.
  */
  if (process.env.ALLOW_FREE_CHECKOUT !== "1") {
    console.error("[оплата] реквизиты эквайринга не заданы — оплата недоступна");
    await track(req.headers, "checkout_unavailable");
    return NextResponse.redirect(
      absoluteUrl(req, `/checkout?plan=${plan.id}&err=terminal`),
      { status: 303 },
    );
  }
  await track(req.headers, event);
  // Платёж записываем и на стенде: на нём держится реферальный бонус, а
  // баннер «оплата получена» в кабинете смотрит на последний платёж.
  const orderId = `stand-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const payment = await store.createPayment({
    orderId,
    paymentId: null,
    email,
    planId: plan.id,
    amount: priceKopecks(plan),
    autoRenew,
    status: "STAND",
    paymentUrl: null,
    refCode,
  });
  await store.markGranted(orderId);
  const sub = await applyPayment(email, plan, autoRenew);
  notify(sub, "paid").catch(() => {});
  const bonus = await grantReferralBonus(payment, sub);
  if (bonus) notifyReferralBonus(bonus.inviter, bonus.days).catch(() => {});
  const res = NextResponse.redirect(absoluteUrl(req, "/account?paid=1"), { status: 303 });
  setSession(res, sub.token);
  return res;
}
