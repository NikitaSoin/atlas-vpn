import Link from "next/link";
import { brand } from "@/lib/brand";
import { getStore } from "@/lib/db";
import { telegramLinkUrl } from "@/lib/telegram";
import { subState } from "@/lib/subscription";
import SetupSection from "../setup-section";
import StatusCard from "../../account/status-card";

const btnGhost =
  "rounded-xl border border-line px-4 py-2.5 text-sm transition hover:border-accent";

/**
 * Персональная страница из письма: та же инструкция и то же состояние доступа,
 * что и в кабинете, но открывается по ссылке — без входа.
 */
export default async function SetupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sub = await getStore().findSubByToken(token);

  if (!sub) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Ссылка не найдена</h1>
        <p className="mt-2 text-muted">
          Войдите в кабинет — там находится актуальная инструкция и ваша подписка.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/account"
            className="rounded-xl bg-primary px-5 py-2.5 font-medium text-white transition hover:brightness-110"
          >
            Войти в кабинет →
          </Link>
          <Link href="/support" className={btnGhost}>
            Связаться с поддержкой
          </Link>
        </div>
      </main>
    );
  }

  const state = subState(sub);
  const tgLink = sub.telegramChatId ? null : telegramLinkUrl(sub.token);

  return (
    <main className="mx-auto max-w-5xl px-5 py-16">
      <Link href="/account" className="text-sm text-muted hover:text-fg">
        ← В кабинет
      </Link>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Настройте ваше устройство
      </h1>
      <p className="mt-2 text-muted">
        Эта персональная страница доступна по ссылке из письма.
      </p>

      {state === "none" ? (
        <p className="mt-8 rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
          Доступ ещё не выбран.{" "}
          <Link href="/account" className="text-accent-ink hover:underline">
            Включите пробный период или выберите срок
          </Link>
          .
        </p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <SetupSection sub={sub} />
          <aside className="space-y-6">
            <StatusCard sub={sub} />
            {tgLink && (
              <section className="rounded-2xl border border-line bg-surface p-5">
                <h3 className="font-medium">Напомнить об окончании доступа</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Напишем за сутки до конца, чтобы доступ не отключился неожиданно.
                </p>
                <a
                  href={tgLink}
                  target="_blank"
                  rel="noreferrer"
                  className={`mt-4 inline-block ${btnGhost}`}
                >
                  Уведомления в Telegram
                </a>
              </section>
            )}
            <section className="rounded-2xl border border-line bg-surface p-5">
              <h3 className="font-medium">Что-то не получается?</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/support" className={btnGhost}>
                  Написать в поддержку
                </Link>
                <a
                  href={brand.supportTelegram}
                  target="_blank"
                  rel="noreferrer"
                  className={btnGhost}
                >
                  Telegram
                </a>
              </div>
            </section>
          </aside>
        </div>
      )}
    </main>
  );
}
