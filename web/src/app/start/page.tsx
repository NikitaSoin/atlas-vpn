import Link from "next/link";
import { redirect } from "next/navigation";
import { TRIAL_DAYS, TRIAL_TRAFFIC_GB } from "@/lib/plans";
import { currentSub } from "@/lib/session";

/** Старт пробного периода: только email, без карты. */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; email?: string }>;
}) {
  // Уже есть подписка в этом браузере — сразу в кабинет.
  if (await currentSub()) redirect("/account");
  const { err, email } = await searchParams;

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← На главную
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        {TRIAL_DAYS} дня бесплатно
      </h1>
      <p className="mt-2 text-muted">
        Без карты и без обязательств. Введите email — и через минуту VPN
        будет работать. Понравится — продлите, не понравится — ничего не
        спишется.
      </p>

      <form
        action="/api/trial"
        method="POST"
        className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6"
      >
        {err === "email" && (
          <p className="text-sm text-bad">Похоже, email с опечаткой — проверьте.</p>
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
          Включить пробный доступ
        </button>
        <p className="text-xs text-muted">
          На email придёт личная ссылка для настройки. В пробном периоде —
          {" "}{TRIAL_TRAFFIC_GB} ГБ трафика, после оплаты без лимита.
        </p>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        Уже пользовались?{" "}
        <Link href="/account" className="text-accent-ink hover:underline">
          Войти в кабинет
        </Link>
      </p>
    </main>
  );
}
