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

export const acquiringConfigured = () =>
  Boolean(process.env.TBANK_TERMINAL_KEY && process.env.TBANK_PASSWORD);

/** Демо-терминал виден по суффиксу DEMO — на витрине показываем плашку. */
export const acquiringDemo = () =>
  (process.env.TBANK_TERMINAL_KEY ?? "").toUpperCase().endsWith("DEMO");

type Flat = Record<string, string | number | boolean | null | undefined>;

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
  const password = process.env.TBANK_PASSWORD;
  const got = String(body.Token ?? "");
  if (!password || !got) return false;
  const expected = makeToken(body, password);
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function call<T>(method: string, params: Flat): Promise<T> {
  const password = process.env.TBANK_PASSWORD!;
  const body = { ...params, TerminalKey: process.env.TBANK_TERMINAL_KEY, Token: "" };
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
export const PAID_STATUSES = new Set(["CONFIRMED", "AUTHORIZED"]);
/** Возврат: доступ надо забрать обратно, иначе возврат станет подарком. */
export const REFUND_STATUSES = new Set(["REFUNDED", "REVERSED", "PARTIAL_REFUNDED"]);
export const FAILED_STATUSES = new Set(["REJECTED", "CANCELED", "DEADLINE_EXPIRED"]);
