import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/db";
import { track } from "@/lib/analytics";
import { sendMail, supportInbox } from "@/lib/mail";
import { siteUrl } from "@/lib/site";
import { brand } from "@/lib/brand";

/**
 * Сообщить нам, что человек написал. Без этого обращение просто ложилось в
 * базу и ждало, пока кто-нибудь заглянет в админку, — то есть не доходило
 * никогда (найдено 10.09.2026).
 *
 * Обратный адрес письма — почта клиента: на такое письмо можно ответить прямо
 * из ящика. Ответ через сайт всё равно остаётся: он попадёт в переписку, и
 * человек увидит его в своём кабинете.
 *
 * Ошибку отправки не показываем человеку: его обращение уже сохранено, и
 * винить его в наших проблемах с почтой незачем.
 */
async function alertSupport(email: string, token: string, message: string, isReply: boolean) {
  const to = supportInbox();
  if (!to) {
    console.error("[поддержка] некуда слать: не задан SUPPORT_EMAIL и MAIL_FROM");
    return;
  }
  const site = siteUrl();
  const subject = isReply
    ? `${brand.name}: ответ клиента ${email}`
    : `${brand.name}: новое обращение от ${email}`;
  const text =
    `${isReply ? "Клиент ответил в обращении." : "Новое обращение в поддержку."}\n\n` +
    `Почта: ${email}\n\n` +
    `Сообщение:\n${message}\n\n` +
    `Переписка: ${site}/support/t/${token}\n` +
    `Ответить можно там же или в админке: ${site}/admin`;
  const ok = await sendMail(to, subject, text, email);
  if (!ok) console.error("[поддержка] письмо не ушло:", email);
}

/** Создание обращения или ответ пользователя в существующем. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const store = getStore();

  const ticketToken = String(form.get("ticket") ?? "");
  const message = String(form.get("message") ?? "").trim().slice(0, 4000);
  if (!message) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  // Ответ в существующем треде.
  if (ticketToken) {
    const ticket = await store.getTicketByToken(ticketToken);
    if (!ticket) {
      return NextResponse.json({ error: "Обращение не найдено" }, { status: 404 });
    }
    await store.addMessage(ticket.id, "user", message);
    // Ответ пользователя снова открывает закрытое обращение.
    if (ticket.status === "closed") await store.setTicketStatus(ticket.id, "open");
    alertSupport(ticket.email, ticket.token, message, true).catch(() => {});
    return NextResponse.redirect(absoluteUrl(req, `/support/t/${ticket.token}`), {
      status: 303,
    });
  }

  // Новое обращение.
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 });
  }
  const ticket = await store.createTicket(email, message);
  alertSupport(email, ticket.token, message, false).catch(() => {});
  await track(req.headers, "ticket_created");
  return NextResponse.redirect(absoluteUrl(req, `/support/t/${ticket.token}`), {
    status: 303,
  });
}
