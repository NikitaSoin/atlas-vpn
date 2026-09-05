import Link from "next/link";
import { redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import { plans } from "@/lib/plans";
import { currentSub } from "@/lib/session";
import { mailConfigured } from "@/lib/mail";
import { telegramLinkUrl } from "@/lib/telegram";
import { formatDate, stateLabel, subState, timeLeft } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const inputCls =
  "mt-1.5 w-full rounded-xl border border-line bg-ink px-4 py-2.5 outline-none placeholder:text-muted/60 focus:border-accent";
const btnPrimary =
  "rounded-xl bg-primary px-4 py-2.5 font-medium text-white transition hover:brightness-110";
const btnGhost = "rounded-xl border border-line px-4 py-2.5 text-sm transition hover:border-accent";

/**
 * Кабинет: кто вы (email) и что с доступом (статус, сколько осталось).
 * Вход — по cookie после триала/оплаты или по ссылке из письма.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{
    login?: string;
    err?: string;
    sent?: string;
    exists?: string;
    email?: string;
  }>;
}) {
  const sp = await searchParams;
  // Ссылка из письма ведёт сюда с ?login= — гасим токен и ставим cookie.
  if (sp.login) redirect(`/api/account?login=${encodeURIComponent(sp.login)}`);

  const sub = await currentSub();

  if (!sub) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Кабинет</h1>
        {sp.exists && (
          <div className="mt-4 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
            На этот email уже есть подписка, пробный период выдаётся один раз.
            Войдите, чтобы увидеть, сколько осталось, или продлите доступ.
          </div>
        )}
        <p className="mt-2 text-muted">
          Введите email, с которым подключались, — пришлём ссылку для входа.
        </p>
        <form
          action="/api/account"
          method="POST"
          className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6"
        >
          <input type="hidden" name="action" value="login" />
          {sp.sent && (
            <p className="text-sm text-good">
              Если такой email у нас есть, письмо уже в пути. Ссылка действует 30 минут.
            </p>
          )}
          {sp.err === "email" && <p className="text-sm text-bad">Проверьте email.</p>}
          {sp.err === "link" && (
            <p className="text-sm text-bad">
              Ссылка устарела или уже использована — запросите новую.
            </p>
          )}
          {sp.err === "nomail" && (
            <p className="text-sm text-bad">
              Вход по почте пока не подключён. Напишите в{" "}
              <a href={brand.supportTelegram} className="underline" target="_blank" rel="noreferrer">
                поддержку
              </a>
              , пришлём вашу ссылку вручную.
            </p>
          )}
          <label className="block">
            <span className="text-sm text-muted">Email</span>
            <input
              type="email"
              name="email"
              required
              defaultValue={sp.email ?? ""}
              placeholder="you@example.com"
              className={inputCls}
            />
          </label>
          <button type="submit" className={`w-full ${btnPrimary}`}>
            Прислать ссылку для входа
          </button>
          {!mailConfigured() && (
            <p className="text-xs text-muted">
              Почтовые уведомления ещё настраиваются — если письмо не придёт,
              напишите в поддержку.
            </p>
          )}
        </form>
        <p className="mt-4 text-center text-sm text-muted">
          Ещё не пробовали?{" "}
          <Link href="/start" className="text-accent-ink hover:underline">
            Включить пробный доступ
          </Link>
        </p>
      </main>
    );
  }

  const state = subState(sub);
  const left = timeLeft(sub);
  const active = state === "trial" || state === "active";
  const tone =
    state === "active" || state === "trial"
      ? "border-good/40 bg-good/10 text-good"
      : state === "grace"
        ? "border-amber-500/50 bg-amber-500/10 text-amber-700"
        : "border-bad/40 bg-bad/10 text-bad";
  const renewPlan = plans.find((p) => p.popular) ?? plans[0];
  const renewHref = `/checkout?plan=${renewPlan.id}&email=${encodeURIComponent(sub.email)}`;
  const tgLink = telegramLinkUrl(sub.token);

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Кабинет</h1>
          <p className="mt-1 text-muted">{sub.email}</p>
        </div>
        <form action="/api/account" method="POST">
          <input type="hidden" name="action" value="logout" />
          <button className="text-sm text-muted hover:text-fg">Выйти</button>
        </form>
      </div>

      <section className={`mt-6 rounded-2xl border p-5 ${tone}`}>
        <p className="font-medium">{stateLabel[state]}</p>
        {active ? (
          <p className="mt-1 text-sm text-fg/80">
            Осталось{" "}
            <span className="font-semibold">
              {left.days > 1 ? `${left.days} дн.` : `${left.hours} ч.`}
            </span>{" "}
            — до {formatDate(sub.expiresAt)}
            {sub.isTrial ? " · пробный период" : sub.autoRenew ? " · автопродление включено" : ""}.
          </p>
        ) : (
          <p className="mt-1 text-sm text-fg/80">
            Закончилась {formatDate(sub.expiresAt)}. После оплаты доступ включится сам,
            ссылка и настройки прежние.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={renewHref} className={btnPrimary}>
            {state === "trial" ? "Продолжить после пробного" : active ? "Продлить" : "Возобновить"}
          </Link>
          <Link href={`/setup/${sub.token}`} className={btnGhost}>
            Настроить устройство
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">Напоминания</h2>
        <p className="mt-1.5 text-sm text-muted">
          Напомним за сутки до окончания доступа — на почту
          {tgLink ? " и в Telegram" : ""}.
        </p>
        {tgLink && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {sub.telegramChatId ? (
              <>
                <span className="text-sm text-good">Telegram подключён</span>
                <form action="/api/account" method="POST">
                  <input type="hidden" name="action" value="unlink_telegram" />
                  <button className="text-sm text-muted hover:text-fg">Отключить</button>
                </form>
              </>
            ) : (
              <a href={tgLink} target="_blank" rel="noreferrer" className={btnGhost}>
                Уведомления в Telegram
              </a>
            )}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">Что-то не работает?</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/support" className={btnGhost}>
            Написать в поддержку
          </Link>
          <a href={brand.supportTelegram} target="_blank" rel="noreferrer" className={btnGhost}>
            Telegram
          </a>
        </div>
      </section>
    </main>
  );
}
