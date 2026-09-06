import { NextRequest, NextResponse } from "next/server";
import { getPanel } from "@/lib/panel";
import { siteUrl } from "@/lib/site";
import { brand } from "@/lib/brand";

/**
 * Подписка на нашем домене.
 *
 * Раньше клиенту отдавалась ссылка прямо на панель через ретранслятор
 * Cloudflare (`*.workers.dev`). У российских провайдеров этот поддомен
 * фильтруется: подписка просто не скачивается, и приложение не может её
 * добавить (проверено 07.09.2026 — 0 байт за 20 с с сети владельца, при том
 * что наш сайт открывается за 0.5 с).
 *
 * Поэтому подписку отдаём со своего адреса: сервер сходит в панель сам —
 * ему ретранслятор доступен — и вернёт содержимое клиенту.
 *
 * User-Agent клиента передаём как есть: панель по нему решает, в каком
 * формате отдавать конфигурацию (обычный список, Clash, Sing-box).
 */
export const dynamic = "force-dynamic";

/** Заголовки панели, которые нужны приложению: имя профиля, срок, интервал. */
const PASS_THROUGH = [
  "content-type",
  "profile-title",
  "profile-update-interval",
  "subscription-userinfo",
  "announce",
];

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(token)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const base = getPanel().publicBase?.();
  if (!base) return new NextResponse("Subscription unavailable", { status: 503 });

  try {
    const upstream = await fetch(`${base}/api/sub/${token}`, {
      headers: {
        "User-Agent": req.headers.get("user-agent") ?? "v2rayNG/1.9.5",
        Accept: req.headers.get("accept") ?? "*/*",
        "X-Forwarded-Proto": "https",
        "X-Forwarded-For": "127.0.0.1",
      },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!upstream.ok) {
      return new NextResponse("Subscription not found", { status: upstream.status });
    }
    const body = await upstream.text();
    const headers = new Headers();
    for (const h of PASS_THROUGH) {
      const v = upstream.headers.get(h);
      if (v) headers.set(h, v);
    }
    if (!headers.has("content-type")) headers.set("content-type", "text/plain; charset=utf-8");
    // Панель подставляет сюда свой прямой адрес, недоступный из России, и
    // приложение может на нём споткнуться. Показываем свой кабинет.
    headers.set("profile-web-page-url", `${siteUrl()}/account`);
    headers.set("support-url", brand.supportTelegram);
    headers.set("profile-title", `base64:${Buffer.from(brand.name, "utf8").toString("base64")}`);
    headers.set("cache-control", "no-store");
    return new NextResponse(body, { status: 200, headers });
  } catch (e) {
    console.error("[подписка]", (e as Error).message);
    return new NextResponse("Subscription temporarily unavailable", { status: 503 });
  }
}
