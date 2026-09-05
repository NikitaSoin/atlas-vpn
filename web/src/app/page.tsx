import Link from "next/link";
import { brand } from "@/lib/brand";
import { plans, TRIAL_DAYS } from "@/lib/plans";
import { platformLabels, platformOrder } from "@/lib/clients";

const steps = [
  {
    title: "Оплатите доступ",
    text: "Картой или через СБП. Занимает меньше минуты, регистрация не нужна.",
  },
  {
    title: "Установите приложение",
    text: "Мы сами определим ваше устройство и дадим ссылку на нужное приложение.",
  },
  {
    title: "Нажмите одну кнопку",
    text: "Настройки подставятся автоматически. Дальше — просто переключатель «вкл».",
  },
];

const faq = [
  {
    q: "Почему нужно ставить отдельное приложение?",
    a: "Ни один сайт не может включить VPN сам — операционные системы iOS, Android, Windows и macOS запрещают это из соображений безопасности. Приложение обязательно у любого VPN-сервиса без исключений. Мы сделали так, что настройка занимает один тап: приложение получает все параметры по ссылке, вручную ничего вводить не нужно.",
  },
  {
    q: "Приложения нет в российском App Store. Что делать?",
    a: "Нужно один раз бесплатно переключить регион Apple Account на любой другой — например, Турцию. Это занимает пять минут, карта не требуется, все ваши покупки и данные сохраняются. Пошаговая инструкция будет на экране после оплаты. На Android этой проблемы нет вообще.",
  },
  {
    q: "На скольких устройствах работает одна подписка?",
    a: "На трёх одновременно. Телефон, ноутбук и планшет — одной ссылки хватит на всё, повторно платить не нужно.",
  },
  {
    q: "Будет ли тормозить интернет?",
    a: "Мы используем современный протокол VLESS с Reality — он быстрее устаревших OpenVPN и L2TP и не режет скорость на видео. Разница с обычным подключением почти незаметна.",
  },
  {
    q: "Что если перестанет работать?",
    a: "Напишите в поддержку в Telegram — обычно отвечаем в течение часа и выдаём резервный сервер. Если решить не получится, вернём деньги за неиспользованный период.",
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero-glow">
        <div className="mx-auto max-w-5xl px-5 pb-20 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-good" />
            Первые {TRIAL_DAYS} дня бесплатно
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            {brand.tagline}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            {brand.description} Настройка — одна кнопка, без инструкций на
            двадцать шагов.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="#tarify"
              className="rounded-xl bg-accent px-6 py-3 font-medium text-white transition hover:brightness-110"
            >
              Подключить
            </Link>
            <Link
              href="#kak"
              className="rounded-xl border border-line px-6 py-3 font-medium text-muted transition hover:text-fg"
            >
              Как это работает
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted">
            Работает на {platformOrder.map((p) => platformLabels[p]).join(" · ")}
          </p>
        </div>
      </section>

      <section id="kak" className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Три шага до подключения
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li
              key={s.title}
              className="rounded-2xl border border-line bg-surface p-6"
            >
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-sm font-semibold text-accent">
                {i + 1}
              </span>
              <h3 className="mt-4 font-medium">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="tarify" className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Тарифы
        </h2>
        <p className="mt-2 text-muted">
          Чем длиннее период, тем дешевле месяц. Отменить можно в любой момент.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 ${
                plan.popular
                  ? "border-accent bg-accent-soft/40"
                  : "border-line bg-surface"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-6 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-white">
                  Выгоднее всего
                </span>
              )}
              <h3 className="font-medium">{plan.title}</h3>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold">{plan.perMonth} ₽</span>
                <span className="text-sm text-muted">/ мес</span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {plan.price} ₽ за весь период
                {plan.discount ? ` · выгода ${plan.discount}%` : ""}
              </p>
              <Link
                href={`/checkout?plan=${plan.id}`}
                className={`mt-6 block rounded-xl px-4 py-2.5 text-center font-medium transition ${
                  plan.popular
                    ? "bg-accent text-white hover:brightness-110"
                    : "border border-line text-fg hover:border-accent"
                }`}
              >
                Выбрать
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          Одна подписка — до трёх устройств одновременно.
        </p>
      </section>

      <section id="faq" className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Частые вопросы
        </h2>
        <div className="mt-8 divide-y divide-line/70 border-y border-line/70">
          {faq.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {item.q}
                <span className="text-muted transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
