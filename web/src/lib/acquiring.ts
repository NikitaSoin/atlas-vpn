import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Интернет-эквайринг Т-Бизнеса (Т-Касса), сценарий non-PCI: приложение зовёт
 * Init, банк отдаёт ссылку на свою платёжную форму, человек платит там,
 * банк дёргает наш вебхук. Реквизиты карты сюда не попадают.
 *
 * Перенесено из рабочей реализации Basis (справка ~/эквайринг-тбизнес-справка.md,
 * сквозной прогон на бою 27–28.08.2026). Грабли оттуда учтены:
 *  - домен только securepay.tbank.ru, исторический tinkoff.ru мёртв по TLS;
 *  - в подписи булевы — строчными true/false, иначе подпись нотификации
 *    не сойдётся никогда;
 *  - ключи сортируются как есть: Password встаёт перед PaymentId;
 *  - SuccessURL/FailURL не передаём — иначе человек не увидит экран банка
 *    «Оплачено»; возврат идёт по адресу из настроек терминала;
 *  - к PaymentURL добавляется ?language=ru, иначе форма на английском.
 */

const API_URL = () => (process.env.TBANK_API_URL ?? "https://securepay.tbank.ru/v2").replace(/\/$/, "");
const TIMEOUT_MS = () => Number(process.env.TBANK_TIMEOUT ?? 20) * 1000;

/**
 * Реквизиты из переменных окружения. `trim()` обязателен: панель хостинга
 * легко добавляет пробел или перевод строки в конец значения, и банк
 * отвечает «терминал не найден» на внешне правильный ключ.
 */
export const terminalKey = () => (process.env.TBANK_TERMINAL_KEY ?? "").trim();
export const terminalPassword = () => (process.env.TBANK_PASSWORD ?? "").trim();

export const acquiringConfigured = () => Boolean(terminalKey() && terminalPassword());

/** Демо-терминал виден по суффиксу DEMO — на витрине показываем плашку. */
export const acquiringDemo = () => terminalKey().toUpperCase().endsWith("DEMO");

/**
 * Система налогообложения для фискального чека.
 *
 * Значение попадает в фискальный документ, поэтому оно вынесено в переменную
 * окружения, а не зашито: ошибка здесь — ошибка в чеке перед налоговой.
 * По умолчанию УСН «доходы», самый частый случай для ИП на услугах.
 * Допустимые значения Т-Кассы: osn, usn_income, usn_income_outcome,
 * envd, esn, patent.
 */
export const taxationCode = () => (process.env.TBANK_TAXATION ?? "usn_income").trim();

/**
 * Ставка НДС в позиции чека. На упрощёнке НДС нет — значение none.
 * Допустимые: none, vat0, vat10, vat20, vat110, vat120.
 */
export const vatCode = () => (process.env.TBANK_VAT ?? "none").trim();

/**
 * Чек для 54-ФЗ. Продажа физлицу требует фискального документа, и банк
 * пробивает его сам, если к терминалу подключена онлайн-касса. Позиция всегда
 * одна: доступ к сервису на выбранный срок, полная предоплата.
 * Наименование ограничено 128 знаками — это ограничение кассы, не наше.
 */
function receipt(email: string, itemName: string, amountKopecks: number) {
  return {
    Email: email,
    Taxation: taxationCode(),
    Items: [
      {
        Name: itemName.slice(0, 128),
        Price: amountKopecks,
        Quantity: 1,
        Amount: amountKopecks,
        PaymentMethod: "full_prepayment",
        PaymentObject: "service",
        Tax: vatCode(),
      },
    ],
  };
}

/** Что реально приехало в переменные — без раскрытия секретов. */
export function credentialsShape() {
  const key = process.env.TBANK_TERMINAL_KEY ?? "";
  const pass = process.env.TBANK_PASSWORD ?? "";
  return {
    // Начало ключа показываем целиком: у двух разных демо-терминалов и длина,
    // и хвост DEMO совпадают, и по ним не отличить, какой из них в панели.
    // Ключ терминала не секрет, он уходит в браузер на форме оплаты.
    ключ: {
      длина: key.length,
      обрезкаПробелов: key !== key.trim(),
      начало: key.trim().slice(0, 6),
      хвост: key.trim().slice(-4),
    },
    пароль: {
      длина: pass.length,
      обрезкаПробелов: pass !== pass.trim(),
      хвост: pass.trim().slice(-2),
    },
  };
}

/**
 * Тело запроса к банку. Вложенные объекты допустимы: чек передаётся объектом,
 * и в подпись он не входит — makeToken пропускает всё, что не скаляр.
 */
