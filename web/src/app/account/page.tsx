import Link from "next/link";
import { redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import { plans } from "@/lib/plans";
import { currentSub } from "@/lib/session";
import { getStore } from "@/lib/db";
import { formatDate, paidRecently, subState } from "@/lib/subscription";
import { REFUND_STATUSES } from "@/lib/acquiring";
import SetupSection from "../setup/setup-section";
import TrialOffer from "../trial-offer";
import PlanPicker from "../plans/plan-picker";
import StatusCard from "./status-card";

export const dynamic = "force-dynamic";

const btnGhost =
  "rounded-xl border border-line px-4 py-2.5 text-sm transition hover:border-accent";

/** Шапка кабинета: кто вошёл и как выйти. */
function Head({ email, title }: { email: string; title: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <span className="text-xs font-medium tracking-[0.12em] text-muted">
          ЛИЧНЫЙ КАБИНЕТ
        </span>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-muted">{email}</p>
      </div>
      <form action="/api/account" method="POST">
        <input type="hidden" name="action" value="logout" />
        <button className="text-sm text-muted hover:text-fg">Выйти</button>
      </form>
    </div>
  );
}

/** Аккаунт есть, доступ ещё не выбран: пробный период или срок. */
function ChooseAccess({
  email,
  trialUsed,
  err,
}: {
  email: string;
  trialUsed: boolean;
  err?: string;
}) {
  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <Head email={email} title="Начнём с доступа" />
      {err === "trial" && (
        <p className="mt-6 text-sm text-bad">
          Пробный период на этот аккаунт уже был. Выберите платный срок.
        </p>
      )}
      {!trialUsed && (
        <div className="mt-8">
          <TrialOffer signedIn place="account" />
        </div>
      )}
      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        {trialUsed ? "Выберите подписку" : "Или выберите подписку"}
      </h2>
      <div className="mt-4">
        <PlanPicker email={email} />
      </div>
    </main>
  );
}

/**
 * Кабинет: слева — подключение устройства и короткий блок аккаунта,
 * справа — состояние доступа и помощь. Настройки, пароль и удаление живут
 * на отдельной странице, чтобы главный экран отвечал на один вопрос:
 * «как мне подключиться и сколько осталось».
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string; err?: string; paid?: string }>;
}) {
  const sub = await currentSub();
  if (!sub) redirect("/start?mode=login");
  const { err, paid } = await searchParams;
  // Банк возвращает человека на главную без номера заказа — смотрим сами,
  // чем закончился его последний платёж.
  const lastPay = await getStore().lastPayment(sub.email);
  const justPaid = Boolean(paid) || paidRecently(lastPay?.grantedAt);

  // Возврат виден человеку сразу: он только что нажал кнопку в банке и должен
  // понимать, что деньги придут и что осталось от доступа. Показываем и когда
  // доступа не осталось вовсе — иначе он увидит пустой экран без объяснения.
  const refunded = Boolean(lastPay && REFUND_STATUSES.has(lastPay.status));
  const stillActive = sub.expiresAt > new Date();
  const refundNotice = refunded ? (
    <div className="mt-6 rounded-2xl border border-line bg-surface p-4 text-sm">
      <p className="font-medium">Возврат оформлен</p>
      <p className="mt-1 leading-relaxed text-fg/80">
        Деньги вернутся на ту же карту, которой вы платили. Обычно это занимает три
        рабочих дня, по правилам банка — до десяти. Подтверждать ничего не нужно.
        {stillActive
          ? ` Остальной доступ не тронут: он действует до ${formatDate(sub.expiresAt)}.`
          : " Доступ по этой оплате закрыт."}
      </p>
    </div>
  ) : null;

  const state = subState(sub);
  if (state === "none")
    return (
      <>
        {refundNotice}
        <ChooseAccess email={sub.email} trialUsed={sub.trialUsed} err={err} />
      </>
    );

  const planTitle = sub.isTrial
    ? "Пробный доступ"
    : (plans.find((p) => p.id === sub.planId)?.title ?? "Подписка");

  return (
    <main className="mx-auto max-w-5xl px-5 py-16">
      <Head email={sub.email} title={`Ваш ${brand.name}`} />

      {refundNotice}

      {justPaid && !refunded && (
        <div className="mt-6 rounded-2xl border border-good/40 bg-good/10 p-4 text-sm">
          <p className="font-medium text-good">Оплата получена</p>
          <p className="mt-1 text-fg/80">
            {planTitle} · настройки остаются прежними. Доступ до{" "}
            {formatDate(sub.expiresAt)}
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <SetupSection sub={sub} />

          <section className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">Аккаунт и уведомления</h2>
                <p className="mt-1 text-sm text-muted">{sub.email}</p>
              </div>
              <Link href="/account/settings" className={btnGhost}>
                Настроить →
              </Link>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-2">
              <span>Напоминания на почту</span>
              <span className={sub.telegramChatId ? "text-good sm:text-right" : "sm:text-right"}>
                {sub.telegramChatId ? "Telegram подключён" : "Telegram не подключён"}
              </span>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <StatusCard sub={sub} />

          <section className="rounded-2xl border border-line bg-surface p-5">
            <h3 className="font-medium">Помощь с подключением</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Опишите, на каком шаге возникла проблема.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/support" className={btnGhost}>
                Написать в поддержку
              </Link>
              <a href={brand.supportTelegram} target="_blank" rel="noreferrer" className={btnGhost}>
                Telegram
              </a>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
