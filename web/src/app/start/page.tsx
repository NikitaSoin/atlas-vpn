import Link from "next/link";
import { redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import { TRIAL_DAYS, TRIAL_TRAFFIC_GB } from "@/lib/plans";
import { currentSub } from "@/lib/session";

/** Регистрация: email → код на почту. Новому аккаунту — пробный доступ. */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; email?: string; login?: string }>;
}) {
  if (await currentSub()) redirect("/account");
  const { err, email, login } = await searchParams;
  const isLogin = login === "1";

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← На главную
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        {isLogin ? "Вход в кабинет" : `${TRIAL_DAYS} дня бесплатно`}
      </h1>
      <p className="mt-2 text-muted">
        {isLogin
          ? "Введите email, с которым регистрировались, — пришлём код для входа."
          : "Без карты и без обязательств. Укажите email — пришлём код подтверждения, и через минуту VPN будет работать."}
      </p>

      <form
        action="/api/signup"
        method="POST"
        className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6"
      >
        {err === "email" && <p className="text-sm text-bad">Похоже, email с опечаткой — проверьте.</p>}
        {err === "send" && (
          <p className="text-sm text-bad">
            Не удалось отправить письмо. Попробуйте ещё раз через минуту, а если
            повторится — напишите в{" "}
            <a href={brand.supportTelegram} className="underline" target="_blank" rel="noreferrer">
              поддержку
            </a>
            .
          </p>
        )}
        {err === "nomail" && (
          <p className="text-sm text-bad">
            Регистрация временно недоступна. Напишите в{" "}
            <a href={brand.supportTelegram} className="underline" target="_blank" rel="noreferrer">
              поддержку
            </a>
            .
          </p>
        )}
        <label className="block">
          <span className="text-sm text-muted">Email</span>
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
        {!isLogin && (
          <p className="text-xs text-muted">
            В пробном периоде — {TRIAL_TRAFFIC_GB} ГБ трафика, после оплаты без лимита.
            Один пробный период на аккаунт.
          </p>
        )}
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {isLogin ? (
          <>
            Ещё нет аккаунта?{" "}
            <Link href="/start" className="text-accent-ink hover:underline">
              Попробовать бесплатно
            </Link>
          </>
        ) : (
          <>
            Уже есть аккаунт?{" "}
            <Link href="/start?login=1" className="text-accent-ink hover:underline">
              Войти
            </Link>
          </>
        )}
      </p>
    </main>
  );
}
