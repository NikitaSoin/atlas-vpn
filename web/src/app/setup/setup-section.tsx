import QRCode from "qrcode";
import { buildSubscriptionUrl, getPanel } from "@/lib/panel";
import { provisionPanel } from "@/lib/subscription";
import type { SubRecord } from "@/lib/db";
import SetupClient from "./[token]/setup-client";

/**
 * Блок «настроить устройство» — общий для кабинета и страницы по личной
 * ссылке: выбор платформы, установка клиента, импорт одним тапом, QR.
 * Инструкция по установке показывается всегда; если доступ в панели ещё не
 * заведён — пробуем завести сейчас, а ссылку для импорта отдаём, когда будет
 * (страница обновляется сама).
 */
export default async function SetupSection({ sub }: { sub: SubRecord }) {
  const ready = sub.panelToken ? sub : await provisionPanel(sub);
  if (!ready.panelToken) {
    return (
      <>
        <meta httpEquiv="refresh" content="30" />
        <SetupClient subscriptionUrl={null} importLink={null} qrSvg={null} />
      </>
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
