import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getStore } from "@/lib/db";
import { sendTelegram } from "@/lib/telegram";
import { brand } from "@/lib/brand";
import { siteUrl } from "@/lib/site";
import { formatDateTime, stateLabel, subState, timeLeft } from "@/lib/subscription";

/**
 * Вебхук Telegram-бота. Регистрируется один раз:
 *
 *   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
 *     -d url=https://<сайт>/api/telegram \
 *     -d secret_token=<TELEGRAM_WEBHOOK_SECRET>
 *
 * Команды: /start <токен подписки> — привязать чат к подписке (ссылка
 * с кнопки «Уведомления в Telegram» в кабинете), /status — сколько осталось,
 * /stop — отвязать.
 */
type Update = {
  message?: { chat: { id: number }; text?: string };
};

function secretOk(req: NextRequest): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET ?? "";
  const got = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!expected) return false;
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!secretOk(req)) return NextResponse.json({ ok: false }, { status: 403 });

  const update = (await req.json().catch(() => null)) as Update | null;
  const msg = update?.message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat.id);
  const [cmd, arg] = msg.text.trim().split(/\s+/, 2);
  const store = getStore();
  const site = siteUrl();

  if (cmd === "/start" && arg) {
    const sub = await store.findSubByToken(arg);
    if (!sub) {
      await sendTelegram(chatId, "Ссылка не распознана. Откройте кабинет на сайте и нажмите «Уведомления в Telegram» ещё раз.");
    } else {
      await store.setTelegram(sub.token, chatId);
      await sendTelegram(
        chatId,
        `Готово, уведомления ${brand.name} подключены для ${sub.email}.\n` +
          `Напомню за сутки до окончания доступа. Команда /status покажет, сколько осталось.`,
      );
    }
    return NextResponse.json({ ok: true });
  }

  const sub = await store.findSubByTelegram(chatId);
  if (cmd === "/stop") {
    if (sub) await store.setTelegram(sub.token, null);
    await sendTelegram(chatId, "Уведомления отключены. Подключить снова можно в кабинете на сайте.");
    return NextResponse.json({ ok: true });
  }

  if (!sub) {
    await sendTelegram(
      chatId,
      `Этот чат не привязан к подписке. Откройте кабинет ${site}/account и нажмите «Уведомления в Telegram».`,
    );
    return NextResponse.json({ ok: true });
  }

  // /status и всё остальное — показать статус.
  const state = subState(sub);
  const left = timeLeft(sub);
  const lines = [
    `${stateLabel[state]}.`,
    state === "trial" || state === "active"
      ? `Осталось ${left.days > 1 ? `${left.days} дн.` : `${left.hours} ч.`} — до ${formatDateTime(sub.expiresAt)} (МСК).`
      : `Продлить: ${site}/checkout?email=${encodeURIComponent(sub.email)}`,
    `Кабинет: ${site}/account`,
  ];
  await sendTelegram(chatId, lines.join("\n"));
  return NextResponse.json({ ok: true });
}
