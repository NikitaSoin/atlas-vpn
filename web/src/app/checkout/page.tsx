import Link from "next/link";
import { notFound } from "next/navigation";
import { findPlan, plans } from "@/lib/plans";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan: planId } = await searchParams;
  const plan = findPlan(planId ?? "") ?? plans.find((p) => p.popular);
  if (!plan) notFound();

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Link href="/#tarify" className="text-sm text-muted hover:text-fg">
        ← Другой тариф
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Оплата</h1>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-muted">{plan.title}</span>
          <span className="text-2xl font-semibold">{plan.price} ₽</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {plan.perMonth} ₽ в месяц · до 3 устройств
        </p>

        <form action="/api/checkout" method="POST" className="mt-6 space-y-4">
          <input type="hidden" name="plan" value={plan.id} />
          <label className="block">
            <span className="text-sm text-muted">Email для доступа и чека</span>
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-xl border border-line bg-ink px-4 py-2.5 outline-none placeholder:text-muted/60 focus:border-accent"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-white transition hover:brightness-110"
          >
            Оплатить {plan.price} ₽
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          Платёжный провайдер ещё не подключён — сейчас кнопка сразу выдаёт
          доступ, чтобы можно было пройти сценарий целиком.
        </p>
      </div>
    </main>
  );
}
