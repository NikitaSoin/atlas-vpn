import Link from "next/link";
import { redirect } from "next/navigation";
import { brand } from "@/lib/brand";
import { TRIAL_DAYS, TRIAL_TRAFFIC_GB } from "@/lib/plans";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";
import { currentSub } from "@/lib/session";
import AuthForm from "./auth-form";

type Mode = "login" | "signup" | "reset";

const TITLES: Record<Mode, string> = {
  login: "Вход",
  signup: "Регистрация",
  reset: "Восстановление пароля",
};

const HINTS: Record<Mode, string> = {
  login: "Введите почту и пароль, которые указали при регистрации.",
  signup:
    "Придумайте пароль и подтвердите почту кодом из письма. После этого можно включить пробный период.",
  reset: "Пришлём код на почту. Введёте его — и зададите новый пароль.",
};

/** Вход, регистрация и восстановление пароля на одной странице. */
export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; err?: string; email?: string }>;
}) {
  if (await currentSub()) redirect("/account");
  const sp = await searchParams;
  // По умолчанию показываем регистрацию: на /start приводит кнопка с лендинга,
  // а вход — по явной ссылке из шапки.
  const mode: Mode =
    sp.mode === "login" ? "login" : sp.mode === "reset" ? "reset" : "signup";

  const errors: Record<string, string> = {
    email: "Похоже, почта с опечаткой — проверьте.",
    password: `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов и не совсем простым.`,
    match: "Пароли не совпали.",
    consent: "Чтобы продолжить, нужно принять оферту, правила и согласиться на обработку данных.",
    bad: "Почта или пароль не подошли.",
    exists: "На эту почту уже есть аккаунт — войдите или восстановите пароль.",
    send: "Не удалось отправить письмо. Попробуйте ещё раз через минуту.",
  };

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← На главную
      </Link>

      <div className="mt-6 flex gap-2">
        {(["login", "signup"] as const).map((m) => (
          <Link
            key={m}
            href={`/start?mode=${m}`}
            className={`rounded-xl px-4 py-2 text-sm transition ${
              mode === m
                ? "bg-accent-soft text-accent-ink"
                : "border border-line text-muted hover:text-fg"
            }`}
          >
            {TITLES[m]}
          </Link>
        ))}
      </div>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight">{TITLES[mode]}</h1>
      <p className="mt-2 text-muted">{HINTS[mode]}</p>

      {sp.err && errors[sp.err] && (
        <p className="mt-4 rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
          {errors[sp.err]}
        </p>
      )}
      {sp.err === "nomail" && (
        <p className="mt-4 rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm text-bad">
          Регистрация временно недоступна. Напишите в{" "}
          <a href={brand.supportTelegram} className="underline" target="_blank" rel="noreferrer">
            поддержку
          </a>
          .
        </p>
      )}

      <AuthForm mode={mode} defaultEmail={sp.email ?? ""} />

      <p className="mt-4 text-center text-sm text-muted">
        {mode === "login" ? (
          <>
            Забыли пароль?{" "}
            <Link href="/start?mode=reset" className="text-accent-ink hover:underline">
              Восстановить
            </Link>
          </>
        ) : (
          <>
            Уже есть аккаунт?{" "}
            <Link href="/start?mode=login" className="text-accent-ink hover:underline">
              Войти
            </Link>
          </>
        )}
      </p>

      {mode === "signup" && (
        <p className="mt-3 text-center text-sm text-muted">
          Новым аккаунтам доступен пробный период: {TRIAL_DAYS} дня и{" "}
          {TRIAL_TRAFFIC_GB} ГБ трафика бесплатно, без карты.
        </p>
      )}
    </main>
  );
}
