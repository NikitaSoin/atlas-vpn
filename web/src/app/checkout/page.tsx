import Link from "next/link";
import { notFound } from "next/navigation";
import { findPlan, plans } from "@/lib/plans";
import { brand } from "@/lib/brand";
import { currentSub } from "@/lib/session";
import { getStore } from "@/lib/db";
import { acquiringConfigured, acquiringDemo } from "@/lib/acquiring";
import CheckoutForm from "./checkout-form";
import PaymentMethods from "../payment-methods";

/** Ключ формы живёт достаточно, чтобы человек успел подумать. */
const NONCE_TTL_MIN = 60;

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; email?: string; err?: string }>;
}) {
  const { plan: planId, email: emailParam, err } = await searchParams;
  const plan = findPlan(planId ?? "") ?? plans.find((p) => p.popular);
  if (!plan) notFound();

  // Почту берём из кабинета, если человек уже вошёл в этом браузере.
  const sub = await currentSub();
  const email = sub?.email ?? emailParam ?? "";
  const nonce = await getStore().createNonce(NONCE_TTL_MIN);

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Link href="/plans" className="text-sm text-muted hover:text-fg">
        ← К тарифам
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Оплата подписки</h1>
      <p className="mt-2 text-muted">Проверьте срок и почту перед переходом в банк.</p>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <div className="divide-y divide-line/70 text-sm">
          <div className="flex items-baseline justify-between gap-3 pb-2.5">
            <span className="text-muted">{brand.name}</span>
            <b className="font-medium">{plan.title}</b>
          </div>
          <div className="flex items-baseline justify-between gap-3 py-2.5">
            <span className="text-muted">В пересчёте на месяц</span>
            <b className="font-medium">{plan.perMonth} ₽</b>
          </div>
          <div className="flex items-baseline justify-between gap-3 pt-2.5">
            <span className="text-muted">Одним платежом</span>
            <b className="text-xl font-semibold">
              {plan.price.toLocaleString("ru-RU")} ₽
            </b>
          </div>
        </div>

        {err === "bank" && (
          <p className="mt-4 rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
            Банк не принял платёж — попробуйте ещё раз через минуту. Деньги не
            списаны. Если повторится, напишите в поддержку.
          </p>
        )}
        {err === "terminal" && (
          <p className="mt-4 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
            <span className="font-medium text-amber-700">Оплата временно недоступна.</span>{" "}
            <span className="text-muted">
              Мы уже чиним — это на нашей стороне, деньги не списаны. Напишите в{" "}
              <a href={brand.supportTelegram} className="underline" target="_blank" rel="noreferrer">
                поддержку
              </a>
              , подключим доступ вручную.
            </span>
          </p>
        )}
        {acquiringDemo() && (
          <p className="mt-4 rounded-xl border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-700">
            Тестовый терминал: форма оплаты настоящая, деньги не списываются.
          </p>
        )}

        <CheckoutForm
          planId={plan.id}
          price={plan.price}
          nonce={nonce}
          defaultEmail={email}
          emailLocked={Boolean(sub)}
        />

        <p className="mt-4 text-center text-xs leading-relaxed text-muted">
          {acquiringConfigured()
            ? "После нажатия откроется защищённая страница оплаты Т-Кассы — это интернет-эквайринг Т-Бизнеса. Там можно заплатить картой или через СБП. Данные карты остаются у банка, мы их не видим и не храним."
            : "Приём оплаты ещё настраивается: сейчас доступ включится сразу, без списания."}
        </p>
        <p className="mt-2 text-center text-xs text-muted">
          Новый срок добавляется к остатку доступа, в том числе пробного.
          Настраивать заново ничего не нужно.
        </p>
      </div>
      <div className="mt-6">
        <PaymentMethods />
      </div>

    </main>
  );
}
