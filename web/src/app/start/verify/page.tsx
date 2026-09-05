import Link from "next/link";
import { redirect } from "next/navigation";

/** Ввод кода из письма. */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; err?: string }>;
}) {
  const { email, err } = await searchParams;
  if (!email) redirect("/start");

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Link href={`/start?email=${encodeURIComponent(email)}`} className="text-sm text-muted hover:text-fg">
        ← Другой email
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Код из письма</h1>
      <p className="mt-2 text-muted">
        Отправили шесть цифр на <span className="text-fg">{email}</span>. Если письма нет
        минуту — загляните в «Спам».
      </p>

      <form
        action="/api/verify"
        method="POST"
        className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6"
      >
        <input type="hidden" name="email" value={email} />
        {err === "code" && (
          <p className="text-sm text-bad">Код не подошёл или устарел. Запросите новый.</p>
        )}
        {err === "server" && (
          <p className="text-sm text-bad">
            Код верный, но не удалось создать доступ: временно недоступен VPN-сервер.
            Попробуйте через пару минут — запросите новый код.
          </p>
        )}
        <label className="block">
          <span className="text-sm text-muted">Код</span>
          <input
            type="text"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            required
            autoFocus
            placeholder="123456"
            className="mt-1.5 w-full rounded-xl border border-line bg-ink px-4 py-2.5 text-center text-2xl tracking-[0.4em] outline-none placeholder:text-muted/40 focus:border-accent"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:brightness-110"
        >
          Подтвердить
        </button>
      </form>

      <form action="/api/signup" method="POST" className="mt-4 text-center text-sm text-muted">
        <input type="hidden" name="email" value={email} />
        Не пришло?{" "}
        <button type="submit" className="text-accent-ink hover:underline">
          Отправить ещё раз
        </button>
      </form>
    </main>
  );
}
