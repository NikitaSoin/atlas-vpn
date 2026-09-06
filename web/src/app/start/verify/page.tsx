import Link from "next/link";
import { redirect } from "next/navigation";

/** Ввод кода из письма. */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; err?: string; mode?: string; trial?: string }>;
}) {
  const { email, err, mode, trial } = await searchParams;
  if (!email) redirect("/start");

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Link
        href={`/start?mode=${mode === "2fa" ? "login" : (mode ?? "signup")}&email=${encodeURIComponent(email)}${trial === "1" ? "&trial=1" : ""}`}
        className="text-sm text-muted hover:text-fg"
      >
        ← {mode === "2fa" ? "Отменить вход" : "Другой email"}
      </Link>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">
        {mode === "2fa" ? "Подтвердите вход" : "Проверьте почту"}
      </h1>
      <p className="mt-2 text-muted">
        {mode === "2fa"
          ? "Пароль верный. Остался второй шаг: введите шесть цифр из письма для "
          : "Введите шесть цифр из письма для "}
        <span className="text-fg">{email}</span>.
      </p>

      <form
        action="/api/verify"
        method="POST"
        className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6"
      >
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="mode" value={mode ?? "signup"} />
        {trial === "1" && <input type="hidden" name="intent" value="trial" />}
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

      <p className="mt-4 text-center text-sm text-muted">
        Если письма нет, проверьте папку «Спам».{" "}
        <Link
          href={`/start?mode=${mode === "2fa" ? "login" : (mode ?? "signup")}&email=${encodeURIComponent(email)}${trial === "1" ? "&trial=1" : ""}`}
          className="text-accent-ink hover:underline"
        >
          {mode === "2fa" ? "Войти заново" : "Запросить код заново"}
        </Link>
      </p>
    </main>
  );
}
