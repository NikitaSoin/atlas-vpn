import Link from "next/link";
import { brand, companyFilled, getCompany } from "@/lib/brand";
import PaymentMethods from "../payment-methods";

export const metadata = { title: `Контакты — ${brand.name}` };
export const dynamic = "force-dynamic";

/**
 * Контакты и реквизиты.
 *
 * Отдельная страница, потому что этого требуют сразу двое: ст. 9 Закона
 * «О защите прав потребителей» — знать, с кем заключаешь договор, и правила
 * эквайера — раздел «Контакты» с названием, телефоном и электронной почтой.
 * Реквизиты берутся из переменных окружения, чтобы менялись без правки кода.
 */
export default function ContactsPage() {
  const c = getCompany();
  const row = "flex flex-col gap-0.5 border-t border-line/60 py-3 sm:flex-row sm:gap-4";
  const key = "w-56 shrink-0 text-muted";
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← На главную
      </Link>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">Контакты</h1>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">Служба поддержки</h2>
        <div className="mt-3 text-sm">
          <div className={row}>
            <span className={key}>Электронная почта</span>
            <span>{c.email || "не задана"}</span>
          </div>
          <div className={row}>
            <span className={key}>Телефон</span>
            <span>{c.phone || "не задан"}</span>
          </div>
          <div className={row}>
            <span className={key}>Telegram</span>
            <a href={brand.supportTelegram} className="text-accent-ink hover:underline">
              {brand.supportTelegram.replace("https://", "")}
            </a>
          </div>
          <div className={row}>
            <span className={key}>Обращение с сайта</span>
            <Link href="/support" className="text-accent-ink hover:underline">
              форма обратной связи
            </Link>
          </div>
          <div className={row}>
            <span className={key}>Время ответа</span>
            <span>в течение суток, обычно быстрее</span>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-medium">Исполнитель</h2>
        {companyFilled(c) ? (
          <div className="mt-3 text-sm">
            <div className={row}>
              <span className={key}>Наименование</span>
              <span>
                {c.form} {c.name}
              </span>
            </div>
            <div className={row}>
              <span className={key}>ОГРНИП</span>
              <span>{c.ogrnip}</span>
            </div>
            <div className={row}>
              <span className={key}>ИНН</span>
              <span>{c.inn}</span>
            </div>
            <div className={row}>
              <span className={key}>Адрес</span>
              <span>{c.address || "не задан"}</span>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-amber-700">
            Реквизиты не заданы: заполните переменные COMPANY_* в настройках приложения.
          </p>
        )}
      </section>

      <section className="mt-6">
        <PaymentMethods />
      </section>

      <p className="mt-8 text-sm text-muted">
        Условия оплаты, предоставления услуги и возврата — на странице{" "}
        <Link href="/terms" className="text-accent-ink hover:underline">
          «Оплата и возврат»
        </Link>
        . Полный текст договора — в{" "}
        <Link href="/legal/offer" className="text-accent-ink hover:underline">
          оферте
        </Link>
        .
      </p>
    </main>
  );
}
