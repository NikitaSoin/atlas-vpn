import Link from "next/link";
import { adminConfigured, isAdmin } from "@/lib/admin";
import { getStore } from "@/lib/db";
import { formatDate, stateLabel, subState } from "@/lib/subscription";

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
            className="w-full rounded-xl bg-primary px-4 py-2.5 font-medium text-white transition hover:brightness-110"
          >
            Войти
          </button>
        </form>
      </main>
    );
  }

  const store = getStore();
  const [tickets, stats7, stats1, subs] = await Promise.all([
    store.listTickets(),
    store.eventStats(7),
    store.eventStats(1),
    store.listSubs(100),
  ]);
  const byState = new Map<string, number>();
  for (const s of subs) {
    const st = subState(s);
    byState.set(st, (byState.get(st) ?? 0) + 1);
  }
  const open = tickets.filter((t) => t.status === "open");
  const today = new Map(stats1.map((s) => [s.event, s.count]));

  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Панель</h1>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">
          Аналитика <span className="text-sm text-muted">· живые люди, боты отфильтрованы</span>
        </h2>
        {stats7.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Событий пока нет.</p>
        ) : (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1 font-normal">Событие</th>
                <th className="py-1 font-normal">Сегодня</th>
                <th className="py-1 font-normal">7 дней</th>
              </tr>
            </thead>
            <tbody>
              {stats7.map((s) => (
                <tr key={s.event} className="border-t border-line/60">
                  <td className="py-1.5">{s.event}</td>
                  <td className="py-1.5">{today.get(s.event) ?? 0}</td>
                  <td className="py-1.5">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">
          Подписки{" "}
          <span className="text-sm text-muted">
            · пробных: {byState.get("trial") ?? 0} · платных: {byState.get("active") ?? 0} ·
            истекших: {(byState.get("grace") ?? 0) + (byState.get("expired") ?? 0)}
          </span>
        </h2>
        {subs.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Пока никого.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th className="py-1 font-normal">Email</th>
                  <th className="py-1 font-normal">Статус</th>
                  <th className="py-1 font-normal">До</th>
                  <th className="py-1 font-normal">TG</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.token} className="border-t border-line/60">
                    <td className="py-1.5">{s.email}</td>
                    <td className="py-1.5">
                      {stateLabel[subState(s)].split(" — ")[0]}
                      {!s.panelToken && <span className="ml-1 text-amber-700">· без доступа в панели</span>}
                    </td>
                    <td className="py-1.5">{formatDate(s.expiresAt)}</td>
                    <td className="py-1.5">{s.telegramChatId ? "✓" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">
        Обращения{" "}
        <span className="text-muted">
          · открытых: {open.length} из {tickets.length}
        </span>
      </h2>

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
                      ? "bg-accent-soft text-accent-ink"
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
