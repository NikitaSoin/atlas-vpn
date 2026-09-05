import QRCode from "qrcode";
import { buildSubscriptionUrl, getPanel } from "@/lib/panel";
import SetupClient from "./[token]/setup-client";

/**
 * Блок «настроить устройство» — общий для кабинета и страницы по личной
 * ссылке: выбор платформы, установка клиента, импорт одним тапом, QR.
 */
export default async function SetupSection({ token }: { token: string }) {
  const panelSub = await getPanel().getSubscription(token);
  // Пока подписочный домен не настроен, копирование и QR отдают прямой
  // vless:// линк — он работает в любом клиенте уже сейчас.
  const url = panelSub?.url ?? buildSubscriptionUrl(token);
  const importLink = panelSub?.rawLink ?? url;
  const qrSvg = await QRCode.toString(importLink, { type: "svg", margin: 0, width: 160 });
  return <SetupClient subscriptionUrl={url} importLink={importLink} qrSvg={qrSvg} />;
}
