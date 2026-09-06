"use client";

import { useState } from "react";
import { plans } from "@/lib/plans";
import { trackClient } from "@/lib/track-client";

const rub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`;

/**
 * Выбор срока: один список вместо трёх карточек «Выбрать».
 * Решение принимается в одном месте, а кнопка оплаты — одна и всегда внизу,
 * с итоговой суммой перед глазами.
 */
export default function PlanPicker({
  defaultPlanId,
  email,
}: {
  defaultPlanId?: string;
  /** Почта из кабинета: подставим её в оплату, чтобы не вводить заново. */
  email?: string;
}) {
  const [id, setId] = useState(
    () => plans.find((p) => p.id === defaultPlanId)?.id ?? (plans.find((p) => p.popular) ?? plans[0]).id,
  );
  const plan = plans.find((p) => p.id === id) ?? plans[0];
  const href = `/checkout?plan=${plan.id}${email ? `&email=${encodeURIComponent(email)}` : ""}`;

  return (
    <div>
      <div role="radiogroup" aria-label="Срок подписки" className="grid gap-3 sm:grid-cols-3">
        {plans.map((p) => {
          const selected = p.id === id;
          return (
            <label
              key={p.id}
              className={`cursor-pointer rounded-2xl border p-5 transition ${
                selected ? "border-accent bg-accent-soft/40" : "border-line bg-surface hover:border-accent/60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <b className="font-medium">{p.title}</b>
                <input
                  type="radio"
                  name="plan-period"
                  value={p.id}
                  checked={selected}
                  onChange={() => setId(p.id)}
                  aria-label={p.title}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
              </div>
              <span
                className={`mt-1 block text-xs ${
                  p.id === "m12" ? "font-medium text-accent-ink" : "text-muted"
                }`}
              >
                {p.note}
              </span>
              <div className="mt-4 text-2xl font-semibold">
                {p.perMonth} ₽ <span className="text-sm font-normal text-muted">/ месяц</span>
              </div>
              <p className="mt-1 text-sm text-muted">{rub(p.price)} за весь период</p>
            </label>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5">
        <div>
          <span className="text-sm text-muted">{plan.title} · одним платежом</span>
          <div className="text-2xl font-semibold">{rub(plan.price)}</div>
        </div>
        <a
          href={href}
          onClick={() => trackClient("tariff_click", plan.id)}
          className="rounded-xl bg-primary px-5 py-3 font-medium text-white transition hover:brightness-110"
        >
          Перейти к оплате
        </a>
      </div>
    </div>
  );
}
