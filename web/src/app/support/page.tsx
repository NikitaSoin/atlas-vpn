import { brand } from "@/lib/brand";

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Поддержка</h1>
      <p className="mt-2 text-muted">
        Опишите проблему — обычно отвечаем в течение часа. Ответ появится на
        странице обращения, ссылку на неё покажем сразу после отправки.
      </p>

      <form
        action="/api/support"
        method="POST"
        className="mt-6 space-y-4 rounded-2xl border border-line bg-surface p-6"
      >
        <label className="block">
          <span className="text-sm text-muted">Email, указанный при оплате</span>
          <input
            type="email"
            name="email"
            required
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
            placeholder="Например: оплатил, но не понимаю, куда вставить ссылку"
            className="mt-1.5 w-full resize-y rounded-xl border border-line bg-ink px-4 py-2.5 outline-none placeholder:text-muted/60 focus:border-accent"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-xl bg-accent px-4 py-3 font-medium text-white transition hover:brightness-110"
        >
          Отправить
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        Быстрее в Telegram?{" "}
        <a
          href={brand.supportTelegram}
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          Напишите нам туда
        </a>
        .
      </p>
    </main>
  );
}
