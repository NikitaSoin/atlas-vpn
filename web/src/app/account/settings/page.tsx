import Link from "next/link";
import { redirect } from "next/navigation";
import { plans, TRIAL_DAYS } from "@/lib/plans";
import { currentSub } from "@/lib/session";
import { telegramLinkUrl } from "@/lib/telegram";
import { formatDate, subState } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const input =
  "w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-accent";
const card = "rounded-2xl border border-line bg-surface p-5";
const btnGhost =
  "rounded-xl border border-line px-4 py-2.5 text-sm transition hover:border-accent";
const row = "flex items-center justify-between gap-3 border-t border-line/70 py-2.5 text-sm";

/**
 * Всё, что настраивается редко: срок, напоминания, пароль, второй шаг входа
 * и удаление аккаунта. Кабинет от этого остаётся коротким.
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; pass?: string; "2fa"?: string; tg?: string }>;
}) {
  const sub = await currentSub();
  if (!sub) redirect("/start?mode=login");
  const { err, pass, "2fa": twoFactorResult } = await searchParams;
  const state = subState(sub);
  const tgLink = telegramLinkUrl(sub.token);
  const planTitle =
    state === "none"
      ? "Не выбран"
      : sub.isTrial
        ? `Пробный, ${TRIAL_DAYS} дня`
        : (plans.find((p) => p.id === sub.planId)?.title ?? "Подписка");

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link href="/account" className="text-sm text-muted hover:text-fg">
        ← В кабинет
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Аккаунт и уведомления
      </h1>
      <p className="mt-1 text-muted">{sub.email}</p>

      <section className={`mt-8 ${card}`}>
        <h2 className="font-medium">Ваш доступ</h2>
        <div className="mt-3">
          <div className={row}>
            <span className="text-muted">Тариф</span>
            <b className="font-medium">{planTitle}</b>
          </div>
          {state !== "none" && (
            <div className={row}>
              <span className="text-muted">Действует до</span>
              <b className="font-medium">{formatDate(sub.expiresAt)}</b>
            </div>
          )}
          <div className={row}>
            <span className="text-muted">Устройства</span>
            <b className="font-medium">Все ваши</b>
          </div>
          <div className={row}>
            <span className="text-muted">Автопродление</span>
            <b className="font-medium">{sub.autoRenew ? "Включено" : "Выключено"}</b>
          </div>
        </div>
        <Link href="/plans" className={`mt-4 inline-block ${btnGhost}`}>
          Выбрать срок →
        </Link>
      </section>

      <section className={`mt-6 ${card}`}>
        <h2 className="font-medium">Напоминания</h2>
        <p className="mt-1.5 text-sm text-muted">
          За сутки до конца и при окончании доступа.
        </p>
        <div className="mt-3">
          <div className={row}>
            <span className="text-muted">На почту</span>
            <b className="font-medium">Подключены</b>
          </div>
          <div className={row}>
            <span className="text-muted">В Telegram</span>
            {sub.telegramChatId ? (
              <form action="/api/account" method="POST">
                <input type="hidden" name="action" value="unlink_telegram" />
                <button className="text-sm text-muted hover:text-fg">Отключить</button>
              </form>
            ) : tgLink ? (
              <a
                href={tgLink}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent-ink hover:underline"
              >
                Подключить
              </a>
            ) : (
              <span className="text-sm text-muted">недоступно</span>
            )}
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {sub.telegramChatId
            ? "Telegram подключён. Бот показывает срок по /status, /stop отключает уведомления."
            : "Telegram необязателен для работы сервиса."}
        </p>
      </section>

      <section className={`mt-6 ${card}`}>
        <h2 className="font-medium">Пароль и безопасность</h2>
        {pass && <p className="mt-2 text-sm text-good">Пароль изменён.</p>}
        {err === "oldpass" && (
          <p className="mt-2 text-sm text-bad">Текущий пароль не подошёл.</p>
        )}
        {err === "newpass" && (
          <p className="mt-2 text-sm text-bad">
            Новый пароль слишком короткий или слишком простой.
          </p>
        )}
        {err === "match" && <p className="mt-2 text-sm text-bad">Пароли не совпали.</p>}
        <p className="mt-1.5 text-sm text-muted">
          {sub.passwordHash
            ? "Меняйте, если считаете, что его кто-то узнал."
            : "У аккаунта ещё нет пароля — задайте, чтобы входить без кода из письма."}
        </p>
        <form action="/api/account" method="POST" className="mt-4 grid gap-2 sm:grid-cols-3">
          <input type="hidden" name="action" value="change_password" />
          {sub.passwordHash && (
            <input
              type="password"
              name="current"
              required
              autoComplete="current-password"
              placeholder="Текущий пароль"
              className={input}
            />
          )}
          <input
            type="password"
            name="next"
            required
            autoComplete="new-password"
            placeholder="Новый пароль"
            className={input}
          />
          <input
            type="password"
            name="next2"
            required
            autoComplete="new-password"
            placeholder="Ещё раз"
            className={input}
          />
          <button
            type="submit"
            className={`${btnGhost} sm:col-span-3 sm:justify-self-start`}
          >
            Сохранить пароль
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-start justify-between gap-3 border-t border-line/70 pt-4">
          <div>
            <b className="font-medium">Вход в два шага</b>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Код на почту после пароля. Даже зная пароль, войти без доступа к
              вашей почте не получится.
            </p>
            {twoFactorResult === "on" && (
              <p className="mt-2 text-sm text-good">Вход в два шага включён.</p>
            )}
            {twoFactorResult === "off" && (
              <p className="mt-2 text-sm text-muted">Вход в два шага выключен.</p>
            )}
            {err === "nopass" && (
              <p className="mt-2 text-sm text-bad">
                Сначала задайте пароль — без него второй шаг не имеет смысла.
              </p>
            )}
          </div>
          <form action="/api/account" method="POST">
            <input type="hidden" name="action" value="two_factor" />
            {!sub.twoFactor && <input type="hidden" name="enable" value="on" />}
            <button
              type="submit"
              disabled={!sub.passwordHash && !sub.twoFactor}
              className={`rounded-xl px-4 py-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                sub.twoFactor
                  ? "border border-line hover:border-accent"
                  : "bg-primary font-medium text-white hover:brightness-110"
              }`}
            >
              {sub.twoFactor ? "Выключить" : "Включить"}
            </button>
          </form>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line/60 bg-ink p-5">
        <h2 className="font-medium">Удаление аккаунта</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Удалятся аккаунт, доступ и переписка с поддержкой. Оставшийся срок
          доступа сгорит, отменить удаление нельзя. Сведения об оплатах
          сохранятся в обезличенном виде — этого требует закон о бухгалтерском
          учёте.
        </p>
        {err === "confirm" && (
          <p className="mt-2 text-sm text-bad">
            Чтобы удалить аккаунт, введите слово «удалить».
          </p>
        )}
        <form action="/api/account" method="POST" className="mt-4 flex flex-wrap gap-2">
          <input type="hidden" name="action" value="delete_account" />
          <input
            type="text"
            name="confirm"
            required
            placeholder="Введите «удалить»"
            className={`min-w-48 flex-1 ${input} bg-surface`}
          />
          <button
            type="submit"
            className="rounded-xl border border-bad/50 px-4 py-2.5 text-sm text-bad transition hover:bg-bad/10"
          >
            Удалить навсегда
          </button>
        </form>
      </section>

      <form action="/api/account" method="POST" className="mt-8">
        <input type="hidden" name="action" value="logout" />
        <button className="text-sm text-muted hover:text-fg">Выйти из аккаунта</button>
      </form>
    </main>
  );
}
