import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { getStore } from "@/lib/db";
import { setSession } from "@/lib/session";
import { createAccount } from "@/lib/subscription";
import { track } from "@/lib/analytics";

/** Проверка кода: верный → аккаунт (новый — с пробным доступом) и кабинет. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const back = `/start/verify?email=${encodeURIComponent(email)}`;

  if (!email.includes("@") || code.length !== 6) {
    return NextResponse.redirect(absoluteUrl(req, `${back}&err=code`), { status: 303 });
  }
  const store = getStore();
  if (!(await store.consumeEmailCode(email, code))) {
    await track(req.headers, "code_wrong");
    return NextResponse.redirect(absoluteUrl(req, `${back}&err=code`), { status: 303 });
  }

  let sub = await store.findSubByEmail(email);
  let isNew = false;
  if (!sub) {
    sub = await createAccount(email);
    isNew = true;
    await track(req.headers, "account_created");
  } else {
    await track(req.headers, "login");
  }

  const res = NextResponse.redirect(absoluteUrl(req, isNew ? "/account?new=1" : "/account"), {
    status: 303,
  });
  setSession(res, sub.token);
  return res;
}
