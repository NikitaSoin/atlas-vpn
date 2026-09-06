"use client";

import { useState } from "react";

/**
 * Форма оплаты. Кнопка блокируется на первом же клике: без этого повторный
 * клик по подвисшей странице отправлял вторую оплату и срок прибавлялся
 * дважды. Вторая линия защиты — одноразовый ключ формы на сервере.
 */
export default function CheckoutForm({
  planId,
  price,
  nonce,
  defaultEmail,
  emailLocked,
}: {
  planId: string;
  price: number;
  nonce: string;
  defaultEmail: string;
  /** Почта известна из кабинета — показываем, но не даём случайно изменить. */
  emailLocked: boolean;
}) {
  const [sending, setSending] = useState(false);

  return (
    <form
      action="/api/checkout"
      method="POST"
      onSubmit={(e) => {
        if (sending) e.preventDefault();
        else setSending(true);
      }}
      className="mt-6 space-y-4"
    >
      <input type="hidden" name="plan" value={planId} />
      <input type="hidden" name="nonce" value={nonce} />
      <label className="block">
        <span className="text-sm text-muted">Почта для доступа и чека</span>
        <input
          type="email"
          name="email"
          required
          readOnly={emailLocked}
          defaultValue={defaultEmail}
          placeholder="you@example.com"
          className={`mt-1.5 w-full rounded-xl border border-line px-4 py-2.5 outline-none placeholder:text-muted/60 focus:border-accent ${
            emailLocked ? "bg-surface-2 text-muted" : "bg-ink"
          }`}
        />
      </label>
      {/* Галочка НЕ отмечена заранее: с 01.09.2025 ст. 16 ЗоЗПП прямо
          запрещает автоматические механики согласия. */}
      <label className="flex items-start gap-2.5 text-sm text-muted">
        <input
          type="checkbox"
          name="autoRenew"
          className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
        />
        <span>
          Продлевать автоматически: списывать {price} ₽ в день окончания
          доступа. Отключить можно в личном кабинете в любой момент.
        </span>
      </label>
      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70 disabled:hover:brightness-100"
      >
        {sending ? "Готовим оплату, секунду…" : `Перейти к оплате · ${price} ₽`}
      </button>
    </form>
  );
}
