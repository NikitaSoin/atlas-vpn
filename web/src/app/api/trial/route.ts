import { NextRequest, NextResponse } from "next/server";
import { absoluteUrl } from "@/lib/site";
import { currentSub } from "@/lib/session";
import { startTrial } from "@/lib/subscription";
import { notify } from "@/lib/notify";
import { track } from "@/lib/analytics";

/** Кнопка «Попробовать бесплатно» в кабинете: включает пробный период. */
export async function POST(req: NextRequest) {
  const sub = await currentSub();
  if (!sub) return NextResponse.redirect(absoluteUrl(req, "/start"), { status: 303 });
  const started = await startTrial(sub);
  if (!started) {
    await track(req.headers, "trial_repeat");
    return NextResponse.redirect(absoluteUrl(req, "/account?err=trial"), { status: 303 });
  }
  await track(req.headers, "trial_started");
  notify(started, "trial").catch(() => {});
  return NextResponse.redirect(absoluteUrl(req, "/account?new=1"), { status: 303 });
}
