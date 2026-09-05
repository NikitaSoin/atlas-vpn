import Link from "next/link";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const { err } = await searchParams;

  if (!adminConfigured()) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <h1 className="text-2xl font-semibold">Админка не настроена</h1>
        <p className="mt-2 text-muted">
          Задайте переменную окружения <code>ADMIN_CODE</code> в панели
          хостинга.
        </p>
      </main>
    );
  }

  if (!(await isAdmin())) {
    return (
      <main className="mx-auto max-w-sm px-5 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">Вход</h1>
        {err && (
          <p className="mt-2 text-sm text-red-400">Неверный код, попробуйте ещё раз.</p>
        )}
        <form
          action="/api/admin"
          method="POST"
          className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6"
        >
          <input type="hidden" name="action" value="login" />
          <input
            type="password"
            name="code"
            required
            placeholder="Код доступа"
            className="w-full rounded-xl border border-line bg-ink px-4 py-2.5 outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="w-full rounded-xl bg-accent px-4 py-2.5 font-medium text-white transition hover:brightness-110"
          >
            Войти
          </button>
        </form>
      </main>
    );
  }

  const tickets = await getStore().listTickets();
  const open = tickets.filter((t) => t.status === "open");

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Обращения{" "}
        <span className="text-muted">
          · открытых: {open.length} из {tickets.length}
        </span>
      </h1>

      <div className="mt-8 space-y-2">
        {tickets.length === 0 && (
          <p className="text-muted">Пока пусто — ни одного обращения.</p>
        )}
        {tickets.map((t) => {
          const last = t.messages[t.messages.length - 1];
          return (
            <Link
              key={t.id}
              href={`/admin/t/${t.id}`}
              className={`block rounded-2xl border p-4 transition hover:border-accent ${
                t.status === "open" ? "border-line bg-surface" : "border-line/50 bg-ink"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">
                  #{t.id} · {t.email}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs ${
                    t.status === "open"
                      ? "bg-accent-soft text-accent"
                      : "bg-surface-2 text-muted"
                  }`}
                >
                  {t.status === "open" ? "открыто" : "закрыто"}
                </span>
              </div>
              {last && (
                <p className="mt-1.5 truncate text-sm text-muted">
                  {last.author === "admin" ? "Вы: " : ""}
                  {last.body}
                </p>
              )}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
