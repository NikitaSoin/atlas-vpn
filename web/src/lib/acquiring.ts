/**
 * Эквайринг ЮKassa.
 *
 * Переход с Т-Кассы состоялся 10.09.2026: Т-Бизнес отказал в подключении
 * интернет-эквайринга, ЮKassa работает с этой категорией. Деньги приходят на
 * расчётный счёт ИП в любом банке, чеки по 54-ФЗ пробивает касса ЮKassa,
 * отдельные договоры с ОФД не нужны.
 *
 * Главное отличие от Т-Кассы, из-за которого код устроен иначе: **уведомления
 * ЮKassa не подписаны**. Проверять их можно только по адресу отправителя и,
 * что надёжнее, перезапросом объекта через API. Поэтому здесь нет проверки
 * подписи, зато есть правило: тело уведомления считаем лишь подсказкой, а
 * решение принимаем по ответу API. Подделать уведомление тогда бесполезно.
 *
 * Документация: yookassa.ru/developers/api (проверено 10.09.2026).
 */

const API = "https://api.yookassa.ru/v3";
const TIMEOUT_MS = () => Number(process.env.YOOKASSA_TIMEOUT ?? 20) * 1000;

export const shopId = () => (process.env.YOOKASSA_SHOP_ID ?? "").trim();
export const secretKey = () => (process.env.YOOKASSA_SECRET_KEY ?? "").trim();

export const acquiringConfigured = () => Boolean(shopId() && secretKey());

/**
 * Тестовый магазин. У ЮKassa это видно по ключу: боевые начинаются с `live_`,
 * тестовые — с `test_`. Гадать не нужно, признак в самом ключе.
 */
export const acquiringDemo = () => secretKey().startsWith("test_");

/**
 * Система налогообложения для чека: 1 — ОСН, 2 — УСН доходы,
 * 3 — УСН доходы минус расходы, 4 — ЕНВД, 5 — ЕСХН, 6 — патент.
 * Значение уходит в фискальный документ, поэтому вынесено в переменную.
 */
export const taxSystemCode = () => Number(process.env.YOOKASSA_TAX_SYSTEM ?? 2);

/**
 * Ставка НДС в позиции чека: 1 — без НДС, 2 — 0%, 3 — 10%, 4 — 20%,
 * 5 — 10/110, 6 — 20/120. На упрощёнке — без НДС.
 */
export const vatCode = () => Number(process.env.YOOKASSA_VAT_CODE ?? 1);

/** Что реально приехало в переменные — без раскрытия секрета. */
export function credentialsShape() {
  const id = shopId();
  const key = secretKey();
  return {
    магазин: { длина: id.length, значение: id },
    ключ: {
      длина: key.length,
      начало: key.slice(0, 5),
      боевой: key.startsWith("live_"),
      обрезкаПробелов: key !== key.trim(),
    },
    чек: { налогообложение: taxSystemCode(), ндс: vatCode() },
  };
}

/** Рубли с копейками строкой, как требует ЮKassa: «199.00». */
const rub = (kopecks: number) => (kopecks / 100).toFixed(2);

function authHeader(): string {
  return "Basic " + Buffer.from(`${shopId()}:${secretKey()}`).toString("base64");
}

async function call<T>(path: string, init?: RequestInit & { idempotenceKey?: string }): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: authHeader(),
    "Content-Type": "application/json",
  };
  if (init?.idempotenceKey) headers["Idempotence-Key"] = init.idempotenceKey;
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string>) },
    signal: AbortSignal.timeout(TIMEOUT_MS()),
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* ЮKassa всегда отвечает JSON; пустой ответ разберём как null */
  }
  if (!res.ok) {
    const e = (body ?? {}) as { code?: string; description?: string };
    throw Object.assign(new Error(e.description ?? `ЮKassa ${res.status}`), {
      code: e.code ?? String(res.status),
    });
  }
  return body as T;
}

export type PaymentResult = {
  ok: boolean;
  paymentId?: string;
  confirmationUrl?: string;
  status?: string;
  errorCode?: string;
  message?: string;
};

type YooPayment = {
  id: string;
  status: string;
  paid: boolean;
  amount: { value: string; currency: string };
  confirmation?: { confirmation_url?: string };
  metadata?: Record<string, string>;
};

/**
 * Создать платёж. Сумма приходит в копейках и считается ТОЛЬКО на сервере.
 * `capture: true` — деньги списываются сразу, без отдельного подтверждения.
 */
