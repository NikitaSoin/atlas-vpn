import Link from "next/link";
import { redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import { plans } from "@/lib/plans";
import { currentSub } from "@/lib/session";
import { getStore } from "@/lib/db";
import {
  formatDate,
  paidRecently,
  REFERRAL_BONUS_DAYS,
  referralLink,
  subState,
} from "@/lib/subscription";
import { REFUND_STATUSES } from "@/lib/acquiring";
import SetupSection from "../setup/setup-section";
import TrialOffer from "../trial-offer";
import PlanPicker from "../plans/plan-picker";
import StatusCard from "./status-card";
import CopyField from "./copy-field";

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

/**
 * Промокод. Причину отказа не уточняем — один ответ на «не найден»,
 * «исчерпан», «просрочен» и «уже применяли», иначе форма превращается в
 * способ перебирать чужие коды. После неудачи блок остаётся раскрытым.
 */
function PromoForm({ result }: { result?: string }) {
  return (
    <details className="rounded-2xl border border-line bg-surface p-5" open={result === "bad"}>
      <summary className="cursor-pointer font-medium">Есть промокод?</summary>
      {result === "bad" && (
        <p className="mt-2 text-sm text-bad">
          Код не подошёл. Проверьте написание — возможно, он уже использован или
          его срок закончился.
        </p>
      )}
      <form action="/api/promo" method="POST" className="mt-3 flex flex-wrap gap-2">
        <input
          name="code"
          required
          autoComplete="off"
          placeholder="Промокод"
          className="min-w-0 flex-1 rounded-xl border border-line bg-ink px-4 py-2.5 uppercase outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2.5 font-medium text-white transition hover:brightness-110"
        >
          Применить
        </button>
      </form>
    </details>
  );
}

/** Реферальная программа: ссылка, условия, сколько уже пришло и начислено. */
function ReferralCard({
  link,
  stats,
}: {
  link: string;
  stats: { invited: number; paid: number; bonusDays: number };
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h3 className="font-medium">Пригласите друга</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">
        Когда друг по вашей ссылке оплатит первую подписку, вам добавятся дни бесплатно:
        месяц — {REFERRAL_BONUS_DAYS.m1} дней, полгода — {REFERRAL_BONUS_DAYS.m6}, год —{" "}
        {REFERRAL_BONUS_DAYS.m12}. Дни прибавляются к вашему сроку.
      </p>
      <CopyField value={link} />
      <p className="mt-2 text-xs text-muted">
        Перешли по ссылке: {stats.invited} · оплатили: {stats.paid} · начислено вам:{" "}
        {stats.bonusDays} дн.
      </p>
    </section>
  );
}

/** Аккаунт есть, доступ ещё не выбран: пробный период или срок. */
function ChooseAccess({
  email,
  trialUsed,
  err,
  promo,
}: {
  email: string;
  trialUsed: boolean;
  err?: string;
  promo?: string;
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
      <div className="mt-8">
        <PromoForm result={promo} />
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
  searchParams: Promise<{ new?: string; err?: string; paid?: string; promo?: string }>;
}) {
  const sub = await currentSub();
  if (!sub) redirect("/start?mode=login");
  const { err, paid, promo } = await searchParams;
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
        <ChooseAccess email={sub.email} trialUsed={sub.trialUsed} err={err} promo={promo} />
      </>
    );

  const refLink = referralLink(sub);
  const refStats = await getStore().referralStats(sub.token);

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

      {promo === "ok" && (
        <div className="mt-6 rounded-2xl border border-good/40 bg-good/10 p-4 text-sm">
          <p className="font-medium text-good">Промокод применён</p>
          <p className="mt-1 text-fg/80">
            Дни прибавлены к вашему сроку. Доступ до {formatDate(sub.expiresAt)}
          </p>
        </div>
      )}

      {/*
        Пока подключение не подтверждено, первой идёт инструкция: человеку
        нужно именно это. После подтверждения наверх поднимается статус, а
        инструкция сворачивается — но остаётся раскрываемой, потому что
        подключать новое устройство приходится и потом.

        На узком экране это особенно заметно: в одну колонку статус оказывался
        под длинной инструкцией, и срок подписки было не видно без прокрутки.
      */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className={`space-y-6 ${sub.setupDone ? "order-2 lg:order-none" : ""}`}>
          {sub.setupDone ? (
            <details className="rounded-2xl border border-line bg-surface p-5">
              <summary className="cursor-pointer font-medium">
                Подключить ещё одно устройство
              </summary>
              <div className="mt-4">
                <SetupSection sub={sub} />
              </div>
              <form action="/api/account" method="post" className="mt-4">
                <input type="hidden" name="action" value="setup_again" />
                <button type="submit" className="text-sm text-muted hover:text-fg">
                  Показывать инструкцию сразу
                </button>
              </form>
            </details>
          ) : (
            <SetupSection sub={sub} showConfirm />
          )}

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

        <aside className={`space-y-6 ${sub.setupDone ? "order-1 lg:order-none" : ""}`}>
          <StatusCard sub={sub} />

          <PromoForm result={promo} />

          {refLink && <ReferralCard link={refLink} stats={refStats} />}

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
