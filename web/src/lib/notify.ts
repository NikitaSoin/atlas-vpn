import { brand } from "./brand";
import { getStore, type ReminderKind, type SubRecord } from "./db";
import { sendMail } from "./mail";
import { sendTelegram } from "./telegram";
import { siteUrl } from "./site";
import { formatDateTime } from "./subscription";

/**
 * Уведомления пользователю: Telegram, если привязан, и почта, если настроена.
 * Вызывается из сценариев (триал, оплата) и из планировщика напоминаний.
 */

async function deliver(sub: SubRecord, subject: string, text: string): Promise<boolean> {
  const results = await Promise.all([
    sub.telegramChatId ? sendTelegram(sub.telegramChatId, text) : Promise.resolve(false),
    sendMail(sub.email, subject, text),
  ]);
  return results.some(Boolean);
}

export function messageFor(sub: SubRecord, kind: ReminderKind | "trial" | "paid") {
  const site = siteUrl();
  const setup = `${site}/setup/${sub.token}`;
  const renew = `${site}/checkout?email=${encodeURIComponent(sub.email)}`;
  const until = formatDateTime(sub.expiresAt);
  switch (kind) {
    case "trial":
      return {
        subject: `${brand.name}: пробный доступ включён`,
        text:
          `Аккаунт ${sub.email} создан, пробный доступ к ${brand.name} включён до ${until} (МСК).\n\n` +
          `Кабинет: ${site}/account (вход по коду на эту почту).\n` +
          `Настроить устройство можно и по личной ссылке:\n${setup}\n\n` +
          `Когда пробный период закончится, доступ можно продлить: ${renew}`,
      };
    case "paid":
      return {
        subject: `${brand.name}: доступ оплачен до ${until}`,
        text:
          `Спасибо! Доступ к ${brand.name} действует до ${until} (МСК).\n\n` +
          `Личная ссылка для настройки устройства (она не меняется):\n${setup}`,
      };
    case "expiring":
      return {
        subject: sub.isTrial
          ? `${brand.name}: пробный период заканчивается завтра`
          : `${brand.name}: подписка заканчивается завтра`,
        text:
          (sub.isTrial
            ? `Пробный период ${brand.name} заканчивается ${until} (МСК). `
            : `Подписка ${brand.name} заканчивается ${until} (МСК). `) +
          `Продлите сейчас — ничего перенастраивать не придётся, ссылка и настройки останутся прежними:\n${renew}`,
      };
    case "expired":
      return {
        subject: sub.isTrial
          ? `${brand.name}: пробный период закончился`
          : `${brand.name}: подписка закончилась`,
        text:
          (sub.isTrial
            ? `Пробный период ${brand.name} закончился. `
            : `Подписка ${brand.name} закончилась. `) +
          `Возобновить доступ: ${renew}\nПосле оплаты всё включится само.`,
      };
  }
}

export async function notify(sub: SubRecord, kind: ReminderKind | "trial" | "paid") {
  const { subject, text } = messageFor(sub, kind);
  return deliver(sub, subject, text);
}

/** За сколько часов до конца предупреждать. */
const REMIND_BEFORE_HOURS = 24;

/** Один проход планировщика: разослать всё, что пора. Возвращает число отправок. */
export async function runReminders(): Promise<number> {
  const store = getStore();
  const due = await store.listDueReminders(REMIND_BEFORE_HOURS);
  let sent = 0;
  for (const { sub, kind } of due) {
    // Отмечаем в любом случае: канала может не быть, но повторять не нужно.
    await store.markNotified(sub.token, kind);
    if (await notify(sub, kind)) sent++;
  }
  return sent;
}
