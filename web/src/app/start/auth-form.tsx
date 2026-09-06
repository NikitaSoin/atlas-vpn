"use client";

import Link from "next/link";
import { useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

const input =
  "mt-1.5 w-full rounded-xl border border-line bg-ink px-4 py-2.5 outline-none placeholder:text-muted/60 focus:border-accent";

/**
 * Вход, регистрация и восстановление пароля одной формой.
 *
 * Галочки согласий показываются только при регистрации и не отмечены заранее:
 * с 01.09.2025 ст. 16 ЗоЗПП запрещает автоматические механики согласия. Всё,
 * что проверяется здесь, проверяется и на сервере — браузеру доверять нельзя.
 */
export default function AuthForm({
  mode,
  defaultEmail,
}: {
  mode: "login" | "signup" | "reset";
  defaultEmail: string;
}) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [sending, setSending] = useState(false);
  const needConsent = mode === "signup";
  const ready = !needConsent || (terms && privacy);
  const action = mode === "login" ? "/api/login" : "/api/signup";
  const label =
    mode === "login" ? "Войти" : mode === "reset" ? "Прислать код" : "Получить код";

  return (
    <form
      action={action}
      method="POST"
      onSubmit={(e) => {
        if (sending || !ready) e.preventDefault();
        else setSending(true);
      }}
      className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6"
    >
      {mode !== "login" && <input type="hidden" name="mode" value={mode} />}

      <label className="block">
        <span className="text-sm text-muted">Почта</span>
        <input
          type="email"
          name="email"
          required
          autoFocus={!defaultEmail}
          defaultValue={defaultEmail}
          autoComplete="email"
          placeholder="you@example.com"
          className={input}
        />
      </label>

      <label className="block">
        <span className="text-sm text-muted">
          {mode === "reset" ? "Новый пароль" : "Пароль"}
        </span>
        <input
          type="password"
          name="password"
          required
          minLength={mode === "login" ? undefined : MIN_PASSWORD_LENGTH}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder={mode === "login" ? "" : `не короче ${MIN_PASSWORD_LENGTH} символов`}
          className={input}
        />
      </label>

      {mode !== "login" && (
        <label className="block">
          <span className="text-sm text-muted">Повторите пароль</span>
          <input
            type="password"
            name="password2"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            className={input}
          />
        </label>
      )}

      {needConsent && (
        <div className="space-y-3 border-t border-line/70 pt-4">
          <label className="flex items-start gap-2.5 text-sm text-muted">
            <input
              type="checkbox"
              name="acceptTerms"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span>
              Я принимаю{" "}
              <Link href="/legal/offer" target="_blank" className="text-accent-ink hover:underline">
                публичную оферту
              </Link>{" "}
              и{" "}
              <Link href="/legal/rules" target="_blank" className="text-accent-ink hover:underline">
                правила использования
              </Link>
              , в том числе обязуюсь не использовать сервис для действий,
              запрещённых законом.
            </span>
          </label>

          <label className="flex items-start gap-2.5 text-sm text-muted">
            <input
              type="checkbox"
              name="acceptPrivacy"
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span>
              Я согласен на обработку персональных данных на условиях{" "}
              <Link href="/legal/privacy" target="_blank" className="text-accent-ink hover:underline">
                политики обработки персональных данных
              </Link>{" "}
              и уведомлён, что часть данных передаётся за пределы России, потому
              что сервер находится за рубежом.
            </span>
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={!ready || sending}
        className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
      >
        {sending ? "Секунду…" : label}
      </button>
      {needConsent && !ready && (
        <p className="text-center text-xs text-muted">
          Отметьте оба пункта, чтобы продолжить.
        </p>
      )}
    </form>
  );
}
