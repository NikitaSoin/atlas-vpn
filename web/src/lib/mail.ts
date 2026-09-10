import { brand } from "./brand";

/**
 * Почта. Транспорт — любой SMTP по строке SMTP_URL
 * (smtp://user:pass@host:587 или smtps://…:465), отправитель — MAIL_FROM.
 * Без SMTP_URL письма не отправляются, функции честно возвращают false:
 * сценарии, где почта — единственный канал, показывают это пользователю.
 */
export const mailConfigured = () =>
  process.env.SMTP_URL === "log" ||
  Boolean((process.env.SMTP_HOST || process.env.SMTP_URL) && process.env.MAIL_FROM);

/**
 * Настройки SMTP из переменных окружения.
 *
 * Два способа задать одно и то же. Раздельные переменные — основной: в них
 * нечего экранировать. Строка подключения — запасной, для совместимости.
 *
 * 🔴 Строку разбираем вручную, а не через `new URL`. Логин почты содержит
 * «собаку», пароль — почти любые символы, и стандартный разбор на таком
 * спотыкается: 11.09.2026 почта молча не отправлялась именно поэтому, а
 * `new URL` отвечал «Invalid URL». Требовать от человека кодировать символы
 * в поле панели хостинга — верный способ повторить это снова.
 */
export function smtpSettings():
  | { host: string; port: number; secure: boolean; auth?: { user: string; pass: string } }
  | null {
  const host = process.env.SMTP_HOST?.trim();
  if (host) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    return {
      host,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER.trim(), pass: process.env.SMTP_PASSWORD ?? "" }
        : undefined,
    };
  }
  const raw = process.env.SMTP_URL?.trim();
  if (!raw || raw === "log") return null;
  // Схема, затем всё до ПОСЛЕДНЕЙ «собаки» — это логин и пароль, остальное —
  // хост и порт. Последняя «собака» выбрана намеренно: она есть и в логине.
  const m = /^(smtps?):\/\/(.*)$/i.exec(raw);
  if (!m) return null;
  const secureScheme = m[1].toLowerCase() === "smtps";
  const rest = m[2];
  const at = rest.lastIndexOf("@");
  const creds = at >= 0 ? rest.slice(0, at) : "";
  const hostPart = at >= 0 ? rest.slice(at + 1) : rest;
  const colon = creds.indexOf(":");
  const user = colon >= 0 ? creds.slice(0, colon) : creds;
  const pass = colon >= 0 ? creds.slice(colon + 1) : "";
  const [h, p] = hostPart.split(":");
  const port = Number(p || (secureScheme ? 465 : 587));
  const dec = (v: string) => {
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  if (!h) return null;
  return {
    host: h,
    port,
    secure: port === 465 || secureScheme,
    auth: user ? { user: dec(user), pass: dec(pass) } : undefined,
  };
}

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
    const settings = smtpSettings();
    if (!settings) {
      console.error("[mail] не удалось разобрать настройки SMTP");
      return false;
    }
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport(settings);
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
