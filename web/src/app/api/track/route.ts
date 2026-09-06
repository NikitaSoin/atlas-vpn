import { NextRequest } from "next/server";
import { track } from "@/lib/analytics";

/**
 * Приём событий воронки с клиента (navigator.sendBeacon).
 * Список закрытый: чужой скрипт не должен уметь писать что угодно в нашу
 * статистику. Всё, что не в списке, молча игнорируется.
 */
const ALLOWED = new Set([
  "page_view",
  "tariff_click", // клик по тарифу на лендинге
  "cta_click", // главная кнопка «попробовать»
  "faq_open", // раскрытие вопроса
  "client_install_click", // переход в магазин приложений
  "config_import_click", // кнопка «добавить подписку» одним тапом
  "config_copy", // копирование ссылки вручную
  "config_qr", // показ QR-кода
]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { event?: string; path?: string };
    if (body.event && ALLOWED.has(body.event)) {
      await track(req.headers, body.event, body.path ?? "");
    }
  } catch {
    // молча — трекинг не должен генерировать ошибок
  }
  return new Response(null, { status: 204 });
}
