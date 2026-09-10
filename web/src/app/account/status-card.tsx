import Link from "next/link";
import type { SubRecord } from "@/lib/db";
import { GRACE_HOURS, TRIAL_TRAFFIC_GB } from "@/lib/plans";
import { formatDate, subState, timeLeft } from "@/lib/subscription";

/**
 * Карточка состояния доступа: одна на кабинет и на страницу из письма.
 * Отвечает на три вопроса подряд — что сейчас, до какого числа и что делать.
 */
export default function StatusCard({ sub }: { sub: SubRecord }) {
  const state = subState(sub);
  const left = timeLeft(sub);
  // Доступ выдан, но ссылки из панели ещё нет — честно говорим «готовим».
  const preparing = !sub.panelUrl && !sub.panelLink && (state === "trial" || state === "active");

  const tone = preparing
    ? "border-line bg-surface"
    : state === "trial" || state === "active"
      ? "border-good/40 bg-good/10"
      : state === "grace"
        ? "border-amber-500/50 bg-amber-500/10"
        : "border-bad/40 bg-bad/10";

  const dotTone = preparing
    ? "bg-muted"
    : state === "trial" || state === "active"
      ? "bg-good"
      : state === "grace"
        ? "bg-amber-500"
        : "bg-bad";

  const badge = preparing
    ? "Готовим VPN-доступ"
    : state === "trial"
      ? "Пробный доступ"
      : state === "active"
        ? "Подписка активна"
        : state === "grace"
          ? "Подписка закончилась"
          : "Доступ закончился";

  const title = preparing
    ? "Подписка оформлена"
    : state === "trial"
      ? left.days > 1
        ? `Осталось ${left.days} дня`
        : `Осталось ${left.hours} ч.`
      : state === "active"
        ? `До ${formatDate(sub.expiresAt)}`
        : state === "grace"
          ? `Ещё ${GRACE_HOURS} часа на продление`
          : "Можно возобновить";

  const text = preparing
    ? "Аккаунт готов. Настройки подключения появятся после подготовки доступа."
    : state === "trial"
      ? `Лимит — ${TRIAL_TRAFFIC_GB} ГБ на весь пробный период. Доступ до ${formatDate(sub.expiresAt)}`
      : state === "active"
        ? "Продление прибавит срок к оставшимся дням. Настраивать VPN заново не нужно."
        : state === "grace"
          ? "Доступ пока работает. Продлите подписку, чтобы соединение не прервалось."
          : "После оплаты останутся прежние ссылка и настройки.";

  const action =
    state === "trial"
      ? "Продолжить после пробного"
      : state === "expired"
        ? "Возобновить доступ"
        : "Продлить подписку";

  return (
    <section className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex items-center gap-2 text-sm">
        <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
        <b className="font-medium">{badge}</b>
      </div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
      <Link
        href="/plans"
        className="mt-4 inline-block rounded-xl bg-primary px-4 py-2.5 font-medium text-white transition hover:brightness-110"
      >
        {action} →
      </Link>
      <p className="mt-2 text-xs text-muted">
        {state === "trial"
          ? "Пробный период без автосписаний"
          : sub.autoRenew
            ? "Автопродление включено"
            : "Автопродление выключено"}
      </p>
    </section>
  );
}
