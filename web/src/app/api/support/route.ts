import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/db";
import { track } from "@/lib/analytics";

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
  await track(req.headers, "ticket_created");
  return NextResponse.redirect(absoluteUrl(req, `/support/t/${ticket.token}`), {
    status: 303,
  });
}
