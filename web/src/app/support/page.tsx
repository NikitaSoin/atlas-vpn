import Link from "next/link";
import { brand } from "@/lib/brand";
import { currentSub } from "@/lib/session";

export const dynamic = "force-dynamic";

const hints = [
  [
    "INCY уже установлен",
    "Сразу нажмите «Добавить подписку» в инструкции. Устанавливать приложение повторно не нужно.",
  ],
  [
    "Кнопка импорта не сработала",
    "Раскройте ручной способ: скопируйте подписку или отсканируйте QR-код на другом устройстве.",
  ],
  [
    "Доступ закончился",
    "Оплатите новый срок — ссылка и настройки останутся прежними.",
  ],
];

export default async function SupportPage() {
  const sub = await currentSub();

  return (
    <main className="mx-auto max-w-4xl px-5 py-16">
      <Link href={sub ? "/account" : "/"} className="text-sm text-muted hover:text-fg">
        ← {sub ? "В кабинет" : "На главную"}
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight">
        Поможем разобраться
      </h1>
      <p className="mt-2 text-muted">Обычно отвечаем в течение часа.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-medium">Новое обращение</h2>
          <form action="/api/support" method="POST" className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm text-muted">Ваша почта</span>
              <input
                type="email"
                name="email"
                required
                defaultValue={sub?.email ?? ""}
                placeholder="you@example.com"
                className="mt-1.5 w-full rounded-xl border border-line bg-ink px-4 py-2.5 outline-none placeholder:text-muted/60 focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="text-sm text-muted">Что случилось</span>
              <textarea
                name="message"
                required
                rows={5}
                placeholder="Например: Android, мобильная сеть. INCY подключается, но сайты не открываются."
                className="mt-1.5 w-full resize-y rounded-xl border border-line bg-ink px-4 py-2.5 outline-none placeholder:text-muted/60 focus:border-accent"
              />
            </label>
            <p className="text-sm text-muted">
              Ответ появится на странице обращения. Пароль и личную ссылку
              присылать не нужно.
            </p>
            <button
              type="submit"
              className="rounded-xl bg-primary px-5 py-3 font-medium text-white transition hover:brightness-110"
            >
              Отправить →
            </button>
          </form>
        </section>

        <aside className="rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-medium">Быстрые подсказки</h2>
          <div className="mt-3 divide-y divide-line/70">
            {hints.map(([q, a]) => (
              <details key={q} className="py-3">
                <summary className="cursor-pointer text-sm font-medium">{q}</summary>
                <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
          <a
            href={brand.supportTelegram}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block rounded-xl border border-line px-4 py-2.5 text-sm transition hover:border-accent"
          >
            Написать в Telegram ↗
          </a>
        </aside>
      </div>
    </main>
  );
}
