import Image from "next/image";
import Link from "next/link";
import TrackedLink from "./tracked-link";
import TrialOffer from "./trial-offer";
import { brand } from "@/lib/brand";
import { plans, TRIAL_DAYS } from "@/lib/plans";
import { currentSub } from "@/lib/session";
import { subState } from "@/lib/subscription";
import { platformLabels, platformOrder } from "@/lib/clients";

export const dynamic = "force-dynamic";

const steps = [
  ["Создайте аккаунт", "Подтвердите почту и включите бесплатный период."],
  ["Установите INCY", "Покажем нужную версию для вашего устройства."],
  [
    "Добавьте подписку",
    "Настройки перенесутся в приложение. Останется включить соединение.",
  ],
];

const faq = [
  {
    q: "Что будет после пробного периода?",
    a: "Доступ прекратится. Деньги не спишутся: карта не нужна. Продолжить можно после оплаты любого срока — ссылка и настройки останутся прежними.",
  },
  {
    q: "Зачем отдельное приложение?",
    a: "Сайт выдаёт доступ и настройки к нашему серверу. Соединение устанавливает приложение INCY на устройстве: ни один сайт не может управлять сетевыми настройками системы, операционные системы это запрещают.",
  },
  {
    q: "На скольких устройствах работает подписка?",
    a: "На всех ваших устройствах. Добавьте одну и ту же подписку на телефон, ноутбук и планшет. Делиться ссылкой с другими людьми не стоит: это ваш личный доступ.",
  },
  {
    q: "Будет ли тормозить интернет?",
    a: "Скорость зависит от вашей сети и доступности сервера. Пробный период позволяет проверить работу в обычных условиях.",
  },
  {
    q: "Что именно делает сервис?",
    a: "Открывает зашифрованный канал между вашим устройством и нашим сервером за рубежом: дальше в интернет вы выходите через него. Журналов посещений мы не ведём и трафик не анализируем.",
  },
  {
    q: "Для чего сервис использовать нельзя?",
    a: "Ограничения перечислены в правилах использования, ссылка — внизу страницы.",
  },
  {
    q: "Что делать, если соединение перестало работать?",
    a: "Напишите в поддержку. Поможем разобраться с настройкой и доступом.",
  },
];

export default async function Home() {
  const sub = await currentSub();
  const state = sub ? subState(sub) : null;
  const hasAccess = Boolean(state && state !== "none");
  const cheapest = plans.reduce((a, b) => (a.perMonth <= b.perMonth ? a : b));

  return (
    <main>
      <section className="hero-glow">
        <div className="mx-auto max-w-5xl px-5 pb-20 pt-16 text-center sm:pt-24">
          <Image
            src="/emblem.png"
            alt={`Логотип ${brand.name}`}
            width={144}
            height={144}
            priority
            className="mx-auto rounded-full"
          />
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-good" />
            Первые {TRIAL_DAYS} дня бесплатно · без карты
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-primary sm:text-6xl">
            Ваше соединение —
            <br />
            только ваше.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted">
            Зашифрованный канал через наш сервер за рубежом.
            <br />
            Одна подписка для всех ваших устройств.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <TrackedLink
              href={sub ? "/account" : "/start?mode=signup&trial=1"}
              event="cta_click"
              detail="hero"
              className="rounded-xl bg-primary px-6 py-3 font-medium text-white transition hover:brightness-110"
            >
              {sub ? "В личный кабинет" : `Попробовать ${TRIAL_DAYS} дня бесплатно`}
            </TrackedLink>
            <Link
              href="#kak"
              className="rounded-xl border border-line px-6 py-3 font-medium text-muted transition hover:text-fg"
            >
              Как это работает
            </Link>
          </div>
          <p className="mt-5 text-sm text-muted">
            {platformOrder.map((p) => platformLabels[p]).join(" · ")}
          </p>
        </div>
      </section>

      <section id="kak" className="mx-auto max-w-5xl px-5 py-16">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Три шага до подключения
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map(([title, text], i) => (
            <li key={title} className="rounded-2xl border border-line bg-surface p-6">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft text-sm font-semibold text-accent-ink">
                {i + 1}
              </span>
              <h3 className="mt-4 font-medium">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="tarify" className="mx-auto max-w-5xl px-5 py-16">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Попробуйте. Затем решите.
          </h2>
          <TrackedLink
            href="/plans"
            event="tariff_click"
            detail="landing_all"
            className="text-sm text-accent-ink hover:underline"
          >
            Все тарифы →
          </TrackedLink>
        </div>
        {!hasAccess && (
          <div className="mt-6">
            <TrialOffer signedIn={Boolean(sub)} place="landing" />
          </div>
        )}
        <p className="mt-6 text-sm text-muted">
          После пробного периода — от {cheapest.perMonth} ₽ в месяц при оплате{" "}
          {cheapest.months} месяцев. Полная сумма — {cheapest.price.toLocaleString("ru-RU")} ₽.
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
                <span className="text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
