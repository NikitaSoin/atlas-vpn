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
  popular?: boolean;
};

// Один план, три срока. Цены зафиксированы продуктовым решением 05.09.2026.
const MONTHLY = 250;

function makePlan(
  id: string,
  months: number,
  title: string,
  price: number,
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
    discount: discount > 0 ? discount : undefined,
    popular,
  };
}

export const plans: Plan[] = [
  makePlan("m1", 1, "1 месяц", MONTHLY),
  makePlan("m6", 6, "6 месяцев", 1350, true),
  makePlan("m12", 12, "12 месяцев", 2400),
];

export function findPlan(id: string): Plan | undefined {
  return plans.find((p) => p.id === id);
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
