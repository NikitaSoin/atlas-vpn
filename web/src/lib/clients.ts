import { brand } from "./brand";

export type Platform = "ios" | "android" | "windows" | "macos" | "linux";

export type VpnClient = {
  id: string;
  name: string;
  /** Короткое пояснение под названием. */
  note: string;
  /** Ссылка на установку. */
  installUrl: string;
  /** Подпись к кнопке установки. */
  installLabel: string;
  /** Второй способ установки, если основной подходит не всем. */
  altInstallUrl?: string;
  altInstallLabel?: string;
  /**
   * Собирает deep-link, импортирующий подписку одним тапом.
   *
   * Схема INCY взята из официальной документации docs.incy.cc/deep-links
   * (проверено 06.09.2026): `incy://import/{url}` — автоопределение типа
   * данных, URL передаётся как есть, без percent-кодирования.
   * На живых устройствах ещё не проверена — запасной путь всегда рядом:
   * кнопка «Копировать ссылку» и QR-код.
   */
  deepLink?: (subscriptionUrl: string) => string;
  recommended?: boolean;
};

/**
 * Каталог клиентов. Продуктовое решение 06.09.2026: только INCY, запасные
 * клиенты убраны. INCY закрывает все платформы, ссылки — из официального
 * репозитория INCY-DEV/incy-platforms и сторов.
 *
 * Пересматривать перед каждым релизом: доступность VPN-приложений в App Store
 * и Google Play в РФ нестабильна. Если INCY пропадёт из стора, здесь
 * понадобится запасной клиент — ручной импорт ссылкой и QR работает в любом.
 */
const RELEASES = "https://github.com/INCY-DEV/incy-platforms/releases/latest/download";
const importLink = (url: string) => `incy://import/${url}`;

const desktopNote =
  "Десктопная версия у разработчика помечена как ранняя — пользоваться можно, но возможны шероховатости.";

export const clientsByPlatform: Record<Platform, VpnClient[]> = {
  ios: [
    {
      id: "incy-ios",
      name: "INCY",
      note: "Бесплатное, есть в российском App Store — регион менять не нужно. Работает и на iPad, и на Apple TV.",
      installUrl: "https://apps.apple.com/ru/app/incy/id6756943388",
      installLabel: "Установить из App Store",
      deepLink: importLink,
      recommended: true,
    },
  ],
  android: [
    {
      id: "incy-android",
      name: "INCY",
      note: "Бесплатное, ставится из Google Play. Если Play недоступен — рядом кнопка с APK-файлом.",
      installUrl: "https://play.google.com/store/apps/details?id=llc.itdev.incy",
      installLabel: "Установить из Google Play",
      altInstallUrl: `${RELEASES}/Incy.apk`,
      altInstallLabel: "Скачать APK",
      deepLink: importLink,
      recommended: true,
    },
  ],
  macos: [
    {
      id: "incy-macos",
      name: "INCY",
      note: "Бесплатное. Из App Store — для Mac на чипе Apple (M1 и новее). Для Mac на Intel рядом отдельная кнопка.",
      installUrl: "https://apps.apple.com/ru/app/incy/id6756943388",
      installLabel: "Установить из App Store",
      altInstallUrl: `${RELEASES}/incy-macos-intel.dmg`,
      altInstallLabel: "Скачать для Mac на Intel",
      deepLink: importLink,
      recommended: true,
    },
  ],
  windows: [
    {
      id: "incy-windows",
      name: "INCY",
      note: `Бесплатное, ставится обычным установщиком. ${desktopNote}`,
      installUrl: `${RELEASES}/incy-windows-setup.exe`,
      installLabel: "Скачать установщик",
      altInstallUrl: `${RELEASES}/incy-windows-portable.zip`,
      altInstallLabel: "Версия без установки (ZIP)",
      deepLink: importLink,
      recommended: true,
    },
  ],
  linux: [
    {
      id: "incy-linux",
      name: "INCY",
      note: `Бесплатное. DEB — для Ubuntu, Debian и Mint. ${desktopNote}`,
      installUrl: `${RELEASES}/incy-linux-x64.deb`,
      installLabel: "Скачать DEB",
      altInstallUrl: `${RELEASES}/incy-linux-x64.rpm`,
      altInstallLabel: "Скачать RPM (Fedora, openSUSE)",
      deepLink: importLink,
      recommended: true,
    },
  ],
};

export const platformLabels: Record<Platform, string> = {
  ios: "iPhone / iPad",
  android: "Android",
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
};

export const platformOrder: Platform[] = ["ios", "android", "windows", "macos", "linux"];

export const clientName = brand.nameLatin;
