import Link from "next/link";
import { redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import { TRIAL_DAYS, TRIAL_TRAFFIC_GB } from "@/lib/plans";
import { currentSub } from "@/lib/session";

/**
 * Вход и регистрация — одна страница и один сценарий: почта → код → кабинет.
 * Отдельной регистрации нет намеренно: если аккаунта нет, он создаётся сам,
 * пароль не нужен. Что делать дальше — пробный период или тариф — человек
 * выбирает уже в кабинете.
 */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; email?: string }>;
}) {
  if (await currentSub()) redirect("/account");
  const { err, email } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← На главную
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        Вход и регистрация
      </h1>
      <p className="mt-2 text-muted">
        Введите почту — пришлём код. Если аккаунта ещё нет, создадим его на этой
        же почте. Пароль придумывать не нужно.
      </p>

      <form
        action="/api/signup"
        method="POST"
        className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6"
      >
        {err === "email" && <p className="text-sm text-bad">Похоже, почта с опечаткой — проверьте.</p>}
        {err === "send" && (
          <p className="text-sm text-bad">Не удалось отправить письмо. Попробуйте ещё раз через минуту.</p>
        )}
        {err === "nomail" && (
          <p className="text-sm text-bad">
            Вход временно недоступен. Напишите в{" "}
            <a href={brand.supportTelegram} className="underline" target="_blank" rel="noreferrer">
              поддержку
            </a>
            .
          </p>
        )}
        <label className="block">
          <span className="text-sm text-muted">Почта</span>
          <input
            type="email"
            name="email"
            required
            autoFocus
            defaultValue={email ?? ""}
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-xl border border-line bg-ink px-4 py-2.5 outline-none placeholder:text-muted/60 focus:border-accent"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:brightness-110"
        >
          Получить код
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Новым аккаунтам доступен пробный период: {TRIAL_DAYS} дня и{" "}
        {TRIAL_TRAFFIC_GB} ГБ трафика бесплатно, без карты.
      </p>
    </main>
  );
}
