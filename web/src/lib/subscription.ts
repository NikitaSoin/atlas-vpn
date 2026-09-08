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

/**
 * Сверка сроков с панелью. Сайт — источник правды: если оплата прошла, а
 * панель в тот момент не ответила, срок в базе новый, а в панели старый.
 * Раньше такая ошибка только писалась в журнал и больше никем не
 * подхватывалась (гипотеза 5 из разбора 06.09.2026). Теперь планировщик
 * раз в 10 минут дожимает панель до состояния базы.
 * Возвращает число исправленных записей.
 */
export async function reconcilePanel(): Promise<number> {
  const store = getStore();
  const panel = getPanel();
  let fixed = 0;
  for (const sub of await store.listProvisioned(200)) {
    if (!sub.panelToken) continue;
    const wanted = panelExpiry(sub.expiresAt, sub.isTrial);
    try {
      const current = await panel.getSubscription(sub.panelToken, false);
      if (!current) continue;
      // Минутная погрешность — не повод дёргать панель.
      if (Math.abs(current.expiresAt.getTime() - wanted.getTime()) < 60_000) continue;
      await panel.updateSubscription(
        sub.panelToken,
        { expiresAt: wanted, trafficLimitBytes: sub.isTrial ? undefined : 0 },
        sub.panelUserId,
      );
      console.log(`[panel] срок выровнен: ${sub.email} → ${wanted.toISOString().slice(0, 10)}`);
      fixed++;
    } catch (e) {
      console.error("[panel] сверка не удалась:", sub.email, (e as Error).message);
    }
  }
  return fixed;
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
export async function createAccount(
  email: string,
  passwordHash: string | null = null,
): Promise<SubRecord> {
  return getStore().createSub({
    token: newAccountToken(),
    email,
    passwordHash,
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

/**
 * Возврат денег: снимаем ровно тот срок, который дала возвращённая оплата.
 *
 * Раньше здесь срок обнулялся целиком, и вместе с возвращённым месяцем сгорал
 * остаток пробного периода и другие оплаченные месяцы. Так нельзя: человеку
 * вернули деньги за одну покупку, а не за всё, что у него было.
 *
 * `share` — какая доля платежа возвращена: 1 при полном возврате, меньше при
 * частичном. Срок не уходит дальше текущего момента: если после вычитания он
 * оказывается в прошлом, доступ просто заканчивается сейчас.
 *
 * Автопродление выключаем в любом случае: человек, попросивший деньги назад,
 * не ждёт нового списания.
 */
export async function revokePayment(
  email: string,
  plan: Plan,
  share = 1,
): Promise<SubRecord | null> {
  const store = getStore();
  const sub = await store.findSubByEmail(email);
  if (!sub) return null;

  const part = Math.min(Math.max(share, 0), 1);
  // Сколько времени дала эта оплата: считаем от нынешнего срока назад на её
  // длительность. Так учитываются и разная длина месяцев, и переход через год.
  const grantedMs =
    sub.expiresAt.getTime() - addMonths(sub.expiresAt, -plan.months).getTime();
  const now = new Date();
  const rolled = new Date(sub.expiresAt.getTime() - Math.round(grantedMs * part));
  const expiresAt = rolled > now ? rolled : now;

  const updated = (await store.updateSub(sub.token, { expiresAt, autoRenew: false })) ?? sub;
  if (updated.panelToken) {
    try {
      await getPanel().updateSubscription(
        updated.panelToken,
        { expiresAt: panelExpiry(expiresAt, updated.isTrial) },
        updated.panelUserId,
      );
    } catch (e) {
      // Срок в базе уже верный, панель догонит при следующей сверке.
      console.error("[возврат] панель не обновилась:", (e as Error).message);
    }
  }
  return updated;
}

/** Оплата была только что: показываем баннер «оплата получена» час после неё. */
export function paidRecently(grantedAt: Date | null | undefined): boolean {
  if (!grantedAt) return false;
  return new Date().getTime() - grantedAt.getTime() < 3600_000;
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
