import Link from "next/link";
import { brand, getCompany } from "@/lib/brand";
import { plans } from "@/lib/plans";
import PaymentMethods from "../payment-methods";

export const metadata = { title: `Оплата и возврат — ${brand.name}` };
export const dynamic = "force-dynamic";

/**
 * Условия оплаты, предоставления услуги и возврата — отдельной видимой
 * страницей, а не только внутри оферты.
 *
 * Правила эквайера требуют, чтобы на сайте были указаны порядок возврата и
 * отмены, а также условия, сроки и регионы предоставления. Формально всё это
 * есть в оферте, но её никто не читает и проверяющий тоже: он смотрит, есть
 * ли на сайте отдельный понятный раздел.
 */
export default function TermsPage() {
  const company = getCompany();
  const cheapest = [...plans].sort((a, b) => a.price - b.price)[0];
  const block = "rounded-2xl border border-line bg-surface p-5";
  return (
    <main className="mx-auto max-w-3xl px-5 py-16">
      <Link href="/" className="text-sm text-muted hover:text-fg">
        ← На главную
      </Link>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">
        Оплата, предоставление услуги и возврат
      </h1>

      <section className={`mt-6 ${block}`}>
        <h2 className="font-medium">Что вы покупаете</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Доступ к личному зашифрованному каналу связи на выбранный срок. Это услуга,
          физический товар не отгружается. Цена указана в рублях и включает все налоги.
          {cheapest && ` Минимальная стоимость — ${cheapest.price} ₽ за ${cheapest.title.toLowerCase()}.`}{" "}
          Все тарифы — на странице{" "}
          <Link href="/plans" className="text-accent-ink hover:underline">
            «Тарифы»
          </Link>
          .
        </p>
      </section>

      <section className={`mt-4 ${block}`}>
        <h2 className="font-medium">Когда и как предоставляется</h2>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
          <li>
            Сразу после оплаты. Обычно доступ открывается за несколько секунд, в
            редких случаях до 15 минут.
          </li>
          <li>
            Доставки как таковой нет: доступ появляется в личном кабинете на сайте, туда
            же приходит персональная ссылка настройки. Копию присылаем на почту.
          </li>
          <li>
            Ограничений по регионам нет: услугой можно пользоваться из любой страны,
            круглосуточно, на любом количестве своих устройств.
          </li>
          <li>Срок действия — тот, что выбран при оплате, он виден в кабинете.</li>
        </ul>
      </section>

      <section className={`mt-4 ${block}`}>
        <h2 className="font-medium">Отмена и возврат</h2>
        <ul className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
          <li>
            Отказаться можно в любой момент. Напишите с почты, на которую оформлен
            аккаунт{company.email ? `, на ${company.email}` : ""}, либо через{" "}
            <Link href="/support" className="text-accent-ink hover:underline">
              форму обратной связи
            </Link>
            . Укажите дату платежа. Объяснять причину не нужно.
          </li>
          <li>
            Возвращаем деньги за неиспользованный срок. Использованные дни считаются
            пропорционально, по цене оплаченного тарифа.
          </li>
          <li>
            Заявление рассматриваем в течение 10 дней — это срок по ст. 22 Закона
            «О защите прав потребителей».
          </li>
          <li>
            Деньги возвращаются тем же способом, которым платили: на ту же карту.
            Банк зачисляет их обычно за три рабочих дня, по своим правилам — до десяти.
          </li>
          <li>
            Оставшаяся часть доступа при возврате сохраняется: снимается только тот срок,
            за который вернули деньги.
          </li>
        </ul>
      </section>

      <section className={`mt-4 ${block}`}>
        <h2 className="font-medium">Если что-то не работает</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Сначала напишите нам: почти всё чинится настройкой за несколько минут. Если
          решить не удалось, вернём деньги по правилам выше. Контакты — на странице{" "}
          <Link href="/contacts" className="text-accent-ink hover:underline">
            «Контакты»
          </Link>
          .
        </p>
      </section>

      <section className="mt-4">
        <PaymentMethods />
      </section>

      <p className="mt-8 text-sm text-muted">
        Полные условия договора — в{" "}
        <Link href="/legal/offer" className="text-accent-ink hover:underline">
          оферте
        </Link>
        . Как мы обращаемся с данными — в{" "}
        <Link href="/legal/privacy" className="text-accent-ink hover:underline">
          политике обработки данных
        </Link>
        .
      </p>
    </main>
  );
}
