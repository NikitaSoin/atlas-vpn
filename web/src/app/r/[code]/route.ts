import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { setRefCookie } from "@/lib/session";
import { absoluteUrl } from "@/lib/site";
import { track } from "@/lib/analytics";

/**
 * Реферальная ссылка `/r/<код>`: запоминаем код в cookie и ведём на главную.
 *
 * Код проверяем по базе: чужой или выдуманный код cookie не получает, и
 * при регистрации искать по нему некого. Сам код нигде на экране не
 * повторяем — человек просто попадает на сайт, а связь с пригласившим
 * восстановится при создании аккаунта или при оплате без аккаунта.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const clean = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 16);
  const res = NextResponse.redirect(absoluteUrl(req, "/"), { status: 303 });
  const inviter = clean ? await getStore().findSubByRefCode(clean) : null;
  if (inviter?.refCode) {
    setRefCookie(res, inviter.refCode);
    await track(req.headers, "ref_visit");
  }
  return res;
}
