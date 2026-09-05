import { NextRequest } from "next/server";
import { track } from "@/lib/analytics";

/** Приём page_view с клиента (navigator.sendBeacon). */
const ALLOWED = new Set(["page_view"]);

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
