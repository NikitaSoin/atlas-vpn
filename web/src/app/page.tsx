import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { plans, TRIAL_DAYS } from "@/lib/plans";
import { platformLabels, platformOrder } from "@/lib/clients";

const steps = [
  {
    title: "Введите email",
    text: `Первые ${TRIAL_DAYS} дня бесплатно — без карты и без обязательств. Платить только если понравится.`,
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
    q: "Что будет, когда закончится пробный период?",
    a: "Доступ просто выключится — деньги не списываются, карту мы не спрашиваем. За сутки до конца напомним на почту и в Telegram. Если понравилось, оплатите любой срок: ссылка и настройки останутся прежними, ничего заново ставить не нужно.",
  },
  {
    q: "Почему нужно ставить отдельное приложение?",
    a: "Ни один сайт не может включить VPN сам — операционные системы iOS, Android, Windows и macOS запрещают это из соображений безопасности. Приложение обязательно у любого VPN-сервиса без исключений. Мы сделали так, что настройка занимает один тап: приложение получает все параметры по ссылке, вручную ничего вводить не нужно.",
  },
  {
    q: "Нужно ли менять регион App Store?",
    a: "Нет. Приложение INCY, которое мы рекомендуем, доступно в российском App Store и в Google Play — ставится как обычное приложение. Если захотите другой клиент из тех, что мы предлагаем на выбор, может понадобиться бесплатная смена региона — инструкция будет на экране после оплаты.",
  },
  {
    q: "На скольких устройствах работает одна подписка?",
    a: "На всех ваших. Подписка выдаётся на аккаунт, а не на устройство: одна и та же ссылка работает на телефоне, ноутбуке и планшете — добавьте её в приложение на каждом. Делиться ссылкой с другими людьми не стоит: это ваш личный доступ.",
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
        <div className="mx-auto max-w-5xl px-5 pb-20 pt-16 text-center sm:pt-24">
          <Image
            src="/emblem.png"
            alt=""
            width={88}
            height={88}
            priority
            className="mx-auto rounded-full"
          />
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-good" />
            Первые {TRIAL_DAYS} дня бесплатно
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-primary sm:text-6xl">
            {brand.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            {brand.description} Настройка — одна кнопка, без инструкций на
            двадцать шагов. {brand.name} — {brand.tagline.toLowerCase()}.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/start"
              className="rounded-xl bg-primary px-6 py-3 font-medium text-white transition hover:brightness-110"
            >
              Попробовать {TRIAL_DAYS} дня бесплатно
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
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-sm font-semibold text-accent-ink">
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
          Сначала {TRIAL_DAYS} дня бесплатно, платить — только если понравится.
          Чем длиннее период, тем дешевле месяц.
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
                <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-white">
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
                    ? "bg-primary text-white hover:brightness-110"
                    : "border border-line text-fg hover:border-accent"
                }`}
              >
                Выбрать
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          Один тариф без хитростей: чем дольше срок, тем дешевле месяц.
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
