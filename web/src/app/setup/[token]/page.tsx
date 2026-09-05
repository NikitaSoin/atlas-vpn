import Link from "next/link";
import QRCode from "qrcode";
import { brand } from "@/lib/brand";
import { plans } from "@/lib/plans";
import { buildSubscriptionUrl, getPanel } from "@/lib/panel";
import { getStore } from "@/lib/db";
import { telegramLinkUrl } from "@/lib/telegram";
import { formatDate, subState, timeLeft } from "@/lib/subscription";
import SetupClient from "./setup-client";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const sub = await getStore().findSubByToken(token);
  const panelSub = await getPanel().getSubscription(token);

  // Пока подписочный домен не настроен, копирование и QR отдают прямой
  // vless:// линк — он работает в любом клиенте уже сейчас.
  const url = panelSub?.url ?? buildSubscriptionUrl(token);
  const importLink = panelSub?.rawLink ?? url;
  const qrSvg = await QRCode.toString(importLink, {
    type: "svg",
    margin: 0,
    width: 160,
  });

  // Состояние подписки: триал / активна / грейс-период (сутки) / закончилась.
  const state = sub ? subState(sub) : "unknown";
  const left = sub ? timeLeft(sub) : null;
  const renewPlanId = sub && !sub.isTrial ? sub.planId : (plans.find((p) => p.popular) ?? plans[0]).id;
  const renewHref = sub
    ? `/checkout?plan=${renewPlanId}&email=${encodeURIComponent(sub.email)}`
    : "/#tarify";
  const tgLink = sub && !sub.telegramChatId ? telegramLinkUrl(sub.token) : null;

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      {state === "grace" && (
        <div className="mb-6 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
          <p className="font-medium text-amber-700">
            Подписка закончилась — доступ отключится в ближайшие часы
          </p>
          <p className="mt-1 text-muted">
            Продлите сейчас, и ничего перенастраивать не придётся.
          </p>
          <Link
            href={renewHref}
            className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 font-medium text-white transition hover:brightness-110"
          >
            Продлить
          </Link>
        </div>
      )}
      {state === "expired" && (
        <div className="mb-6 rounded-2xl border border-bad/40 bg-bad/10 p-4 text-sm">
          <p className="font-medium text-bad">Подписка закончилась</p>
          <p className="mt-1 text-muted">
            После оплаты доступ включится сам — ссылка и настройки прежние.
          </p>
          <Link
            href={renewHref}
            className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 font-medium text-white transition hover:brightness-110"
          >
            Возобновить
          </Link>
        </div>
      )}
      {state !== "expired" && state !== "grace" && (
        <span className="inline-flex items-center gap-2 rounded-full border border-good/40 bg-good/10 px-3 py-1 text-xs text-good">
          <span className="h-1.5 w-1.5 rounded-full bg-good" />
          {state === "trial" && left
            ? `Пробный доступ · осталось ${left.days > 1 ? `${left.days} дн.` : `${left.hours} ч.`}`
            : "Доступ активен"}
        </span>
      )}

      <h1 className="mt-5 text-3xl font-semibold tracking-tight">
        Осталось два шага
      </h1>
      <p className="mt-2 text-muted">
        Установите приложение и добавьте в него подписку — вручную ничего
        настраивать не нужно. Дальше внутри приложения включите переключатель.
      </p>
      {sub && (state === "active" || state === "trial") && (
        <p className="mt-2 text-sm text-muted">
          {state === "trial" ? "Пробный доступ" : "Доступ"} действует до{" "}
          {formatDate(sub.expiresAt)}
          {sub.autoRenew ? " · автопродление включено" : ""}. Сохраните эту
          страницу — она же доступна из{" "}
          <Link href="/account" className="text-accent-ink hover:underline">
            кабинета
          </Link>
          .
        </p>
      )}

      <div className="mt-8">
        <SetupClient subscriptionUrl={url} importLink={importLink} qrSvg={qrSvg} />
      </div>

      {tgLink && (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
          <h3 className="font-medium">Напомнить, когда доступ будет заканчиваться?</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted">
            Подключите уведомления в Telegram — напишем за сутки до конца,
            чтобы VPN не выключился неожиданно.
          </p>
          <a
            href={tgLink}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-xl border border-line px-4 py-2 text-sm transition hover:border-accent"
          >
            Уведомления в Telegram
          </a>
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-medium">Что-то не получается?</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Напишите нам — поможем подключиться и ответим на вопросы.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/support"
            className="rounded-xl border border-line px-4 py-2 text-sm transition hover:border-accent"
          >
            Написать в поддержку
          </Link>
          <a
            href={brand.supportTelegram}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-line px-4 py-2 text-sm transition hover:border-accent"
          >
            Telegram
          </a>
        </div>
      </div>
    </main>
  );
}
