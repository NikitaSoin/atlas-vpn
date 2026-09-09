import { brand } from "./brand";

/**
 * Почта. Транспорт — любой SMTP по строке SMTP_URL
 * (smtp://user:pass@host:587 или smtps://…:465), отправитель — MAIL_FROM.
 * Без SMTP_URL письма не отправляются, функции честно возвращают false:
 * сценарии, где почта — единственный канал, показывают это пользователю.
 */
export const mailConfigured = () =>
  process.env.SMTP_URL === "log" || Boolean(process.env.SMTP_URL && process.env.MAIL_FROM);

/**
 * Куда падают обращения из поддержки. Отдельной переменной, потому что ящик
 * для чтения писем и ящик-отправитель — не обязательно одно и то же. Если
 * переменная не задана, пишем на отправителя: лучше так, чем никуда.
 */
export const supportInbox = () =>
  (process.env.SUPPORT_EMAIL ?? process.env.MAIL_FROM ?? "").trim();

export async function sendMail(
  to: string,
  subject: string,
  text: string,
  /** Кому уйдёт ответ, если нажать «Ответить» в почте. */
  replyTo?: string,
): Promise<boolean> {
  if (!mailConfigured()) return false;
  // SMTP_URL=log — для локальной разработки: письмо печатается в консоль.
  if (process.env.SMTP_URL === "log") {
    console.log(`[mail → ${to}] ${subject}\n${text}`);
    return true;
  }
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport(process.env.SMTP_URL);
    await transport.sendMail({
      from: `${brand.name} <${process.env.MAIL_FROM}>`,
      to,
      subject,
      text,
      ...(replyTo ? { replyTo } : {}),
    });
    return true;
  } catch (e) {
    console.error("[mail]", (e as Error).message);
    return false;
  }
}
