import QRCode from "qrcode";
import { brand } from "@/lib/brand";
import { getPanel } from "@/lib/panel";
import SetupClient from "./setup-client";

export default async function SetupPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const subscription = await getPanel().getSubscription(token);

  // Мок-панель хранит подписки в памяти, поэтому после перезапуска сервера
  // ссылка «протухает». На боевой панели такого не будет.
  const url = subscription?.url ?? `https://sub.example.com/sub/${token}`;
  const qrSvg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    width: 160,
  });

  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <span className="inline-flex items-center gap-2 rounded-full border border-good/40 bg-good/10 px-3 py-1 text-xs text-good">
        <span className="h-1.5 w-1.5 rounded-full bg-good" />
        Доступ активен
      </span>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight">
        Осталось два шага
      </h1>
      <p className="mt-2 text-muted">
        Установите приложение и нажмите «Добавить подписку» — настройки
        подставятся сами. Дальше внутри приложения включите переключатель.
      </p>
      {subscription && (
        <p className="mt-2 text-sm text-muted">
          Доступ действует до{" "}
          {subscription.expiresAt.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          .
        </p>
      )}

      <div className="mt-8">
        <SetupClient subscriptionUrl={url} qrSvg={qrSvg} />
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-medium">Приложения нет в вашем App Store?</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">
          Переключите регион Apple Account на Турцию — бесплатно, карта не
          нужна, покупки и данные сохранятся. Настройки → ваше имя → Медиа-
          материалы и покупки → Просмотреть → Страна или регион. После этого
          приложение появится в поиске.
        </p>
        <a
          href={brand.supportTelegram}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-xl border border-line px-4 py-2 text-sm transition hover:border-accent"
        >
          Не получается — напишите нам
        </a>
      </div>
    </main>
  );
}
