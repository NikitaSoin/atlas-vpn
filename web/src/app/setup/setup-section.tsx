import QRCode from "qrcode";
import type { SubRecord } from "@/lib/db";
import { siteUrl } from "@/lib/site";
import SetupClient from "./[token]/setup-client";

/**
 * Блок «подключить устройство»: какое приложение поставить, кнопка импорта
 * одним тапом, ссылка для ручной вставки, QR.
 *
 * В панель здесь не ходим вообще — ни одного сетевого запроса на отрисовку.
 * Ссылки кладутся в базу в момент выдачи доступа (`provisionPanel`), а если
 * панель тогда не ответила, доступ доводит планировщик, и страница подхватит
 * его сама по авто-обновлению. Инструкция по установке видна всегда.
 */
export default async function SetupSection({ sub }: { sub: SubRecord }) {
  // Отдаём ССЫЛКУ-ПОДПИСКУ, а не один сервер: в ней лежат все точки входа,
  // приложение подхватит новые само, когда мы их добавим.
  //
  // Ссылка ведёт на НАШ адрес, а не на панель: адрес ретранслятора Cloudflare
  // у российских провайдеров фильтруется, и подписка просто не скачивается
  // (07.09.2026: 0 байт за 20 с, при том что наш сайт открывается за 0.5 с).
  // Маршрут /sub/[token] сам сходит в панель и вернёт содержимое.
  const importLink = sub.panelToken
    ? `${siteUrl()}/sub/${sub.panelToken}`
    : (sub.panelUrl ?? sub.panelLink);
  const qrSvg = importLink
    ? await QRCode.toString(importLink, { type: "svg", margin: 0, width: 160 })
    : null;
  return (
    <>
      {!importLink && <meta httpEquiv="refresh" content="20" />}
      <SetupClient subscriptionUrl={sub.panelUrl} importLink={importLink} qrSvg={qrSvg} />
    </>
  );
}
