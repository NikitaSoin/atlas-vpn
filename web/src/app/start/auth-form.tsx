"use client";

import { useState } from "react";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";

const input =
  "mt-1.5 w-full rounded-xl border border-line bg-ink px-4 py-2.5 outline-none placeholder:text-muted/60 focus:border-accent";

/**
 * Вход, регистрация и восстановление пароля одной формой.
 *
 * Галочек согласий нет с 14.09.2026: юридические документы убраны с сайта по
 * решению владельца, соглашаться стало не с чем.
 */
export default function AuthForm({
  mode,
  defaultEmail,
  trial = false,
}: {
  mode: "login" | "signup" | "reset";
  defaultEmail: string;
  /** Человек пришёл с кнопки «попробовать бесплатно»: включим пробный сразу
      после подтверждения почты, чтобы не спрашивать выбор второй раз. */
  trial?: boolean;
}) {
  const [sending, setSending] = useState(false);
  const action = mode === "login" ? "/api/login" : "/api/signup";
  const label =
    mode === "login" ? "Войти" : mode === "reset" ? "Прислать код" : "Получить код";

  return (
    <form
      action={action}
      method="POST"
      onSubmit={(e) => {
        if (sending) e.preventDefault();
        else setSending(true);
      }}
      className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6"
    >
      {mode !== "login" && <input type="hidden" name="mode" value={mode} />}
      {mode === "signup" && trial && <input type="hidden" name="intent" value="trial" />}

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

      <button
        type="submit"
        disabled={sending}
        className="w-full rounded-xl bg-primary px-4 py-3 font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
      >
        {sending ? "Секунду…" : label}
      </button>
    </form>
  );
}
