import { brand } from "./brand";

/**
 * Почта. Транспорт — любой SMTP по строке SMTP_URL
 * (smtp://user:pass@host:587 или smtps://…:465), отправитель — MAIL_FROM.
 * Без SMTP_URL письма не отправляются, функции честно возвращают false:
 * сценарии, где почта — единственный канал, показывают это пользователю.
 */
export const mailConfigured = () => Boolean(process.env.SMTP_URL && process.env.MAIL_FROM);

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!mailConfigured()) return false;
  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport(process.env.SMTP_URL);
    await transport.sendMail({
      from: `${brand.name} <${process.env.MAIL_FROM}>`,
      to,
      subject,
      text,
    });
    return true;
  } catch (e) {
    console.error("[mail]", (e as Error).message);
    return false;
  }
}
