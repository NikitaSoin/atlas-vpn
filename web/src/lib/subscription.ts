import { getPanel } from "./panel";
import { getStore, type SubRecord } from "./db";
import {
  addDays,
  addMonths,
  GRACE_HOURS,
  TRIAL_DAYS,
  TRIAL_TRAFFIC_GB,
  type Plan,
} from "./plans";

/**
 * Бизнес-логика подписки в одном месте: триал, оплата, продление, статус.
 * Сайт — источник правды по срокам; панель получает готовые даты.
 *
 * Правила:
 *  - триал: TRIAL_DAYS дней, лимит трафика, без грейс-периода, один на email;
 *  - оплата: срок прибавляется к остатку (в т.ч. к остатку триала), лимит
 *    трафика снимается, панель отключает доступ через GRACE_HOURS после
 *    окончания — это и есть грейс-период;
 *  - токен и ссылка никогда не меняются.
 */

export type SubState = "trial" | "active" | "grace" | "expired";

export function subState(sub: SubRecord, now = new Date()): SubState {
  if (now < sub.expiresAt) return sub.isTrial ? "trial" : "active";
  if (!sub.isTrial && now < graceEnd(sub)) return "grace";
  return "expired";
}

export function graceEnd(sub: SubRecord): Date {
  return new Date(sub.expiresAt.getTime() + GRACE_HOURS * 3600_000);
}

/** Сколько осталось: дни (округление вверх) и часы для последних суток. */
export function timeLeft(sub: SubRecord, now = new Date()) {
  const ms = Math.max(0, sub.expiresAt.getTime() - now.getTime());
  return { days: Math.ceil(ms / 86400_000), hours: Math.ceil(ms / 3600_000) };
}

export const stateLabel: Record<SubState, string> = {
  trial: "Пробный период",
  active: "Доступ активен",
  grace: "Подписка закончилась — доступ отключится в ближайшие часы",
  expired: "Подписка закончилась",
};

/** Когда панель должна отключить доступ: для платных — с запасом на грейс. */
function panelExpiry(expiresAt: Date, isTrial: boolean): Date {
  return isTrial ? expiresAt : new Date(expiresAt.getTime() + GRACE_HOURS * 3600_000);
}

export async function startTrial(email: string): Promise<SubRecord> {
  const expiresAt = addDays(new Date(), TRIAL_DAYS);
  const panelSub = await getPanel().createSubscription({
    email,
    expiresAt,
    trafficLimitBytes: Math.round(TRIAL_TRAFFIC_GB * 1024 ** 3),
  });
  return getStore().createSub({
    token: panelSub.token,
    email,
    planId: "trial",
    months: 0,
    autoRenew: false,
    expiresAt,
    isTrial: true,
  });
}

/** Оплата: новая подписка или продление существующей (в т.ч. триала). */
export async function applyPayment(
  email: string,
  plan: Plan,
  autoRenew: boolean,
): Promise<SubRecord> {
  const store = getStore();
  const panel = getPanel();
  const existing = await store.findSubByEmail(email);
  const now = new Date();

  if (existing) {
    const base = existing.expiresAt > now ? existing.expiresAt : now;
    const expiresAt = addMonths(base, plan.months);
    await panel.updateSubscription(existing.token, {
      expiresAt: panelExpiry(expiresAt, false),
      trafficLimitBytes: 0, // после оплаты лимит триала снимается
    });
    const updated = await store.updateSub(existing.token, {
      planId: plan.id,
      months: plan.months,
      autoRenew,
      expiresAt,
      isTrial: false,
    });
    return updated ?? existing;
  }

  const expiresAt = addMonths(now, plan.months);
  const panelSub = await panel.createSubscription({
    email,
    expiresAt: panelExpiry(expiresAt, false),
  });
  return store.createSub({
    token: panelSub.token,
    email,
    planId: plan.id,
    months: plan.months,
    autoRenew,
    expiresAt,
    isTrial: false,
  });
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateTime(d: Date): string {
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });
}
