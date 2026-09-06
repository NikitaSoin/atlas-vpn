import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/db";
import { setSession } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { track } from "@/lib/analytics";

/**
 * Вход по почте и паролю.
 *
 * Сообщение об ошибке одинаково и при неверном пароле, и при отсутствии
 * аккаунта: иначе форма превращается в способ проверять, кто у нас
 * зарегистрирован. По той же причине при отсутствии аккаунта тратим время на
 * фиктивную проверку пароля — иначе ответ приходил бы заметно быстрее.
 */
const DUMMY_HASH =
  "scrypt$00000000000000000000000000000000$" + "0".repeat(128);

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");

  const sub = email.includes("@") ? await getStore().findSubByEmail(email) : null;
  const ok = sub?.passwordHash
    ? await verifyPassword(password, sub.passwordHash)
    : (await verifyPassword(password, DUMMY_HASH), false);

  if (!ok || !sub) {
    await track(req.headers, "login_failed");
    return NextResponse.redirect(absoluteUrl(req, "/start?mode=login&err=bad"), { status: 303 });
  }

  await track(req.headers, "login");
  const res = NextResponse.redirect(absoluteUrl(req, "/account"), { status: 303 });
  setSession(res, sub.token);
  return res;
}
