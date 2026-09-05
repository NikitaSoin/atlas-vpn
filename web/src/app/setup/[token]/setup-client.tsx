"use client";

import { useEffect, useState } from "react";
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
  return "windows";
}

export default function SetupClient({
  subscriptionUrl,
  importLink,
  qrSvg,
}: {
  subscriptionUrl: string;
  /** Что копируем и кодируем в QR: vless:// пока нет домена, потом — подписка. */
  importLink: string;
  qrSvg: string;
}) {
  const [platform, setPlatform] = useState<Platform>("ios");
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => setPlatform(detectPlatform()), []);

  async function copy() {
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
                className="rounded-xl border border-line px-4 py-2 text-sm transition hover:border-accent"
              >
                1. {client.installLabel}
              </a>
              {client.deepLink && (
                <a
                  href={client.deepLink(subscriptionUrl)}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                >
                  2. Добавить подписку
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-surface p-5">
        <h3 className="font-medium">Если кнопка не сработала</h3>
        <p className="mt-1.5 text-sm text-muted">
          Скопируйте ссылку и вставьте её в приложении — пункт «Добавить
          подписку» или «Add subscription». Работает в любом клиенте.
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
          onClick={() => setShowQr((v) => !v)}
          className="mt-3 text-sm text-accent-ink hover:underline"
        >
          {showQr ? "Скрыть QR-код" : "Показать QR-код для другого устройства"}
        </button>
        {showQr && (
          <div
            className="mt-4 w-44 rounded-xl bg-white p-3"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        )}
      </div>
    </div>
  );
}
