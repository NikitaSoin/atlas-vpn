import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { findPlan } from "@/lib/plans";
import { applyPayment, revokePayment } from "@/lib/subscription";
import { notify } from "@/lib/notify";
import { track } from "@/lib/analytics";
import { fromYooKassa, getPayment, getRefund } from "@/lib/acquiring";

/**
 * Уведомления ЮKassa — единственное место, где выдаётся оплаченный доступ.
 *
 * 🔴 Уведомления ЮKassa НЕ подписаны. Поэтому тело запроса здесь считается
 * только подсказкой: «посмотри на такой-то объект». Всё, что влияет на деньги
 * и доступ, берётся из ответа API по этому объекту. Подделать уведомление
 * бесполезно: подделка не изменит того, что ответит ЮKassa.
 *
 * Адрес отправителя проверяем первым фильтром — он отсекает шум, но сам по
 * себе доказательством не считается: заголовки прокси подделываются.
 *
 * Начисление идемпотентно: право начислить даёт отметка granted_at, которая
 * ставится условным UPDATE. Повторная доставка не удвоит срок.
 *
 * Отвечаем 200 всегда, когда запрос разобран: иначе ЮKassa будет повторять
 * доставку сутки.
 */
export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (ip && !fromYooKassa(ip)) {
    console.error("[оплата] уведомление с чужого адреса:", ip);
    return NextResponse.json({ error: "Чужой адрес" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    event?: string;
    object?: { id?: string };
  } | null;
  const event = String(body?.event ?? "");
  const objectId = String(body?.object?.id ?? "");
  if (!event || !objectId) {
    return NextResponse.json({ error: "Не разобрано" }, { status: 400 });
  }

  const store = getStore();

  if (event === "payment.succeeded" || event === "payment.canceled") {
    // Состояние берём у ЮKassa, а не из тела уведомления.
    const p = await getPayment(objectId);
    if (!p.ok || !p.orderId) {
      console.error("[оплата] платёж не подтверждён API:", objectId, p.errorCode);
      return new Response("OK");
    }
    const payment = await store.findPayment(p.orderId);
    if (!payment) {
      console.error("[оплата] неизвестный заказ", p.orderId);
      return new Response("OK");
    }
    await store.updatePayment(p.orderId, { status: p.status ?? "", paymentId: objectId });

    if (p.status !== "succeeded" || !p.paid) {
      await track(req.headers, "payment_failed");
      return new Response("OK");
    }
    // Сумму сверяем с той, что мы просили: платёж на другую сумму не начисляем.
    if (p.amountKopecks !== payment.amount) {
      console.error(`[оплата] сумма не совпала: ждали ${payment.amount}, пришло ${p.amountKopecks}`);
      return new Response("OK");
    }
    if (await store.markGranted(p.orderId)) {
      const plan = findPlan(payment.planId);
      if (plan) {
        const sub = await applyPayment(payment.email, plan, payment.autoRenew);
        await track(req.headers, "payment_granted");
        notify(sub, "paid").catch(() => {});
      }
    }
    return new Response("OK");
  }

  if (event === "refund.succeeded") {
    const r = await getRefund(objectId);
    if (!r.ok || !r.paymentId) return new Response("OK");
    const p = await getPayment(r.paymentId);
    if (!p.ok || !p.orderId) return new Response("OK");
    const payment = await store.findPayment(p.orderId);
    if (!payment || !payment.grantedAt) return new Response("OK");

    // Возврат забирает ровно свою часть срока, а не весь доступ: остаток
    // пробного периода и другие оплаченные месяцы человека не касаются.
    const refunded = r.amountKopecks ?? 0;
    const share = refunded > 0 && payment.amount > 0 ? refunded / payment.amount : 1;
    const plan = findPlan(payment.planId);
    if (plan) {
      const sub = await revokePayment(payment.email, plan, share);
      if (sub) notify(sub, "refunded").catch(() => {});
    }
    await store.updatePayment(p.orderId, { status: "refunded" });
    // Отметку о начислении снимаем только при полном возврате: иначе второй
    // частичный возврат по тому же заказу мы бы молча пропустили.
    if (share >= 1) await store.clearGranted(p.orderId);
    await track(req.headers, "payment_refunded");
    return new Response("OK");
  }

  return new Response("OK");
}
