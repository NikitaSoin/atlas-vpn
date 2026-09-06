"use client";

import { useState } from "react";
import { trackClient } from "@/lib/track-client";
import {
  clientsByPlatform,
  platformLabels,
  platformOrder,
  type Platform,
} from "@/lib/clients";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "ios";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
  if (/Linux|X11/i.test(ua)) return "linux";
  return "windows";
}

export default function SetupClient({
  subscriptionUrl,
  importLink,
  qrSvg,
}: {
  /** null — доступ в панели ещё готовится: показываем шаг установки, импорт — позже. */
  subscriptionUrl: string | null;
  /** Что копируем и кодируем в QR: vless:// пока нет домена, потом — подписка. */
  importLink: string | null;
  qrSvg: string | null;
}) {
  // Платформу определяем при первом рендере на клиенте: вызов в эффекте
  // приводил к лишнему каскадному рендеру.
  const [platform, setPlatform] = useState<Platform>(() =>
    typeof navigator === "undefined" ? "ios" : detectPlatform(),
  );
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  async function copy() {
    if (!importLink) return;
    trackClient("config_copy", platform);
    await navigator.clipboard.writeText(importLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const clients = clientsByPlatform[platform];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {platformOrder.map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`rounded-xl border px-4 py-2 text-sm transition ${
              p === platform
                ? "border-accent bg-accent-soft text-fg"
                : "border-line text-muted hover:text-fg"
            }`}
          >
            {platformLabels[p]}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {clients.map((client) => (
          <div
            key={client.id}
            className={`rounded-2xl border p-5 ${
              client.recommended
                ? "border-accent/60 bg-surface"
                : "border-line bg-surface"
            }`}
          >
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{client.name}</h3>
              {client.recommended && (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-ink">
                  рекомендуем
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted">{client.note}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={client.installUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackClient("client_install_click", platform)}
                className="rounded-xl border border-line px-4 py-2 text-sm transition hover:border-accent"
              >
                1. {client.installLabel}
              </a>
              {client.altInstallUrl && (
                <a
                  href={client.altInstallUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-line px-4 py-2 text-sm text-muted transition hover:border-accent hover:text-fg"
                >
                  {client.altInstallLabel}
                </a>
              )}
              {client.deepLink && subscriptionUrl && (
                <a
                  href={client.deepLink(subscriptionUrl)}
                  onClick={() => trackClient("config_import_click", platform)}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                >
                  2. Добавить подписку
                </a>
              )}
              {client.deepLink && !subscriptionUrl && (
                <span className="rounded-xl border border-dashed border-line px-4 py-2 text-sm text-muted">
                  2. Ссылка для импорта появится через минуту
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {!importLink && (
        <div className="mt-8 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-5 text-sm">
          <p className="font-medium text-amber-700">Готовим ваш доступ</p>
          <p className="mt-1 text-muted">
            Пока ставьте приложение — шаг 1 выше. Ссылка для импорта появится
            здесь сама, обычно меньше чем через минуту. Если её нет дольше
            нескольких минут — напишите в поддержку.
          </p>
        </div>
      )}

      {importLink && (
      <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-medium">Если кнопка не сработала</h3>
        <p className="mt-1.5 text-sm text-muted">
          Скопируйте ссылку и вставьте её в приложении — пункт «Добавить
          подписку» или «Add subscription». Именно подписку, а не отдельный
          сервер: в ней несколько точек входа, приложение выберет рабочую и
          обновит их само, если мы что-то поменяем.
        </p>
        <div className="mt-4 flex gap-2">
          <code className="flex-1 truncate rounded-xl border border-line bg-ink px-4 py-2.5 text-sm text-muted">
            {importLink}
          </code>
          <button
            onClick={copy}
            className="shrink-0 rounded-xl border border-line px-4 py-2.5 text-sm transition hover:border-accent"
          >
            {copied ? "Скопировано" : "Копировать"}
          </button>
        </div>
        <button
          onClick={() => {
            if (!showQr) trackClient("config_qr", platform);
            setShowQr((v) => !v);
          }}
          className="mt-3 text-sm text-accent-ink hover:underline"
        >
          {showQr ? "Скрыть QR-код" : "Показать QR-код для другого устройства"}
        </button>
        {showQr && qrSvg && (
          <div
            className="mt-4 w-44 rounded-xl bg-white p-3"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        )}
      </div>
      )}
    </div>
  );
}
