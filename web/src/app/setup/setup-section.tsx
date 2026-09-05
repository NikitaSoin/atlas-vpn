import QRCode from "qrcode";
import { buildSubscriptionUrl, getPanel } from "@/lib/panel";
import { provisionPanel } from "@/lib/subscription";
import type { SubRecord } from "@/lib/db";
import SetupClient from "./[token]/setup-client";

/**
 * Блок «настроить устройство» — общий для кабинета и страницы по личной
 * ссылке: выбор платформы, установка клиента, импорт одним тапом, QR.
 * Если доступ в панели ещё не заведён — пробуем завести прямо сейчас,
 * иначе показываем «готовим», страница обновится сама.
 */
export default async function SetupSection({ sub }: { sub: SubRecord }) {
  const ready = sub.panelToken ? sub : await provisionPanel(sub);
  if (!ready.panelToken) {
    return (
      <div className="rounded-2xl border border-amber-500/50 bg-amber-500/10 p-5 text-sm">
        <p className="font-medium text-amber-700">Готовим ваш доступ</p>
        <p className="mt-1 text-muted">
          Обычно это занимает меньше минуты. Страница обновится сама; если
          ничего не изменится за несколько минут — напишите в поддержку.
        </p>
        <meta httpEquiv="refresh" content="30" />
      </div>
    );
  }
  const panelSub = await getPanel().getSubscription(ready.panelToken);
  // Пока подписочный домен не настроен, копирование и QR отдают прямой
  // vless:// линк — он работает в любом клиенте уже сейчас.
  const url = panelSub?.url ?? buildSubscriptionUrl(ready.panelToken);
  const importLink = panelSub?.rawLink ?? url;
  const qrSvg = await QRCode.toString(importLink, { type: "svg", margin: 0, width: 160 });
  return <SetupClient subscriptionUrl={url} importLink={importLink} qrSvg={qrSvg} />;
}
