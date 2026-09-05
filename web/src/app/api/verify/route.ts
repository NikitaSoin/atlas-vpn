import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/db";
import { setSession } from "@/lib/session";
import { startTrial } from "@/lib/subscription";
import { notify } from "@/lib/notify";
import { track } from "@/lib/analytics";

/** Проверка кода: верный → аккаунт (новый — с пробным доступом) и кабинет. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const code = String(form.get("code") ?? "").replace(/\D/g, "");
  const back = `/start/verify?email=${encodeURIComponent(email)}`;

  if (!email.includes("@") || code.length !== 6) {
    return NextResponse.redirect(new URL(`${back}&err=code`, req.url), { status: 303 });
  }
  const store = getStore();
  if (!(await store.consumeEmailCode(email, code))) {
    await track(req.headers, "code_wrong");
    return NextResponse.redirect(new URL(`${back}&err=code`, req.url), { status: 303 });
  }

  let sub = await store.findSubByEmail(email);
  let isNew = false;
  if (!sub) {
    sub = await startTrial(email);
    isNew = true;
    await track(req.headers, "trial_started");
    notify(sub, "trial").catch(() => {});
  } else {
    await track(req.headers, "login");
  }

  const res = NextResponse.redirect(new URL(isNew ? "/account?new=1" : "/account", req.url), {
    status: 303,
  });
  setSession(res, sub.token);
  return res;
}
