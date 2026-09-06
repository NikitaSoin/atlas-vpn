"use client";

/**
 * Отправка события воронки с клиента. sendBeacon не задерживает переход по
 * ссылке и не роняет страницу, если запрос не ушёл.
 */
export function trackClient(event: string, path = ""): void {
  try {
    navigator.sendBeacon(
      "/api/track",
      new Blob([JSON.stringify({ event, path })], { type: "application/json" }),
    );
  } catch {
    // не мешаем странице
  }
}
