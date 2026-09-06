import QRCode from "qrcode";
import type { SubRecord } from "@/lib/db";
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
  const importLink = sub.panelLink ?? sub.panelUrl;
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
