import Link from "next/link";
import { currentSub } from "@/lib/session";
import { subState } from "@/lib/subscription";
import TrialOffer from "../trial-offer";
import PlanPicker from "./plan-picker";

export const dynamic = "force-dynamic";

/**
 * Тарифы отдельной страницей — их видно и до регистрации.
 * Сначала бесплатный вариант, потом сроки: сначала попробовать, потом решать.
 */
export default async function PlansPage() {
  const sub = await currentSub();
  const state = sub ? subState(sub) : null;
  const hasAccess = Boolean(state && state !== "none");

  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <Link href={sub ? "/account" : "/"} className="text-sm text-muted hover:text-fg">
        ← {sub ? "В кабинет" : "На главную"}
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">Выберите доступ</h1>
      <p className="mt-2 text-muted">Одна подписка на все ваши устройства.</p>

      {!hasAccess && !sub?.trialUsed && (
        <div className="mt-8">
          <TrialOffer signedIn={Boolean(sub)} place="plans" />
        </div>
      )}

      {hasAccess && (
        <p className="mt-8 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
          {state === "trial"
            ? "Идёт пробный доступ. Оплаченный срок добавится к остатку."
            : "Новая оплата продлит доступ. Ссылка и настройки сохранятся."}
        </p>
      )}

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        {hasAccess ? "Продлить подписку" : "Или сразу оплатите"}
      </h2>
      <div className="mt-4">
        <PlanPicker
          defaultPlanId={sub && !sub.isTrial ? sub.planId : undefined}
          email={sub?.email}
        />
      </div>
    </main>
  );
}
