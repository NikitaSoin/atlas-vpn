import { NextResponse } from "next/server";
import { routingProfile } from "@/lib/incy";

/**
 * Профиль маршрутизации для приложений. Постоянный адрес: приложение
 * привязывается к нему при импорте подписки и дальше само забирает обновления.
 *
 * Отдаём с коротким кэшем: список правится редко, но когда правится — хочется,
 * чтобы разошёлся за минуты, а не за сутки.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return new NextResponse(JSON.stringify(routingProfile(), null, 1), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