type Flat = Record<string, string | number | boolean | null | undefined | object>;

function stringify(v: string | number | boolean): string {
  // Булевы — строчными, как в JSON: банк присылает "Success": true.
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

/** Подпись: только корневые поля, + Password, сортировка ключей, SHA-256. */
export function makeToken(params: Flat, password: string): string {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k === "Token" || v === null || v === undefined || typeof v === "object") continue;
    flat[k] = stringify(v as string | number | boolean);
  }
  flat.Password = password;
  const raw = Object.keys(flat)
    .sort()
    .map((k) => flat[k])
    .join("");
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Проверка подписи нотификации за постоянное время. */
export function verifyNotification(body: Flat): boolean {
  const password = terminalPassword();
  const got = String(body.Token ?? "");
  if (!password || !got) return false;
  const expected = makeToken(body, password);
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function call<T>(method: string, params: Flat): Promise<T> {
  const password = terminalPassword();
  const body = { ...params, TerminalKey: terminalKey(), Token: "" };
  body.Token = makeToken(body, password);
  const res = await fetch(`${API_URL()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS()),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Банк ${res.status} на ${method}: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<T>;
}

export type InitResult = {
  Success: boolean;
  Status?: string;
  PaymentId?: string;
  PaymentURL?: string;
  ErrorCode?: string;
  Message?: string;
  Details?: string;
};

/** Создать платёж. Сумма приходит в копейках и считается ТОЛЬКО на сервере. */
export async function initPayment(input: {
  orderId: string;
  amountKopecks: number;
  description: string;
  /** Наименование позиции в чеке. Если не задано — берётся описание платежа. */
  itemName?: string;
  /** Почта покупателя: банк отправит на неё фискальный чек. */
  email: string;
  notificationUrl: string;
}): Promise<InitResult> {
  const r = await call<InitResult>("Init", {
    Amount: input.amountKopecks,
    OrderId: input.orderId,
    Description: input.description.slice(0, 250),
    NotificationURL: input.notificationUrl,
    // SuccessURL/FailURL намеренно не передаём — см. комментарий сверху.
    DATA: undefined,
    // Вложенные объекты в подпись не входят — makeToken их пропускает.
    Receipt: receipt(input.email, input.itemName ?? input.description, input.amountKopecks),
  });
  if (r.PaymentURL && !r.PaymentURL.includes("language=")) {
    const sep = r.PaymentURL.includes("?") ? "&" : "?";
    r.PaymentURL = `${r.PaymentURL}${sep}language=ru`;
  }
  return r;
}

export type StateResult = { Success: boolean; Status?: string; ErrorCode?: string; Message?: string };

export async function getState(paymentId: string): Promise<StateResult> {
  return call<StateResult>("GetState", { PaymentId: paymentId });
}

/** Деньги получены: начисляем и на AUTHORIZED (холд), и на CONFIRMED. */
/**
 * Живая проверка связи с банком: Init на рубль, в базу ничего не пишет.
 * Нужна, чтобы отличить «банк отказал» от «мы туда не ходим» до того, как
 * первый живой человек нажмёт «Оплатить».
 */
export async function probePayments(): Promise<{
  ok: boolean;
  demo: boolean;
  errorCode?: string;
  message?: string;
  ms: number;
}> {
  const t0 = Date.now();
  if (!acquiringConfigured()) return { ok: false, demo: false, message: "реквизиты не заданы", ms: 0 };
  try {
    const r = await initPayment({
      orderId: `probe-${Date.now()}`,
      amountKopecks: 100,
      description: "Проверка связи",
      email: "probe@example.com",
      notificationUrl: "https://example.invalid/probe",
    });
    return {
      ok: Boolean(r.Success),
      demo: acquiringDemo(),
      errorCode: r.ErrorCode,
      message: r.Message ?? r.Details,
      ms: Date.now() - t0,
    };
  } catch (e) {
    return { ok: false, demo: acquiringDemo(), message: (e as Error).message, ms: Date.now() - t0 };
  }
}

export const PAID_STATUSES = new Set(["CONFIRMED", "AUTHORIZED"]);
/** Возврат: доступ надо забрать обратно, иначе возврат станет подарком. */
export const REFUND_STATUSES = new Set(["REFUNDED", "REVERSED", "PARTIAL_REFUNDED"]);
export const FAILED_STATUSES = new Set(["REJECTED", "CANCELED", "DEADLINE_EXPIRED"]);
