import Link from "next/link";
import { notFound } from "next/navigation";
import { findPlan, plans } from "@/lib/plans";
import { currentSub } from "@/lib/session";
import { getStore } from "@/lib/db";
import CheckoutForm from "./checkout-form";

/** Ключ формы живёт достаточно, чтобы человек успел подумать. */
const NONCE_TTL_MIN = 60;

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; email?: string }>;
}) {
  const { plan: planId, email: emailParam } = await searchParams;
  const plan = findPlan(planId ?? "") ?? plans.find((p) => p.popular);
  if (!plan) notFound();

  // Почту берём из кабинета, если человек уже вошёл в этом браузере.
  const sub = await currentSub();
  const email = sub?.email ?? emailParam ?? "";
  const nonce = await getStore().createNonce(NONCE_TTL_MIN);

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Link href={sub ? "/account" : "/#tarify"} className="text-sm text-muted hover:text-fg">
        ← {sub ? "В личный кабинет" : "Другой срок"}
      </Link>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Оплата</h1>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-muted">{plan.title}</span>
          <span className="text-2xl font-semibold">{plan.price} ₽</span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {plan.perMonth} ₽ в месяц · все ваши устройства
        </p>

        <CheckoutForm
          planId={plan.id}
          price={plan.price}
          nonce={nonce}
          defaultEmail={email}
          emailLocked={Boolean(sub)}
        />

        <p className="mt-4 text-center text-xs leading-relaxed text-muted">
          После нажатия откроется защищённая страница оплаты Т-Кассы — это
          интернет-эквайринг Т-Бизнеса. Там можно заплатить картой или через
          СБП. Данные карты остаются у банка, мы их не видим и не храним.
        </p>
        <p className="mt-2 text-center text-xs text-muted">
          Если доступ у вас уже есть, в том числе пробный, срок прибавится к
          остатку. Настраивать заново ничего не нужно.
        </p>
      </div>
    </main>
  );
}