export async function initPayment(input: {
  orderId: string;
  amountKopecks: number;
  description: string;
  /** Наименование позиции в чеке. Если не задано — берётся описание платежа. */
  itemName?: string;
  /** Почта покупателя: на неё уходит фискальный чек. */
  email: string;
  returnUrl: string;
}): Promise<PaymentResult> {
  const amount = { value: rub(input.amountKopecks), currency: "RUB" };
  try {
    const p = await call<YooPayment>("/payments", {
      method: "POST",
      // Ключ идемпотентности — наш номер заказа: повторный запрос по той же
      // кнопке не создаст второй платёж даже при двойном нажатии.
      idempotenceKey: input.orderId,
      body: JSON.stringify({
        amount,
        capture: true,
        confirmation: { type: "redirect", return_url: input.returnUrl },
        description: input.description.slice(0, 128),
        // По метаданным находим свой заказ, когда придёт уведомление.
        metadata: { order_id: input.orderId },
        receipt: {
          customer: { email: input.email },
          tax_system_code: taxSystemCode(),
          items: [
            {
              description: (input.itemName ?? input.description).slice(0, 128),
              quantity: "1.00",
              amount,
              vat_code: vatCode(),
              payment_mode: "full_prepayment",
              payment_subject: "service",
            },
          ],
        },
      }),
    });
    return {
      ok: true,
      paymentId: p.id,
      status: p.status,
      confirmationUrl: p.confirmation?.confirmation_url,
    };
  } catch (e) {
    const err = e as Error & { code?: string };
    return { ok: false, errorCode: err.code, message: err.message };
  }
}

export type PaymentState = {
  ok: boolean;
  status?: string;
  paid?: boolean;
  amountKopecks?: number;
  orderId?: string;
  errorCode?: string;
  message?: string;
};

/** Состояние платежа по данным ЮKassa — источник правды при уведомлениях. */
export async function getPayment(paymentId: string): Promise<PaymentState> {
  try {
    const p = await call<YooPayment>(`/payments/${encodeURIComponent(paymentId)}`);
    return {
      ok: true,
      status: p.status,
      paid: p.paid,
      amountKopecks: Math.round(Number(p.amount.value) * 100),
      orderId: p.metadata?.order_id,
    };
  } catch (e) {
    const err = e as Error & { code?: string };
    return { ok: false, errorCode: err.code, message: err.message };
  }
}

type YooRefund = { id: string; status: string; payment_id: string; amount: { value: string } };

/** Состояние возврата: нужен, чтобы узнать сумму и платёж, к которому он относится. */
export async function getRefund(refundId: string): Promise<{
  ok: boolean;
  status?: string;
  paymentId?: string;
  amountKopecks?: number;
}> {
  try {
    const r = await call<YooRefund>(`/refunds/${encodeURIComponent(refundId)}`);
    return {
      ok: true,
      status: r.status,
      paymentId: r.payment_id,
      amountKopecks: Math.round(Number(r.amount.value) * 100),
    };
  } catch {
    return { ok: false };
  }
}

/**
 * Адреса, с которых ЮKassa шлёт уведомления. Список из их документации,
 * проверен 10.09.2026. Это первый фильтр, а не доказательство: настоящую
 * проверку делает перезапрос объекта через API.
 */
const NOTIFY_NETS = [
  "185.71.76.0/27",
  "185.71.77.0/27",
  "77.75.153.0/25",
  "77.75.154.128/25",
  "77.75.156.11/32",
  "77.75.156.35/32",
];

function inNet(ip: string, cidr: string): boolean {
  const [net, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  const toInt = (a: string) =>
    a.split(".").reduce((acc, part) => (acc << 8) + (Number(part) & 255), 0) >>> 0;
  if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip)) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (toInt(ip) & mask) === (toInt(net) & mask);
}

/** Пришло ли уведомление с адресов ЮKassa. */
export function fromYooKassa(ip: string): boolean {
  const clean = ip.trim();
  return NOTIFY_NETS.some((n) => inNet(clean, n));
}

/** Живая проверка связи: создаём платёж на рубль, в базу ничего не пишем. */
export async function probePayments(): Promise<{
  ok: boolean;
  demo: boolean;
  errorCode?: string;
  message?: string;
  ms: number;
}> {
  const t0 = Date.now();
  if (!acquiringConfigured()) return { ok: false, demo: false, message: "реквизиты не заданы", ms: 0 };
  const r = await initPayment({
    orderId: `probe-${Date.now()}`,
    amountKopecks: 100,
    description: "Проверка связи",
    email: "probe@example.com",
    returnUrl: "https://example.com/",
  });
  return {
    ok: r.ok,
    demo: acquiringDemo(),
    errorCode: r.errorCode,
    message: r.message,
    ms: Date.now() - t0,
  };
}

/** Деньги получены. */
export const PAID_STATUSES = new Set(["succeeded"]);
/**
 * Возврат: доступ надо забрать обратно, иначе возврат станет подарком.
 * `refunded` — то, что пишем в свою таблицу; остальное приходит от ЮKassa.
 */
export const REFUND_STATUSES = new Set(["refunded", "refund.succeeded"]);
export const FAILED_STATUSES = new Set(["canceled"]);
