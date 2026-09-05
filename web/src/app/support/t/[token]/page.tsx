import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/db";

function fmt(d: Date) {
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ticket = await getStore().getTicketByToken(token);
  if (!ticket) notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link href="/support" className="text-sm text-muted hover:text-fg">
        ← Поддержка
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Обращение #{ticket.id}
        </h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs ${
            ticket.status === "open"
              ? "bg-accent-soft text-accent-ink"
              : "bg-surface-2 text-muted"
          }`}
        >
          {ticket.status === "open" ? "в работе" : "закрыто"}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted">
        Сохраните ссылку на эту страницу — здесь появится наш ответ.
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
                {m.author === "admin" ? "Поддержка" : "Вы"}
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
        action="/api/support"
        method="POST"
        className="mt-6 space-y-3 rounded-2xl border border-line bg-surface p-5"
      >
        <input type="hidden" name="ticket" value={ticket.token} />
        <textarea
          name="message"
          required
          rows={3}
          placeholder="Дописать сообщение…"
          className="w-full resize-y rounded-xl border border-line bg-ink px-4 py-2.5 text-sm outline-none placeholder:text-muted/60 focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
        >
          Отправить
        </button>
      </form>
    </main>
  );
}
