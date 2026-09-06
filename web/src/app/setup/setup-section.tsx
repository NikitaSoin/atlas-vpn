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
  // Отдаём ССЫЛКУ-ПОДПИСКУ, а не один сервер: в подписке лежат все входы
  // сразу (прямой и через Cloudflare), приложение выберет рабочий и само
  // подхватит новые, когда мы их добавим. Одиночный vless:// — запасной
  // вариант на случай, если подписка почему-то не сохранилась.
  const importLink = sub.panelUrl ?? sub.panelLink;
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
