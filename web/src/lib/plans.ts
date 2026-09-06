export type Plan = {
  id: string;
  months: number;
  title: string;
  /** Итоговая цена за весь период, в рублях. */
  price: number;
  /** Цена в пересчёте на месяц — для отображения. */
  perMonth: number;
  /** Скидка относительно месячного тарифа, в процентах. */
  discount?: number;
  /** Короткая подпись в выборе срока: чем этот срок отличается от соседних. */
  note: string;
  popular?: boolean;
};

// Один план, три срока. Цены зафиксированы продуктовым решением 05.09.2026.
const MONTHLY = 250;

function makePlan(
  id: string,
  months: number,
  title: string,
  price: number,
  note: string,
  popular = false,
): Plan {
  const perMonth = Math.round(price / months);
  const discount = Math.round((1 - price / (MONTHLY * months)) * 100);
  return {
    id,
    months,
    title,
    price,
    perMonth,
    note,
    discount: discount > 0 ? discount : undefined,
    popular,
  };
}

export const plans: Plan[] = [
  makePlan("m1", 1, "1 месяц", MONTHLY, "Короткий срок"),
  makePlan("m6", 6, "6 месяцев", 1350, "Экономия 10%", true),
  // Подпись «самая низкая цена за месяц» стоит у 12 месяцев, а не у 6:
  // выгоднее всего именно длинный срок, макет 02 это исправляет.
  makePlan("m12", 12, "12 месяцев", 2400, "Самая низкая цена за месяц"),
];

export function findPlan(id: string): Plan | undefined {
  return plans.find((p) => p.id === id);
}

/**
 * Сумма к списанию — в копейках и только с сервера. Из браузера принимается
 * лишь идентификатор тарифа: иначе подписку можно купить за рубль, поправив
 * запрос в консоли браузера.
 */
export function priceKopecks(plan: Plan): number {
  const override = process.env[`PRICE_${plan.id.toUpperCase()}_KOPECKS`];
  const n = override ? Number(override) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : plan.price * 100;
}

export const TRIAL_DAYS = 3;
/**
 * Лимит трафика на пробный период, ГБ. Продуктовое решение: «триал 3 дня,
 * лимит трафика остаётся». Число можно переопределить переменной окружения
 * TRIAL_TRAFFIC_GB без правки кода.
 */
export const TRIAL_TRAFFIC_GB = Number(process.env.TRIAL_TRAFFIC_GB ?? 10);
/** Грейс-период после окончания платной подписки, часов. */
export const GRACE_HOURS = 24;

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * 86400_000);
}
