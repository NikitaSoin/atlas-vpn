"use client";

import Link from "next/link";
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

const stepCard = "rounded-2xl border border-line bg-ink p-5";
const stepNum =
  "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-accent-soft text-sm font-semibold text-accent-ink";

/**
 * Подключение устройства: два шага подряд, без промежуточных подтверждений.
 * Ручной импорт (ссылка и QR) убран под раскрывающийся блок — он нужен
 * меньшинству, но должен быть под рукой, если кнопка импорта не сработала.
 */
export default function SetupClient({
  importLink,
  qrSvg,
}: {
  /**
   * Единственный адрес подписки, который отдаём приложению — наш `/sub/{token}`.
   * Адрес самой панели сюда попадать НЕ должен: он ведёт на ретранслятор
   * Cloudflare, у российских провайдеров не скачивается, и приложение получает
   * подписку без единого сервера (проверено 07.09.2026).
   * null — доступ ещё готовится: показываем шаг установки, импорт появится сам.
   */
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
  const client = clients[0];
  const preparing = !importLink;

  return (
    <section className="rounded-2xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold tracking-tight">Подключить устройство</h2>
        <span className="text-sm text-muted">Через приложение {client.name}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Установите приложение и добавьте подписку. Если {client.name} уже есть,
        сразу переходите ко второму шагу.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {platformOrder.map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            aria-pressed={p === platform}
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

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className={stepCard}>
          <div className="flex gap-3">
            <span className={stepNum}>1</span>
            <div>
              <h3 className="font-medium">Установите {client.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{client.note}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {clients.map((c) => (
                  <a
                    key={c.id}
                    href={c.installUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackClient("client_install_click", platform)}
                    className="rounded-xl border border-line bg-surface px-4 py-2 text-sm transition hover:border-accent"
                  >
                    {clients.length > 1 ? `${c.name} · ` : ""}
                    {c.installLabel}
                  </a>
                ))}
              </div>
              {client.altInstallUrl && (
                <a
                  href={client.altInstallUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-accent-ink hover:underline"
                >
                  {client.altInstallLabel} ↗
                </a>
              )}
            </div>
          </div>
        </div>

        <div className={stepCard}>
          <div className="flex gap-3">
            <span className={stepNum}>2</span>
            <div>
              <h3 className="font-medium">Добавьте подписку</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Настройки перенесутся автоматически. Затем включите VPN внутри{" "}
                {client.name}.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                В списке появятся два сервера — <b className="font-medium text-fg">NL-1</b> и{" "}
                <b className="font-medium text-fg">NL-2</b>. Это один и тот же доступ по
                разным каналам. Начните с NL-1; если интернет не идёт, выберите NL-2.
              </p>
              <div className="mt-4">
                {client.deepLink && importLink ? (
                  <a
                    href={client.deepLink(importLink)}
                    onClick={() => trackClient("config_import_click", platform)}
                    className="inline-block rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
                  >
                    Добавить подписку
                  </a>
                ) : (
                  <span className="inline-block cursor-not-allowed rounded-xl border border-dashed border-line px-4 py-2 text-sm text-muted">
                    {preparing ? "Готовим ссылку…" : "Импорт вручную — ниже"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {preparing ? (
        <div className="mt-5 rounded-2xl border border-amber-500/50 bg-amber-500/10 p-5 text-sm">
          <b className="font-medium text-amber-700">Готовим ваш доступ</b>
          <p className="mt-1 leading-relaxed text-muted">
            Пока можно установить {client.name}. Ссылка появится здесь
            автоматически; если ожидание затянулось, напишите в поддержку.
          </p>
          <Link
            href="/support"
            className="mt-3 inline-block rounded-xl border border-line bg-surface px-4 py-2 text-sm transition hover:border-accent"
          >
            Нужна помощь
          </Link>
        </div>
      ) : (
        <details className="mt-5 rounded-2xl border border-line bg-ink p-5">
          <summary className="cursor-pointer text-sm font-medium">
            Другой способ: ссылка или QR-код
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Добавляйте полную подписку, а не отдельный сервер — так приложение
            сможет получать обновления и резервные входы.
          </p>
          <div className="mt-4 flex gap-2">
            <code className="flex-1 truncate rounded-xl border border-line bg-surface px-4 py-2.5 text-sm text-muted">
              {importLink}
            </code>
            <button
              onClick={copy}
              className="shrink-0 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm transition hover:border-accent"
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
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Это личная ссылка — не передавайте её другим людям.
          </p>
        </details>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line/70 pt-4 text-sm text-muted">
        <span>Статус VPN смотрите в приложении {client.name}.</span>
        <Link href="/support" className="text-accent-ink hover:underline">
          Не получается?
        </Link>
      </div>
    </section>
  );
}
