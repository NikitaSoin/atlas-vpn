import Link from "next/link";
import { redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import { plans } from "@/lib/plans";
import { currentSub } from "@/lib/session";
import { telegramLinkUrl } from "@/lib/telegram";
import { formatDate, stateLabel, subState, timeLeft } from "@/lib/subscription";
import SetupSection from "../setup/setup-section";

export const dynamic = "force-dynamic";

const btnPrimary =
  "rounded-xl bg-primary px-4 py-2.5 font-medium text-white transition hover:brightness-110";
const btnGhost = "rounded-xl border border-line px-4 py-2.5 text-sm transition hover:border-accent";

/**
 * Кабинет: кто вы (email), что с доступом (статус, сколько осталось) и как
 * подключить устройство. Всё, что нужно пользователю, — на одной странице.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const sub = await currentSub();
  if (!sub) redirect("/start?login=1");
  const { new: isNew } = await searchParams;

  const state = subState(sub);
  const left = timeLeft(sub);
  const active = state === "trial" || state === "active";
  const tone = active
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
          <h1 className="text-2xl font-semibold tracking-tight">
            {isNew ? "Аккаунт создан" : "Кабинет"}
          </h1>
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
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          {isNew ? "Осталось два шага" : "Подключить устройство"}
        </h2>
        <p className="mt-2 text-muted">
          Установите приложение и добавьте в него подписку — вручную ничего
          настраивать не нужно. Дальше внутри приложения включите переключатель.
          Одна и та же ссылка работает на всех ваших устройствах.
        </p>
        <div className="mt-6">
          <SetupSection sub={sub} />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">Напоминания</h2>
        <p className="mt-1.5 text-sm text-muted">
          Напомним за сутки до окончания доступа — на почту{tgLink ? " и в Telegram" : ""}.
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
