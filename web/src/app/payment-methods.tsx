import fs from "node:fs";
import path from "node:path";

/**
 * Способы оплаты: логотипы платёжных систем и банка со ссылкой на него.
 *
 * Требование эквайера к сайту продавца: на сайте должны быть изображения с
 * логотипами платёжных систем, карты которых принимаются, и логотип банка со
 * ссылкой на его ресурсы. Отсутствие этого блока — одна из причин, по которым
 * заявку на подключение отклоняют.
 *
 * Файлы логотипов кладутся в `public/logos`. Брать их надо у правообладателя:
 * банковский — в кабинете эквайринга, платёжных систем — на их официальных
 * ресурсах. Своих версий чужих товарных знаков мы не рисуем.

 * 10.09.2026 эквайринг переехал с Т-Кассы на ЮKassa: Т-Бизнес отказал в
 * подключении, ЮKassa работает с этой категорией.
 *
 * Пока файла нет, вместо картинки выводится название: страница остаётся
 * осмысленной, а как только файл появится, он подхватится сам.
 */
const METHODS = [
  { file: "mir.svg", label: "Мир" },
  { file: "visa.svg", label: "Visa" },
  { file: "mastercard.svg", label: "Mastercard" },
  { file: "sbp.svg", label: "СБП" },
  { file: "yoomoney.svg", label: "ЮMoney" },
];

function exists(file: string): boolean {
  try {
    return fs.existsSync(path.join(process.cwd(), "public", "logos", file));
  } catch {
    return false;
  }
}

export default function PaymentMethods({ compact = false }: { compact?: boolean }) {
  const providerLogo = exists("yookassa.svg");
  return (
    <div className={compact ? "" : "rounded-2xl border border-line bg-surface p-5"}>
      {!compact && <h2 className="font-medium">Оплата</h2>}
      <p className={`${compact ? "" : "mt-2 "}text-sm leading-relaxed text-muted`}>
        Оплата картой на защищённой странице банка. Данные карты остаются у банка,
        мы их не получаем и не храним.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {METHODS.map((m) =>
          exists(m.file) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={m.file} src={`/logos/${m.file}`} alt={m.label} className="h-6 w-auto" />
          ) : (
            <span
              key={m.file}
              className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted"
            >
              {m.label}
            </span>
          ),
        )}
      </div>
      <p className="mt-3 text-sm text-muted">
        Платежи проводит{" "}
        <a
          href="https://yookassa.ru"
          target="_blank"
          rel="noreferrer"
          className="text-accent-ink hover:underline"
        >
          ЮKassa
        </a>
        {providerLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/logos/yookassa.svg"
            alt="ЮKassa"
            className="ml-2 inline h-5 w-auto align-middle"
          />
        )}
      </p>
    </div>
  );
}
