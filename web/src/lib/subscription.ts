import { getPanel } from "./panel";
import { getStore, newAccountToken, type SubRecord } from "./db";
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

/** none — аккаунт есть, доступ ещё не выбран (ни триала, ни оплаты). */
export type SubState = "none" | "trial" | "active" | "grace" | "expired";

export function subState(sub: SubRecord, now = new Date()): SubState {
  if (sub.planId === "none") return "none";
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
  none: "Доступ ещё не подключён",
  trial: "Пробный период",
  active: "Доступ активен",
  grace: "Подписка закончилась — доступ отключится в ближайшие часы",
  expired: "Подписка закончилась",
};

/** Когда панель должна отключить доступ: для платных — с запасом на грейс. */
function panelExpiry(expiresAt: Date, isTrial: boolean): Date {
  return isTrial ? expiresAt : new Date(expiresAt.getTime() + GRACE_HOURS * 3600_000);
}

/**
 * Завести доступ в панели для аккаунта, у которого его ещё нет. Ошибки не
 * пробрасывает: аккаунт на сайте живёт независимо, попытка повторится
 * (планировщик раз в 10 минут и каждое открытие кабинета).
 */
export async function provisionPanel(sub: SubRecord): Promise<SubRecord> {
  if (sub.panelToken) return sub;
  try {
    const panelSub = await getPanel().createSubscription({
      email: sub.email,
      expiresAt: panelExpiry(sub.expiresAt, sub.isTrial),
      trafficLimitBytes: sub.isTrial ? Math.round(TRIAL_TRAFFIC_GB * 1024 ** 3) : 0,
    });
    const access = {
      panelToken: panelSub.token,
      panelUrl: panelSub.url ?? null,
      panelLink: panelSub.rawLink ?? null,
      panelUserId: panelSub.userId ?? null,
    };
    await getStore().setPanelAccess(sub.token, access);
    return { ...sub, ...access };
  } catch (e) {
    console.error("[panel] provision failed for", sub.email, (e as Error).message);
    return sub;
  }
}

/** Проход планировщика: доделать доступы, которые не удалось завести сразу. */
export async function provisionPending(): Promise<number> {
  const pending = await getStore().listUnprovisioned(50);
  let done = 0;
  for (const sub of pending) {
    if ((await provisionPanel(sub)).panelToken) done++;
  }
  return done;
}

/** Регистрация: просто аккаунт. Триал или тариф человек выбирает сам в кабинете. */
export async function createAccount(email: string): Promise<SubRecord> {
  return getStore().createSub({
    token: newAccountToken(),
    email,
    planId: "none",
    months: 0,
    autoRenew: false,
    expiresAt: new Date(),
    isTrial: false,
  });
}

/** Пробный период по явному выбору. Один на аккаунт. Панель — следом, не блокирует. */
export async function startTrial(sub: SubRecord): Promise<SubRecord | null> {
  if (sub.trialUsed || sub.planId !== "none") return null;
  const updated = await getStore().updateSub(sub.token, {
    planId: "trial",
    months: 0,
    autoRenew: false,
    expiresAt: addDays(new Date(), TRIAL_DAYS),
    isTrial: true,
    trialUsed: true,
  });
  return updated ? provisionPanel(updated) : null;
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
    const updated =
      (await store.updateSub(existing.token, {
        planId: plan.id,
        months: plan.months,
        autoRenew,
        expiresAt,
        isTrial: false,
      })) ?? existing;
    if (existing.panelToken) {
      try {
        await panel.updateSubscription(
          existing.panelToken,
          {
            expiresAt: panelExpiry(expiresAt, false),
            trafficLimitBytes: 0, // после оплаты лимит триала снимается
          },
          existing.panelUserId,
        );
      } catch (e) {
        // Срок в базе уже новый; панель догоним при следующей синхронизации.
        console.error("[panel] extend failed for", email, (e as Error).message);
      }
      return updated;
    }
    return provisionPanel(updated);
  }

  const expiresAt = addMonths(now, plan.months);
  const sub = await store.createSub({
    token: newAccountToken(),
    email,
    planId: plan.id,
    months: plan.months,
    autoRenew,
    expiresAt,
    isTrial: false,
  });
  return provisionPanel(sub);
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
