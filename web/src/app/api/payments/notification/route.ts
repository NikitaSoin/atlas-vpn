import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { findPlan } from "@/lib/plans";
import { applyPayment } from "@/lib/subscription";
import { notify } from "@/lib/notify";
import { track } from "@/lib/analytics";
import {
  FAILED_STATUSES,
  PAID_STATUSES,
  REFUND_STATUSES,
  verifyNotification,
} from "@/lib/acquiring";

/**
 * Вебхук банка — единственное место, где выдаётся оплаченный доступ.
 *
 * Порядок важен: сначала подпись, потом всё остальное. Без проверки подписи
 * сам адрес вебхука становится способом выписать себе подписку обычным POST.
 *
 * Начисление идемпотентно: банк повторяет доставку, пока не получит ровно
 * строку "OK". Право начислить даёт только отметка granted_at, которая
 * ставится условным UPDATE — две одновременные доставки не удвоят срок.
 *
 * Возвраты обрабатываются наравне с оплатой: иначе возврат денег превращается
 * в подарок — деньги ушли обратно, а доступ остался.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, string | number | boolean> | null;
  if (!body || !verifyNotification(body)) {
    console.error("[оплата] нотификация с неверной подписью");
    return NextResponse.json({ error: "Неверная подпись" }, { status: 403 });
  }

  const orderId = String(body.OrderId ?? "");
  const status = String(body.Status ?? "");
  const store = getStore();
  const payment = orderId ? await store.findPayment(orderId) : null;
  if (!payment) {
    // Заказ не наш, но банку отвечаем OK — иначе он будет слать вечно.
    console.error("[оплата] неизвестный заказ", orderId);
    return new Response("OK");
  }

  await store.updatePayment(orderId, {
    status,
    paymentId: body.PaymentId ? String(body.PaymentId) : null,
  });

  if (PAID_STATUSES.has(status)) {
    // Сумму сверяем с той, что мы просили: платёж на другую сумму не начисляем.
    const paid = Number(body.Amount ?? 0);
    if (paid !== payment.amount) {
      console.error(`[оплата] сумма не совпала: ждали ${payment.amount}, пришло ${paid}`);
      return new Response("OK");
    }
    if (await store.markGranted(orderId)) {
      const plan = findPlan(payment.planId);
      if (plan) {
        const sub = await applyPayment(payment.email, plan, payment.autoRenew);
        await track(req.headers, "payment_granted");
        notify(sub, "paid").catch(() => {});
      }
    }
    return new Response("OK");
  }

  if (REFUND_STATUSES.has(status) && payment.grantedAt) {
    // Деньги вернули — забираем доступ: срок откатываем на момент возврата.
    const sub = await store.findSubByEmail(payment.email);
    if (sub) await store.updateSub(sub.token, { expiresAt: new Date(), autoRenew: false });
    await store.clearGranted(orderId);
    await track(req.headers, "payment_refunded");
    return new Response("OK");
  }

  if (FAILED_STATUSES.has(status)) await track(req.headers, "payment_failed");
  return new Response("OK");
}
