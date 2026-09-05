import Link from "next/link";
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { getStore } from "@/lib/db";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await isAdmin())) {
    return (
      <main className="mx-auto max-w-md px-5 py-16">
        <p>
          Нет доступа — <Link href="/admin" className="text-accent">войдите</Link>.
        </p>
      </main>
    );
  }

  const { id } = await params;
  const ticket = await getStore().getTicketById(Number(id));
  if (!ticket) notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link href="/admin" className="text-sm text-muted hover:text-fg">
        ← Все обращения
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">#{ticket.id}</h1>
        <span className="text-muted">{ticket.email}</span>
        <form action="/api/admin" method="POST">
          <input type="hidden" name="id" value={ticket.id} />
          <input
            type="hidden"
            name="action"
            value={ticket.status === "open" ? "close" : "reopen"}
          />
          <button
            type="submit"
            className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-fg"
          >
            {ticket.status === "open" ? "Закрыть" : "Открыть заново"}
          </button>
        </form>
      </div>
      <p className="mt-1 text-sm text-muted">
        Ссылка пользователя: /support/t/{ticket.token}
      </p>

      <div className="mt-8 space-y-3">
        {ticket.messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl border p-4 ${
              m.author === "admin"
                ? "border-accent/40 bg-accent-soft/30"
                : "border-line bg-surface"
            }`}
          >
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium">
                {m.author === "admin" ? "Поддержка (вы)" : "Пользователь"}
              </span>
              <span className="text-xs text-muted">{fmt(m.createdAt)}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {m.body}
            </p>
          </div>
        ))}
      </div>

      <form
        action="/api/admin"
        method="POST"
        className="mt-6 space-y-3 rounded-2xl border border-line bg-surface p-5"
      >
        <input type="hidden" name="action" value="reply" />
        <input type="hidden" name="id" value={ticket.id} />
        <textarea
          name="message"
          required
          rows={3}
          placeholder="Ответ пользователю…"
          className="w-full resize-y rounded-xl border border-line bg-ink px-4 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
        >
          Ответить
        </button>
      </form>
    </main>
  );
}
